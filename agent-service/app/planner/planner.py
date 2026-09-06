from strands import Agent
from strands.models import Model

from app.models.plan import Plan
from app.planner.intent_analyzer import analyze_intent

SYSTEM_PROMPT = """You are the planning engine of TaskForge, an AI automation platform.

Your ONLY job is to turn a plain-language description of repetitive work into a
structured automation plan. You do not execute anything yourself.

Rules:
- Every step's `tool_name` MUST be one of the tool names listed in the catalog below.
  Never invent a tool name.
- Order steps logically (order starts at 1, increments by 1).
- Assign each step's risk_level using the tool's own risk level from the catalog
  as a floor — a step can be rated higher than its tool's default if the specific
  configuration is riskier (e.g. sending to an external, unverified address), but
  never lower.
- Set requires_approval=true on the plan and on any step whose risk_level is
  "high" or "critical".
- `verification`: list concrete, checkable outcomes (e.g. "confirm_ticket_created",
  "confirm_record_updated") that prove the automation actually did what it claims —
  never leave this empty for a plan that creates or changes a record.
- `trigger.type` is "schedule" if the instruction implies recurrence (a hint about
  the detected cadence is provided below — use it unless the instruction clearly
  says otherwise), or "manual" for a one-off / on-demand automation.
- Keep `name` short (Title Case, under 8 words) and `objective` one sentence.

Available tools (name: description [risk_level]):
{tool_catalog}

Detected cadence hint: {intent_hint}
"""


class TaskPlanner:
    def __init__(self, model: Model, tool_catalog: list[dict]) -> None:
        self._model = model
        self._tool_catalog = tool_catalog

    def _catalog_text(self) -> str:
        return "\n".join(f"- {t['name']}: {t['description']} [{t['risk_level']}]" for t in self._tool_catalog)

    def generate_plan(self, instruction: str) -> Plan:
        hint = analyze_intent(instruction)
        system = SYSTEM_PROMPT.format(
            tool_catalog=self._catalog_text(),
            intent_hint=f"{hint.likely_trigger_type} ({hint.likely_schedule or 'n/a'})",
        )
        agent = Agent(model=self._model, tools=[], system_prompt=system, callback_handler=None)
        return agent.structured_output(Plan, f"Automate this: {instruction}")
