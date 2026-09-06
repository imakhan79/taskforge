import uuid

from app.models.enums import RiskLevel
from app.tools.base import FunctionTool, Tool, ToolContext
from app.tools.mock.store import get_workspace, with_idempotency


def _query_database(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    rows = ws.tables.get(config["table"], [])
    filters = config.get("filters") or {}
    if filters:
        rows = [r for r in rows if all(r.get(k) == v for k, v in filters.items())]
    return {"rows": rows}


def _insert_record(config: dict, ctx: ToolContext) -> dict:
    def _do() -> dict:
        ws = get_workspace(ctx.organization_id)
        table = ws.tables.setdefault(config["table"], [])
        record = {"id": str(uuid.uuid4()), **config["record"]}
        table.append(record)
        return {"record_id": record["id"]}

    return with_idempotency(ctx.organization_id, ctx.idempotency_key, _do)


def _update_record(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    table = ws.tables.setdefault(config["table"], [])
    record = next((r for r in table if r.get("id") == config["record_id"]), None)
    if not record:
        raise ValueError(f"record {config['record_id']} not found in {config['table']}")
    record.update(config.get("fields", {}))
    return {"record": record}


def _verify_inserted(config: dict, result, ctx: ToolContext) -> bool:
    ws = get_workspace(ctx.organization_id)
    table = ws.tables.get(config["table"], [])
    return any(r["id"] == result.output.get("record_id") for r in table)


def build_tools() -> list[Tool]:
    return [
        FunctionTool("query_database", "Read-only query against a table.", RiskLevel.LOW, ["database:read"], _query_database, ["table"]),
        FunctionTool(
            "insert_record", "Insert a record.", RiskLevel.MEDIUM, ["database:write"], _insert_record,
            ["table", "record"], verifier=_verify_inserted,
        ),
        FunctionTool("update_record", "Update a record.", RiskLevel.MEDIUM, ["database:write"], _update_record, ["table", "record_id", "fields"]),
    ]
