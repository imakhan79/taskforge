from app.models.enums import RiskLevel
from app.tools.base import FunctionTool, Tool, ToolContext
from app.tools.mock.store import get_workspace


def _get_file(ws, file_id: str) -> dict:
    file = next((f for f in ws.files if f["id"] == file_id), None)
    if not file:
        raise ValueError(f"file {file_id} not found")
    return file


def _extract_text(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    file = _get_file(ws, config["file_id"])
    return {"text": f"[mock extracted text for {file['name']}]"}


def _extract_document_data(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    file = _get_file(ws, config["file_id"])
    if "invoice" in file["name"]:
        return {
            "fields": {
                "vendor": "Acme Supplies",
                "invoice_number": file["name"].split("-")[-1].split(".")[0],
                "amount": round(50 + file["size_kb"] * 1.5, 2),
                "due_date": "2026-10-01",
            }
        }
    return {"fields": {"title": file["name"]}}


def _summarize_document(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    file = _get_file(ws, config["file_id"])
    return {"summary": f"Summary of {file['name']} ({file['size_kb']}KB)."}


def _classify_document(config: dict, ctx: ToolContext) -> dict:
    ws = get_workspace(ctx.organization_id)
    file = _get_file(ws, config["file_id"])
    doc_type = "invoice" if "invoice" in file["name"] else "general"
    return {"document_type": doc_type, "confidence": 0.9}


def build_tools() -> list[Tool]:
    return [
        FunctionTool("extract_text", "Extract raw text from a document.", RiskLevel.LOW, ["documents:read"], _extract_text, ["file_id"]),
        FunctionTool("extract_document_data", "Extract structured fields from a document.", RiskLevel.LOW, ["documents:read"], _extract_document_data, ["file_id"]),
        FunctionTool("summarize_document", "Summarize a document.", RiskLevel.LOW, ["documents:read"], _summarize_document, ["file_id"]),
        FunctionTool("classify_document", "Classify a document by type.", RiskLevel.LOW, ["documents:read"], _classify_document, ["file_id"]),
    ]
