import uuid

from app.models.enums import RiskLevel
from app.tools.base import FunctionTool, Tool, ToolContext
from app.tools.mock.store import get_workspace


def _read_spreadsheet(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    return {"rows": ws.spreadsheets.get(config["sheet_id"], [])}


def _update_spreadsheet(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    rows = ws.spreadsheets.setdefault(config["sheet_id"], [])
    values = config.get("values") or []
    for value in values:
        rows.append(value)
    return {"updated_cells": len(values)}


def _append_row(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    rows = ws.spreadsheets.setdefault(config["sheet_id"], [])
    rows.append(config["row"])
    return {"row_number": len(rows)}


def _generate_report(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    report_id = str(uuid.uuid4())
    ws.reports.append({"id": report_id, "title": config["title"], "data": config.get("data", {})})
    return {"report_id": report_id, "url": f"mock://reports/{report_id}"}


def _verify_report(config: dict, result, ctx: ToolContext) -> bool:
    ws = get_workspace(ctx.organization_id)
    report_id = result.output.get("report_id")
    return any(r["id"] == report_id for r in ws.reports)


def build_tools() -> list[Tool]:
    return [
        FunctionTool("read_spreadsheet", "Read spreadsheet rows.", RiskLevel.LOW, ["spreadsheet:read"], _read_spreadsheet, ["sheet_id"]),
        FunctionTool("update_spreadsheet", "Update spreadsheet cells.", RiskLevel.MEDIUM, ["spreadsheet:write"], _update_spreadsheet, ["sheet_id", "values"]),
        FunctionTool("append_row", "Append a spreadsheet row.", RiskLevel.MEDIUM, ["spreadsheet:write"], _append_row, ["sheet_id", "row"]),
        FunctionTool(
            "generate_report", "Generate a report document.", RiskLevel.LOW, ["reports:write"], _generate_report,
            ["title"], verifier=_verify_report,
        ),
    ]
