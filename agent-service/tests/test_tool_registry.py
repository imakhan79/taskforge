import pytest

from app.models.enums import RiskLevel
from app.tools.base import Tool, ToolContext, ToolResult
from app.tools.registry import ToolNotFoundError, ToolRegistry


class DummyTool(Tool):
    name = "dummy_tool"
    description = "test tool"
    risk_level = RiskLevel.LOW
    required_permissions = ["dummy:use"]

    def execute(self, config: dict, context: ToolContext) -> ToolResult:
        return ToolResult(success=True, output={"ok": True})


def test_register_and_get():
    registry = ToolRegistry()
    registry.register(DummyTool())
    tool = registry.get("dummy_tool")
    assert tool.name == "dummy_tool"


def test_get_missing_tool_raises():
    registry = ToolRegistry()
    with pytest.raises(ToolNotFoundError):
        registry.get("does_not_exist")


def test_unregister_removes_tool():
    registry = ToolRegistry()
    registry.register(DummyTool())
    registry.unregister("dummy_tool")
    with pytest.raises(ToolNotFoundError):
        registry.get("dummy_tool")


def test_list_returns_all_tools():
    registry = ToolRegistry()
    registry.register(DummyTool())
    assert [t.name for t in registry.list()] == ["dummy_tool"]


def test_check_permission_true_when_granted():
    registry = ToolRegistry()
    registry.register(DummyTool())
    assert registry.check_permission("dummy_tool", {"dummy:use"}) is True


def test_check_permission_false_when_missing():
    registry = ToolRegistry()
    registry.register(DummyTool())
    assert registry.check_permission("dummy_tool", set()) is False


def test_validate_delegates_to_tool():
    class StrictTool(DummyTool):
        required_fields = ["foo"]

    registry = ToolRegistry()
    registry.register(StrictTool())
    with pytest.raises(ValueError):
        registry.validate("dummy_tool", {})
    registry.validate("dummy_tool", {"foo": "bar"})  # does not raise
