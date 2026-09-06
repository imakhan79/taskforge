from app.models.enums import RiskLevel
from app.tools.base import FunctionTool, Tool, ToolContext
from app.tools.mock.store import get_workspace


def _list_files(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    folder = config.get("folder")
    files = [f for f in ws.files if not folder or f["folder"] == folder]
    return {"files": files}


def _get_file(ws, file_id: str) -> dict:
    file = next((f for f in ws.files if f["id"] == file_id), None)
    if not file:
        raise ValueError(f"file {file_id} not found")
    return file


def _read_file(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    return {"file": _get_file(ws, config["file_id"])}


def _move_file(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    file = _get_file(ws, config["file_id"])
    file["folder"] = config["destination_folder"]
    return {"file": file}


def _rename_file(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    file = _get_file(ws, config["file_id"])
    file["name"] = config["new_name"]
    return {"file": file}


def _delete_file(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    file = _get_file(ws, config["file_id"])
    ws.files.remove(file)
    return {"deleted": True}


def _verify_moved(config: dict, result, ctx: ToolContext) -> bool:
    ws = get_workspace(ctx.organization_id)
    file = next((f for f in ws.files if f["id"] == config["file_id"]), None)
    return bool(file and file["folder"] == config["destination_folder"])


def build_tools() -> list[Tool]:
    return [
        FunctionTool("list_files", "List files in a folder.", RiskLevel.LOW, ["files:read"], _list_files),
        FunctionTool("read_file", "Read file metadata.", RiskLevel.LOW, ["files:read"], _read_file, ["file_id"]),
        FunctionTool(
            "move_file", "Move a file.", RiskLevel.MEDIUM, ["files:write"], _move_file,
            ["file_id", "destination_folder"], verifier=_verify_moved,
        ),
        FunctionTool("rename_file", "Rename a file.", RiskLevel.MEDIUM, ["files:write"], _rename_file, ["file_id", "new_name"]),
        FunctionTool("delete_file", "Permanently delete a file.", RiskLevel.CRITICAL, ["files:delete"], _delete_file, ["file_id"]),
    ]
