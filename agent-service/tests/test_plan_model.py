import pytest
from pydantic import ValidationError

from app.models.plan import Plan


def make_plan(**overrides) -> dict:
    base = {
        "name": "Email Triage",
        "objective": "Process support emails",
        "trigger": {"type": "schedule", "schedule": "weekdays 09:00"},
        "steps": [
            {"order": 2, "name": "Classify", "action": "classify_email", "tool_name": "classify_email"},
            {"order": 1, "name": "Search", "action": "search_emails", "tool_name": "search_emails"},
        ],
        "risk_level": "medium",
        "requires_approval": False,
        "verification": ["confirm_ticket_created"],
    }
    base.update(overrides)
    return base


def test_plan_parses_and_sorts_steps_by_order():
    plan = Plan.model_validate(make_plan())
    assert [s.order for s in plan.steps] == [1, 2]
    assert plan.steps[0].name == "Search"


def test_plan_rejects_duplicate_step_order():
    data = make_plan(steps=[
        {"order": 1, "name": "A", "action": "a", "tool_name": "search_emails"},
        {"order": 1, "name": "B", "action": "b", "tool_name": "classify_email"},
    ])
    with pytest.raises(ValidationError):
        Plan.model_validate(data)


def test_plan_requires_at_least_one_step():
    data = make_plan(steps=[])
    with pytest.raises(ValidationError):
        Plan.model_validate(data)


def test_plan_step_defaults():
    plan = Plan.model_validate(make_plan())
    step = plan.steps[0]
    assert step.risk_level.value == "low"
    assert step.requires_approval is False
