import uuid

from supabase import Client

from app.database.repository import insert_notification
from app.models.enums import RiskLevel
from app.tools.base import FunctionTool, Tool, ToolContext
from app.tools.mock.store import get_workspace


def build_tools(db: Client) -> list[Tool]:
    def _send_notification(config: dict, ctx: ToolContext) -> dict:
        idempotency_key = f"tool:{ctx.idempotency_key}"
        insert_notification(
            db,
            organization_id=ctx.organization_id,
            execution_id=ctx.execution_id,
            notification_type=config.get("type", "automation_update"),
            title=config["title"],
            message=config["message"],
            idempotency_key=idempotency_key,
            user_id=config.get("user_id"),
        )
        ws = get_workspace(ctx.organization_id)
        ws.sent_notifications.append({"idempotency_key": idempotency_key, **config})
        return {"notification_id": idempotency_key}

    def _send_webhook(config: dict, ctx: ToolContext) -> dict:
        from app.tools.http_tool import perform_request

        status = perform_request("POST", config["url"], json_body=config.get("payload"))
        return {"status": status}

    return [
        FunctionTool(
            "send_notification", "Send an in-app notification.", RiskLevel.LOW, ["notifications:send"],
            _send_notification, ["title", "message"],
        ),
        FunctionTool(
            "send_webhook", "Send an outbound webhook payload.", RiskLevel.MEDIUM, ["notifications:send"],
            _send_webhook, ["url", "payload"],
        ),
    ]
