"""The background worker (spec sections 28-29). Runs as an independent
process from the FastAPI app — a browser closing has no effect on it. Each
tick:
  1. backfills next_run_at for any active schedule missing it (new/just
     activated tasks),
  2. claims due tasks via the claim_due_tasks() Postgres function (the
     FOR UPDATE SKIP LOCKED queue-claim primitive, so multiple worker
     processes never double-run the same tick), and executes them,
  3. sweeps for approvals that were decided but never actually resumed
     (the Next.js API's call to /agent/resume failing transiently) so a
     decision is never silently lost.
"""

import logging
import time
from datetime import datetime, timezone

from croniter import croniter
from supabase import Client

from app.config import Settings, get_settings
from app.database.client import get_supabase
from app.executor.execution_engine import ExecutionEngine
from app.models.enums import ExecutionStatus
from app.tools.registry import ToolRegistry, get_default_registry

logger = logging.getLogger("taskforge.worker")


def backfill_next_run_times(db: Client) -> None:
    tasks = (
        db.table("tasks")
        .select("id")
        .eq("status", "active")
        .eq("trigger_type", "schedule")
        .is_("next_run_at", "null")
        .execute()
        .data
        or []
    )
    for task in tasks:
        _advance_schedule(db, task["id"])


def _advance_schedule(db: Client, task_id: str) -> None:
    triggers = (
        db.table("task_triggers")
        .select("schedule_expression")
        .eq("task_id", task_id)
        .eq("is_active", True)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not triggers or not triggers[0].get("schedule_expression"):
        return
    try:
        next_time = croniter(triggers[0]["schedule_expression"], datetime.now(timezone.utc)).get_next(datetime)
    except (ValueError, KeyError):
        logger.warning("invalid cron expression for task %s: %r", task_id, triggers[0]["schedule_expression"])
        return
    db.table("tasks").update({"next_run_at": next_time.isoformat()}).eq("id", task_id).execute()
    db.table("schedules").update({"next_trigger_at": next_time.isoformat(), "last_triggered_at": datetime.now(timezone.utc).isoformat()}).eq("task_id", task_id).execute()


def claim_and_run_due_tasks(db: Client, engine: ExecutionEngine, limit: int) -> int:
    claimed = db.rpc("claim_due_tasks", {"p_limit": limit}).execute().data or []
    for row in claimed:
        logger.info("running scheduled execution %s for task %s", row["execution_id"], row["task_id"])
        try:
            engine.run(row["execution_id"])
        except Exception:
            logger.exception("scheduled execution %s crashed", row["execution_id"])
        _advance_schedule(db, row["task_id"])
    return len(claimed)


def resume_stalled_approvals(db: Client, engine: ExecutionEngine) -> None:
    decided = (
        db.table("approvals")
        .select("id, execution_id, status")
        .in_("status", ["approved", "rejected"])
        .order("decided_at", desc=True)
        .limit(50)
        .execute()
        .data
        or []
    )
    for approval in decided:
        execution = db.table("task_executions").select("id, status").eq("id", approval["execution_id"]).maybe_single().execute().data
        if execution and execution["status"] == ExecutionStatus.WAITING_APPROVAL.value:
            logger.info("resuming stalled execution %s after approval %s", execution["id"], approval["id"])
            try:
                engine.run(execution["id"])
            except Exception:
                logger.exception("resume of execution %s crashed", execution["id"])


def run_forever(settings: Settings | None = None, registry: ToolRegistry | None = None) -> None:
    settings = settings or get_settings()
    db = get_supabase()
    engine = ExecutionEngine(db, registry or get_default_registry())

    logger.info("worker started (poll interval=%ss, max_concurrent=%s)", settings.worker_poll_interval_seconds, settings.worker_max_concurrent_executions)

    while True:
        try:
            backfill_next_run_times(db)
            claimed = claim_and_run_due_tasks(db, engine, settings.worker_max_concurrent_executions)
            resume_stalled_approvals(db, engine)
            if claimed:
                logger.info("processed %s scheduled execution(s)", claimed)
        except Exception:
            logger.exception("worker tick failed")

        time.sleep(settings.worker_poll_interval_seconds)
