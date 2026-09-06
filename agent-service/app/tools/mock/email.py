import uuid

from app.models.enums import RiskLevel
from app.tools.base import FunctionTool, Tool, ToolContext
from app.tools.mock.store import get_workspace, with_idempotency


def _search_emails(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    query = (config.get("query") or "").lower()
    results = ws.emails
    if "unread" in query:
        results = [e for e in results if not e["is_read"]]
    return {"emails": results}


def _read_email(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    email = next((e for e in ws.emails if e["id"] == config["email_id"]), None)
    if not email:
        raise ValueError(f"email {config['email_id']} not found")
    return {"email": email}


def _classify_email(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    email_id = config.get("email_id")
    email = next((e for e in ws.emails if e["id"] == email_id), None) if email_id else None
    if not email:
        return {"category": "question", "urgency": "normal", "confidence": 0.5}
    urgency = "urgent" if email["category"] == "urgent" else "normal"
    email["is_read"] = True
    return {"category": email["category"], "urgency": urgency, "confidence": 0.92}


def _draft_email(config: dict, ctx: ToolContext) -> dict:
    return {"draft_id": str(uuid.uuid4())}


def _send_email(config: dict, ctx: ToolContext) -> dict:
    def _do() -> dict:
        ws = get_workspace(ctx.organization_id)
        message_id = str(uuid.uuid4())
        ws.sent_emails.append({"id": message_id, **config})
        return {"message_id": message_id, "sent_at": "now"}

    return with_idempotency(ctx.organization_id, ctx.idempotency_key, _do)


def _verify_sent(config: dict, result, ctx: ToolContext) -> bool:
    ws = get_workspace(ctx.organization_id)
    message_id = result.output.get("message_id")
    return any(e["id"] == message_id for e in ws.sent_emails)


def build_tools() -> list[Tool]:
    return [
        FunctionTool("search_emails", "Search the connected mailbox.", RiskLevel.LOW, ["email:read"], _search_emails),
        FunctionTool("read_email", "Read a single email.", RiskLevel.LOW, ["email:read"], _read_email, ["email_id"]),
        FunctionTool("classify_email", "Classify an email.", RiskLevel.LOW, ["email:read"], _classify_email, ["email_id"]),
        FunctionTool("draft_email", "Draft a reply.", RiskLevel.MEDIUM, ["email:draft"], _draft_email, ["to", "subject", "body"]),
        FunctionTool(
            "send_email", "Send an email externally.", RiskLevel.HIGH, ["email:send"], _send_email,
            ["to", "subject", "body"], verifier=_verify_sent,
        ),
    ]
