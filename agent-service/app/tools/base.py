"""Every tool a mock or real integration exposes implements this same
interface (spec section 10): name, description, input/output schema, risk
level, required permissions, execute(), validate(), verify(), rollback().
Adding a new tool means writing one of these and registering it — the
executor never needs to change."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable

from app.models.enums import RiskLevel


@dataclass
class ToolContext:
    organization_id: str
    execution_id: str
    step_order: int

    @property
    def idempotency_key(self) -> str:
        return f"{self.execution_id}:{self.step_order}"


@dataclass
class ToolResult:
    success: bool
    output: dict[str, Any] = field(default_factory=dict)
    error: str | None = None


class Tool(ABC):
    name: str
    description: str
    risk_level: RiskLevel
    required_permissions: list[str] = []
    required_fields: list[str] = []

    def validate(self, config: dict[str, Any]) -> None:
        missing = [f for f in self.required_fields if config.get(f) in (None, "")]
        if missing:
            raise ValueError(f"{self.name}: missing required field(s) {missing}")

    @abstractmethod
    def execute(self, config: dict[str, Any], context: ToolContext) -> ToolResult: ...

    def verify(self, config: dict[str, Any], result: ToolResult, context: ToolContext) -> bool:
        """Default: a tool that reported success is considered verified.
        Tools whose effect can be independently re-checked (the mock
        stores) override this to actually re-query the system of record."""
        return result.success

    def rollback(self, config: dict[str, Any], result: ToolResult, context: ToolContext) -> None:
        """Not every action is reversible; tools that can undo their effect
        override this."""
        return None


class FunctionTool(Tool):
    """Reduces boilerplate for the many simple, single-purpose mock tools:
    wraps a plain handler function instead of requiring a full subclass."""

    def __init__(
        self,
        name: str,
        description: str,
        risk_level: RiskLevel,
        required_permissions: list[str],
        handler: Callable[[dict[str, Any], ToolContext], dict[str, Any]],
        required_fields: list[str] | None = None,
        verifier: Callable[[dict[str, Any], ToolResult, ToolContext], bool] | None = None,
    ) -> None:
        self.name = name
        self.description = description
        self.risk_level = risk_level
        self.required_permissions = required_permissions
        self.required_fields = required_fields or []
        self._handler = handler
        self._verifier = verifier

    def execute(self, config: dict[str, Any], context: ToolContext) -> ToolResult:
        try:
            output = self._handler(config, context)
            return ToolResult(success=True, output=output)
        except Exception as exc:  # noqa: BLE001 - tool failures are data, not crashes
            return ToolResult(success=False, error=str(exc))

    def verify(self, config: dict[str, Any], result: ToolResult, context: ToolContext) -> bool:
        if not result.success:
            return False
        if self._verifier:
            return self._verifier(config, result, context)
        return True
