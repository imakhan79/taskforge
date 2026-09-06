"""Risk scoring is deterministic and comes from the tool_definitions table
(configurable per spec section 13), never from whatever the LLM put in a
generated plan — the planner's risk_level is a hint for the review UI, but
the executor always re-derives the authoritative risk from this engine
before deciding whether to pause for approval."""

from supabase import Client

from app.models.enums import RISK_ORDER, RiskLevel


class RiskEngine:
    def __init__(self, db: Client) -> None:
        self._db = db
        self._cache: dict[str, RiskLevel] | None = None

    def _load(self) -> dict[str, RiskLevel]:
        if self._cache is None:
            rows = self._db.table("tool_definitions").select("name, risk_level").execute().data or []
            self._cache = {row["name"]: RiskLevel(row["risk_level"]) for row in rows}
        return self._cache

    def get_tool_risk(self, tool_name: str, fallback: RiskLevel = RiskLevel.MEDIUM) -> RiskLevel:
        return self._load().get(tool_name, fallback)

    def requires_approval(self, risk: RiskLevel, org_settings: dict) -> bool:
        threshold = RiskLevel(org_settings.get("approval_risk_threshold", "high"))
        return RISK_ORDER[risk] >= RISK_ORDER[threshold]

    def highest_risk(self, risks: list[RiskLevel]) -> RiskLevel:
        return max(risks, key=lambda r: RISK_ORDER[r], default=RiskLevel.LOW)
