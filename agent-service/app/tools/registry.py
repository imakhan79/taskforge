from app.tools.base import Tool


class ToolNotFoundError(Exception):
    pass


class PermissionDeniedError(Exception):
    pass


class ToolRegistry:
    """Central catalog every engine (planner validation, executor, tests)
    goes through instead of importing tool modules directly. Adding a tool
    is register(); nothing else in the agent needs to know it exists."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def unregister(self, name: str) -> None:
        self._tools.pop(name, None)

    def get(self, name: str) -> Tool:
        try:
            return self._tools[name]
        except KeyError as exc:
            raise ToolNotFoundError(f"No tool registered with name '{name}'") from exc

    def list(self) -> list[Tool]:
        return list(self._tools.values())

    def validate(self, name: str, config: dict) -> None:
        self.get(name).validate(config)

    def check_permission(self, name: str, granted_permissions: set[str]) -> bool:
        tool = self.get(name)
        if not tool.required_permissions:
            return True
        return all(perm in granted_permissions for perm in tool.required_permissions)


_default_registry: ToolRegistry | None = None


def get_default_registry() -> ToolRegistry:
    global _default_registry
    if _default_registry is None:
        from app.tools.bootstrap import build_default_registry

        _default_registry = build_default_registry()
    return _default_registry
