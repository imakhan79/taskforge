from supabase import Client

from app.database.client import get_supabase
from app.tools import http_tool
from app.tools.mock import crm, database, documents, email, files, notifications, spreadsheet
from app.tools.registry import ToolRegistry


def build_registry(db: Client) -> ToolRegistry:
    registry = ToolRegistry()
    for module in (email, files, documents, spreadsheet, crm, database):
        for tool in module.build_tools():
            registry.register(tool)
    for tool in http_tool.build_tools():
        registry.register(tool)
    for tool in notifications.build_tools(db):
        registry.register(tool)
    return registry


def build_default_registry() -> ToolRegistry:
    return build_registry(get_supabase())
