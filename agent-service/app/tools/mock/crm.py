import uuid

from app.models.enums import RiskLevel
from app.tools.base import FunctionTool, Tool, ToolContext
from app.tools.mock.store import get_workspace, with_idempotency


def _search_customer(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    query = (config.get("query") or "").lower()
    results = [c for c in ws.customers if query in c["name"].lower() or query in c["email"].lower()] if query else ws.customers
    return {"customers": results}


def _create_lead(config: dict, ctx: ToolContext) -> dict:
    def _do() -> dict:
        ws = get_workspace(ctx.organization_id)
        lead_id = str(uuid.uuid4())
        ws.leads.append({"id": lead_id, "name": config["name"], "email": config["email"], "source": config.get("source", "manual")})
        return {"lead_id": lead_id}

    return with_idempotency(ctx.organization_id, ctx.idempotency_key, _do)


def _update_customer(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    customer = next((c for c in ws.customers if c["id"] == config["customer_id"]), None)
    if not customer:
        raise ValueError(f"customer {config['customer_id']} not found")
    customer.update(config.get("fields", {}))
    return {"customer": customer}


def _create_ticket(config: dict, ctx: ToolContext) -> dict:
    def _do() -> dict:
        ws = get_workspace(ctx.organization_id)
        ticket_id = str(uuid.uuid4())
        ws.tickets.append(
            {
                "id": ticket_id,
                "customer_id": config.get("customer_id"),
                "subject": config["subject"],
                "description": config["description"],
                "priority": config.get("priority", "normal"),
            }
        )
        return {"ticket_id": ticket_id}

    return with_idempotency(ctx.organization_id, ctx.idempotency_key, _do)


def _verify_lead(config: dict, result, ctx: ToolContext) -> bool:
    ws = get_workspace(ctx.organization_id)
    return any(l["id"] == result.output.get("lead_id") for l in ws.leads)


def _verify_ticket(config: dict, result, ctx: ToolContext) -> bool:
    ws = get_workspace(ctx.organization_id)
    return any(t["id"] == result.output.get("ticket_id") for t in ws.tickets)


def build_tools() -> list[Tool]:
    return [
        FunctionTool("search_customer", "Search for a customer.", RiskLevel.LOW, ["crm:read"], _search_customer),
        FunctionTool(
            "create_lead", "Create a lead.", RiskLevel.MEDIUM, ["crm:write"], _create_lead,
            ["name", "email"], verifier=_verify_lead,
        ),
        FunctionTool("update_customer", "Update a customer record.", RiskLevel.MEDIUM, ["crm:write"], _update_customer, ["customer_id", "fields"]),
        FunctionTool(
            "create_ticket", "Create a support ticket.", RiskLevel.MEDIUM, ["crm:write"], _create_ticket,
            ["subject", "description"], verifier=_verify_ticket,
        ),
    ]
