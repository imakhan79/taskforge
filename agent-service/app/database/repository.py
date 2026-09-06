"""Thin data-access layer over the service-role Supabase client. Every
write the agent-service makes to Postgres goes through here so the shape of
each table only needs to be known in one place."""

from datetime import datetime, timezone
from typing import Any

from supabase import Client

from app.models.enums import ExecutionStatus


def get_task(db: Client, task_id: str, organization_id: str) -> dict[str, Any] | None:
    res = (
        db.table("tasks")
        .select("*")
        .eq("id", task_id)
        .eq("organization_id", organization_id)
        .maybe_single()
        .execute()
    )
    return res.data if res else None


def get_task_steps(db: Client, task_id: str) -> list[dict[str, Any]]:
    res = db.table("task_steps").select("*").eq("task_id", task_id).order("step_order").execute()
    return res.data or []


def get_org_settings(db: Client, organization_id: str) -> dict[str, Any]:
    res = db.table("organizations").select("settings").eq("id", organization_id).single().execute()
    return (res.data or {}).get("settings", {})


def create_execution(
    db: Client,
    *,
    task_id: str,
    organization_id: str,
    idempotency_key: str,
    trigger_source: str,
    status: ExecutionStatus = ExecutionStatus.QUEUED,
) -> dict[str, Any]:
    """Insert-or-fetch: relies on the (task_id, idempotency_key) unique
    constraint to make execution creation idempotent (spec section 25)."""
    existing = (
        db.table("task_executions")
        .select("*")
        .eq("task_id", task_id)
        .eq("idempotency_key", idempotency_key)
        .maybe_single()
        .execute()
    )
    if existing and existing.data:
        return existing.data

    res = (
        db.table("task_executions")
        .insert(
            {
                "task_id": task_id,
                "organization_id": organization_id,
                "idempotency_key": idempotency_key,
                "trigger_source": trigger_source,
                "status": status.value,
            }
        )
        .execute()
    )
    return res.data[0]


def get_execution(db: Client, execution_id: str) -> dict[str, Any] | None:
    res = db.table("task_executions").select("*").eq("id", execution_id).maybe_single().execute()
    return res.data if res else None


def update_execution(db: Client, execution_id: str, **fields: Any) -> dict[str, Any]:
    if "status" in fields and hasattr(fields["status"], "value"):
        fields["status"] = fields["status"].value
    res = db.table("task_executions").update(fields).eq("id", execution_id).execute()
    return res.data[0] if res.data else {}


def insert_event(
    db: Client,
    *,
    execution_id: str,
    organization_id: str,
    event_type: str,
    event_data: dict[str, Any] | None = None,
    tool_name: str | None = None,
) -> None:
    db.table("execution_events").insert(
        {
            "execution_id": execution_id,
            "organization_id": organization_id,
            "event_type": event_type,
            "event_data": event_data or {},
            "tool_name": tool_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    ).execute()


def create_approval(
    db: Client,
    *,
    organization_id: str,
    execution_id: str,
    step_id: str | None,
    action_description: str,
    risk_level: str,
) -> dict[str, Any]:
    res = (
        db.table("approvals")
        .insert(
            {
                "organization_id": organization_id,
                "execution_id": execution_id,
                "step_id": step_id,
                "action_description": action_description,
                "risk_level": risk_level,
                "status": "pending",
                "requested_by": "agent",
            }
        )
        .execute()
    )
    return res.data[0]


def get_approval(db: Client, approval_id: str) -> dict[str, Any] | None:
    res = db.table("approvals").select("*").eq("id", approval_id).maybe_single().execute()
    return res.data if res else None


def get_approval_for_step(db: Client, execution_id: str, step_id: str) -> dict[str, Any] | None:
    """Regardless of status — used to find a decision already made for this
    step (approved/rejected), or None if this step hasn't been raised for
    approval yet."""
    res = (
        db.table("approvals")
        .select("*")
        .eq("execution_id", execution_id)
        .eq("step_id", step_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


def insert_notification(
    db: Client,
    *,
    organization_id: str,
    execution_id: str | None,
    notification_type: str,
    title: str,
    message: str,
    idempotency_key: str,
    user_id: str | None = None,
) -> None:
    db.table("notifications").upsert(
        {
            "organization_id": organization_id,
            "execution_id": execution_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "idempotency_key": idempotency_key,
            "user_id": user_id,
        },
        on_conflict="organization_id,idempotency_key",
    ).execute()


def insert_audit_log(
    db: Client, *, organization_id: str, action: str, resource_type: str | None = None,
    resource_id: str | None = None, metadata: dict[str, Any] | None = None,
) -> None:
    db.table("audit_logs").insert(
        {
            "organization_id": organization_id,
            "actor_id": None,
            "actor_type": "agent",
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "metadata": metadata or {},
        }
    ).execute()


def upsert_memory(
    db: Client, *, organization_id: str, scope: str, key: str, value: dict[str, Any],
    task_id: str | None = None, user_id: str | None = None,
) -> None:
    db.table("memories").upsert(
        {
            "organization_id": organization_id,
            "scope": scope,
            "task_id": task_id,
            "user_id": user_id,
            "key": key,
            "value": value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        on_conflict="organization_id,scope,task_id,user_id,key",
    ).execute()


def get_memory(db: Client, *, organization_id: str, scope: str, key: str, task_id: str | None = None) -> dict[str, Any] | None:
    query = (
        db.table("memories")
        .select("*")
        .eq("organization_id", organization_id)
        .eq("scope", scope)
        .eq("key", key)
    )
    query = query.eq("task_id", task_id) if task_id else query.is_("task_id", "null")
    res = query.maybe_single().execute()
    return res.data if res else None


def record_metric(db: Client, *, organization_id: str, metric_type: str, metric_value: float,
                   agent_id: str | None = None, task_id: str | None = None, execution_id: str | None = None) -> None:
    db.table("agent_metrics").insert(
        {
            "organization_id": organization_id,
            "agent_id": agent_id,
            "task_id": task_id,
            "execution_id": execution_id,
            "metric_type": metric_type,
            "metric_value": metric_value,
        }
    ).execute()


def count_executions_today(db: Client, organization_id: str) -> int:
    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    res = (
        db.table("task_executions")
        .select("id", count="exact")
        .eq("organization_id", organization_id)
        .gte("created_at", start_of_day.isoformat())
        .execute()
    )
    return res.count or 0


def update_task(db: Client, task_id: str, **fields: Any) -> None:
    db.table("tasks").update(fields).eq("id", task_id).execute()
