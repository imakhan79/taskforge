"""Failure simulation (spec section 48): a tool that always fails must
exhaust retries with backoff and escalate to a human — never silently
succeed, never hang forever, never fabricate a result."""

import uuid

from app.executor.execution_engine import ExecutionEngine
from app.models.enums import RiskLevel
from app.models.enums import ExecutionStatus
from app.tools.base import FunctionTool, ToolContext
from app.tools.registry import ToolRegistry
from tests.fake_supabase import FakeSupabase


def _always_fails(config: dict, ctx: ToolContext) -> dict:
    raise RuntimeError("simulated upstream 500")


def build_engine_with_flaky_tool(db: FakeSupabase, org_id: str) -> ExecutionEngine:
    registry = ToolRegistry()
    registry.register(FunctionTool("flaky_tool", "Always fails.", RiskLevel.LOW, [], _always_fails))
    return ExecutionEngine(db, registry)


def seed(db: FakeSupabase, org_id: str, task_id: str) -> None:
    db.seed("organizations", [{"id": org_id, "settings": {"max_retries": 2, "approval_risk_threshold": "critical", "max_tool_calls_per_execution": 20, "max_daily_executions": 100}}])
    db.seed("tool_definitions", [{"name": "flaky_tool", "risk_level": "low"}])
    db.seed("tasks", [{"id": task_id, "organization_id": org_id, "name": "Flaky task"}])
    db.seed("task_steps", [
        {"id": "step-1", "task_id": task_id, "step_order": 1, "name": "Do the flaky thing", "tool_name": "flaky_tool", "configuration": {}, "risk_level": "low", "requires_approval": False},
    ])


def test_execution_escalates_after_exhausting_retries():
    db = FakeSupabase()
    org_id, task_id = f"org-{uuid.uuid4()}", f"task-{uuid.uuid4()}"
    seed(db, org_id, task_id)
    engine = build_engine_with_flaky_tool(db, org_id)

    execution = db.table("task_executions").insert(
        {"task_id": task_id, "organization_id": org_id, "idempotency_key": "manual-1", "status": "QUEUED", "trigger_source": "manual"}
    ).execute().data[0]

    result = engine.run(execution["id"])

    assert result["status"] == ExecutionStatus.ESCALATED.value
    assert "simulated upstream 500" in result["error"]

    event_types = [e["event_type"] for e in db.tables["execution_events"]]
    assert event_types.count("tool_failed") == 3  # initial attempt + 2 retries
    assert event_types.count("retry") == 2
    assert "escalated" in event_types

    notifications = db.tables.get("notifications", [])
    assert len(notifications) == 1
    assert notifications[0]["type"] == "task_failed"


def test_policy_violation_fails_fast_without_retrying():
    db = FakeSupabase()
    org_id, task_id = f"org-{uuid.uuid4()}", f"task-{uuid.uuid4()}"
    seed(db, org_id, task_id)
    db.tables["organizations"][0]["settings"]["max_tool_calls_per_execution"] = 0
    engine = build_engine_with_flaky_tool(db, org_id)

    execution = db.table("task_executions").insert(
        {"task_id": task_id, "organization_id": org_id, "idempotency_key": "manual-2", "status": "QUEUED", "trigger_source": "manual"}
    ).execute().data[0]

    result = engine.run(execution["id"])

    assert result["status"] == ExecutionStatus.FAILED.value
    assert "max_tool_calls_per_execution" in result["error"]
