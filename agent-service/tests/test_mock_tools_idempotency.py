import uuid

from app.tools.base import ToolContext
from app.tools.mock import crm
from app.tools.mock.store import get_workspace


def test_create_ticket_is_idempotent_per_execution_step():
    org_id = f"org-{uuid.uuid4()}"
    tools = {t.name: t for t in crm.build_tools()}
    create_ticket = tools["create_ticket"]
    ctx = ToolContext(organization_id=org_id, execution_id="exec-1", step_order=3)
    config = {"customer_id": "c1", "subject": "Help", "description": "Something broke"}

    first = create_ticket.execute(config, ctx)
    second = create_ticket.execute(config, ctx)  # simulates a retry of the same step

    assert first.success and second.success
    assert first.output["ticket_id"] == second.output["ticket_id"]
    ws = get_workspace(org_id)
    assert len(ws.tickets) == 1


def test_create_ticket_different_steps_are_independent():
    org_id = f"org-{uuid.uuid4()}"
    tools = {t.name: t for t in crm.build_tools()}
    create_ticket = tools["create_ticket"]
    config = {"customer_id": "c1", "subject": "Help", "description": "Something broke"}

    create_ticket.execute(config, ToolContext(organization_id=org_id, execution_id="exec-1", step_order=1))
    create_ticket.execute(config, ToolContext(organization_id=org_id, execution_id="exec-2", step_order=1))

    ws = get_workspace(org_id)
    assert len(ws.tickets) == 2


def test_create_ticket_verifies_against_the_store():
    org_id = f"org-{uuid.uuid4()}"
    tools = {t.name: t for t in crm.build_tools()}
    create_ticket = tools["create_ticket"]
    ctx = ToolContext(organization_id=org_id, execution_id="exec-1", step_order=1)
    config = {"customer_id": "c1", "subject": "Help", "description": "Something broke"}

    result = create_ticket.execute(config, ctx)
    assert create_ticket.verify(config, result, ctx) is True

    ws = get_workspace(org_id)
    ws.tickets.clear()  # simulate the record vanishing from the system of record
    assert create_ticket.verify(config, result, ctx) is False
