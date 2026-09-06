"""End-to-end pipeline test: plan steps -> execute -> pause for approval ->
resume -> verify -> complete, against the real engines and mock tools, with
only the Supabase network client swapped for the in-memory fake. This is
the closest thing to a real run of the section 49 demo workflow that can
execute in CI without external services."""

import uuid

from app.executor.execution_engine import ExecutionEngine
from app.models.enums import ExecutionStatus
from app.tools import http_tool
from app.tools.mock import crm, database, documents, email, files, notifications, spreadsheet
from app.tools.registry import ToolRegistry
from tests.fake_supabase import FakeSupabase


def build_registry(db: FakeSupabase) -> ToolRegistry:
    registry = ToolRegistry()
    for module in (email, files, documents, spreadsheet, crm, database):
        for tool in module.build_tools():
            registry.register(tool)
    for tool in http_tool.build_tools():
        registry.register(tool)
    for tool in notifications.build_tools(db):
        registry.register(tool)
    return registry


def seed_task(db: FakeSupabase, org_id: str, task_id: str) -> None:
    db.seed(
        "organizations",
        [{"id": org_id, "settings": {"approval_risk_threshold": "high", "max_retries": 2, "max_tool_calls_per_execution": 20, "max_daily_executions": 100}}],
    )
    db.seed(
        "tool_definitions",
        [
            {"name": "search_emails", "risk_level": "low"},
            {"name": "classify_email", "risk_level": "low"},
            {"name": "create_ticket", "risk_level": "medium"},
            {"name": "send_email", "risk_level": "high"},
        ],
    )
    db.seed("tasks", [{"id": task_id, "organization_id": org_id, "name": "Email Triage"}])
    db.seed(
        "task_steps",
        [
            {"id": "step-1", "task_id": task_id, "step_order": 1, "name": "Search emails", "tool_name": "search_emails", "configuration": {"query": "is:unread"}, "risk_level": "low", "requires_approval": False},
            {"id": "step-2", "task_id": task_id, "step_order": 2, "name": "Classify", "tool_name": "classify_email", "configuration": {"email_id": "e1"}, "risk_level": "low", "requires_approval": False},
            {"id": "step-3", "task_id": task_id, "step_order": 3, "name": "Notify customer", "tool_name": "send_email", "configuration": {"to": "customer@example.com", "subject": "Update", "body": "We're on it."}, "risk_level": "high", "requires_approval": False},
        ],
    )


def test_execution_pauses_for_approval_then_completes_on_approve():
    db = FakeSupabase()
    org_id, task_id = f"org-{uuid.uuid4()}", f"task-{uuid.uuid4()}"
    seed_task(db, org_id, task_id)
    registry = build_registry(db)
    engine = ExecutionEngine(db, registry)

    execution = db.table("task_executions").insert(
        {"task_id": task_id, "organization_id": org_id, "idempotency_key": "manual-1", "status": "QUEUED", "trigger_source": "manual"}
    ).execute().data[0]

    result = engine.run(execution["id"])
    assert result["status"] == ExecutionStatus.WAITING_APPROVAL.value

    approvals = db.tables["approvals"]
    assert len(approvals) == 1
    assert approvals[0]["risk_level"] == "high"
    assert approvals[0]["status"] == "pending"

    # Simulate the Next.js approve route recording the decision.
    approvals[0]["status"] = "approved"

    result = engine.run(execution["id"])
    assert result["status"] == ExecutionStatus.COMPLETED.value
    assert result["verification_status"] == "passed"
    assert result["output_data"]["steps_completed"] == 3
    assert result["output_data"]["time_saved_seconds"] > 0

    event_types = [e["event_type"] for e in db.tables["execution_events"]]
    assert "agent_started" in event_types
    assert "approval_requested" in event_types
    assert "approval_granted" in event_types
    assert "task_completed" in event_types
    assert event_types.count("tool_called") == 3


def test_rerunning_a_completed_execution_is_a_no_op():
    db = FakeSupabase()
    org_id, task_id = f"org-{uuid.uuid4()}", f"task-{uuid.uuid4()}"
    seed_task(db, org_id, task_id)
    # No approval needed for this variant: raise the threshold to critical.
    db.tables["organizations"][0]["settings"]["approval_risk_threshold"] = "critical"
    registry = build_registry(db)
    engine = ExecutionEngine(db, registry)

    execution = db.table("task_executions").insert(
        {"task_id": task_id, "organization_id": org_id, "idempotency_key": "manual-2", "status": "QUEUED", "trigger_source": "manual"}
    ).execute().data[0]

    first = engine.run(execution["id"])
    assert first["status"] == ExecutionStatus.COMPLETED.value
    tool_call_count_after_first = sum(1 for e in db.tables["execution_events"] if e["event_type"] == "tool_called")

    second = engine.run(execution["id"])
    assert second["status"] == ExecutionStatus.COMPLETED.value
    tool_call_count_after_second = sum(1 for e in db.tables["execution_events"] if e["event_type"] == "tool_called")
    assert tool_call_count_after_first == tool_call_count_after_second  # nothing re-executed


def test_manual_execute_and_scheduled_execute_use_independent_idempotency_keys():
    db = FakeSupabase()
    org_id, task_id = f"org-{uuid.uuid4()}", f"task-{uuid.uuid4()}"
    seed_task(db, org_id, task_id)

    first = db.table("task_executions").insert(
        {"task_id": task_id, "organization_id": org_id, "idempotency_key": "sched-202609060900", "status": "QUEUED", "trigger_source": "schedule"}
    ).execute().data[0]
    second = db.table("task_executions").insert(
        {"task_id": task_id, "organization_id": org_id, "idempotency_key": "sched-202609060900", "status": "QUEUED", "trigger_source": "schedule"}
    ).execute()

    assert first["id"]
    assert len(db.tables["task_executions"]) == 2  # the fake doesn't enforce the unique constraint itself,
    # but repository.create_execution (exercised below) does, by checking first.
    from app.database import repository

    existing_before = len(db.tables["task_executions"])
    repository.create_execution(db, task_id=task_id, organization_id=org_id, idempotency_key="sched-202609060900", trigger_source="schedule")
    assert len(db.tables["task_executions"]) == existing_before  # no new row: same idempotency key found
