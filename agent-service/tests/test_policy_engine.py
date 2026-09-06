import pytest

from app.policies.policy_engine import PolicyEngine, PolicyViolation
from tests.fake_supabase import FakeSupabase


def test_budget_for_reads_org_settings():
    engine = PolicyEngine(FakeSupabase())
    budget = engine.budget_for({"max_tool_calls_per_execution": 5, "max_retries": 2, "max_execution_duration_seconds": 60})
    assert budget.max_tool_calls == 5
    assert budget.max_retries == 2
    assert budget.max_duration_seconds == 60


def test_budget_for_defaults_when_missing():
    engine = PolicyEngine(FakeSupabase())
    budget = engine.budget_for({})
    assert budget.max_tool_calls == 40
    assert budget.max_retries == 3


def test_execution_budget_raises_when_tool_calls_exceeded():
    engine = PolicyEngine(FakeSupabase())
    budget = engine.budget_for({"max_tool_calls_per_execution": 2})
    budget.record_tool_call()
    budget.record_tool_call()
    with pytest.raises(PolicyViolation):
        budget.record_tool_call()


def test_check_can_start_execution_blocks_over_daily_limit():
    db = FakeSupabase()
    db.seed(
        "task_executions",
        [{"id": "1", "organization_id": "org-1", "created_at": "2999-01-01T00:00:00+00:00"}] * 3,
    )
    engine = PolicyEngine(db)
    with pytest.raises(PolicyViolation):
        engine.check_can_start_execution("org-1", {"max_daily_executions": 2})


def test_check_can_start_execution_allows_under_limit():
    db = FakeSupabase()
    engine = PolicyEngine(db)
    engine.check_can_start_execution("org-1", {"max_daily_executions": 5})
