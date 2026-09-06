"""Re-checks the system of record before a step counts as successful (spec
section 26) — a tool reporting success is a claim, not a fact, until this
engine confirms it. Delegates to each Tool's own verify() (the mock tools
re-query their in-memory store; a real integration would re-query the real
API/database)."""

from app.tools.base import Tool, ToolContext, ToolResult


class VerificationEngine:
    def verify_step(self, tool: Tool, config: dict, result: ToolResult, context: ToolContext) -> bool:
        if not result.success:
            return False
        try:
            return tool.verify(config, result, context)
        except Exception:  # noqa: BLE001 - a verification crash means "not verified", not a 500
            return False
