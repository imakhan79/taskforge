"""Deterministic cost/action limits (spec section 44). Checked before a run
starts and again before each tool call; when a limit is hit the executor
stops, saves state, logs it, and notifies admins — the policy engine itself
never talks to the LLM."""

from dataclasses import dataclass

from supabase import Client

from app.database import repository


class PolicyViolation(Exception):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


@dataclass
class ExecutionBudget:
    max_tool_calls: int
    max_retries: int
    max_duration_seconds: int
    tool_calls_used: int = 0

    def record_tool_call(self) -> None:
        self.tool_calls_used += 1
        if self.tool_calls_used > self.max_tool_calls:
            raise PolicyViolation(f"execution exceeded max_tool_calls_per_execution ({self.max_tool_calls})")


class PolicyEngine:
    def __init__(self, db: Client) -> None:
        self._db = db

    def check_can_start_execution(self, organization_id: str, org_settings: dict) -> None:
        max_daily = org_settings.get("max_daily_executions", 200)
        used_today = repository.count_executions_today(self._db, organization_id)
        if used_today >= max_daily:
            raise PolicyViolation(f"organization reached its max_daily_executions limit ({max_daily})")

    def budget_for(self, org_settings: dict) -> ExecutionBudget:
        return ExecutionBudget(
            max_tool_calls=org_settings.get("max_tool_calls_per_execution", 40),
            max_retries=org_settings.get("max_retries", 3),
            max_duration_seconds=org_settings.get("max_execution_duration_seconds", 900),
        )
