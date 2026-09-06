from pydantic import BaseModel, Field, field_validator

from app.models.enums import RiskLevel, TriggerType


class PlanTrigger(BaseModel):
    type: TriggerType
    schedule: str | None = None


class PlanStep(BaseModel):
    order: int = Field(gt=0)
    name: str
    description: str | None = None
    action: str
    tool_name: str
    configuration: dict = Field(default_factory=dict)
    risk_level: RiskLevel = RiskLevel.LOW
    requires_approval: bool = False


class Plan(BaseModel):
    """The one and only structured artifact the planner is allowed to
    produce. Nothing downstream (executor, verifier, recovery) ever acts on
    raw model text — everything acts on this validated model, per spec
    section 8."""

    name: str
    objective: str
    trigger: PlanTrigger
    steps: list[PlanStep] = Field(min_length=1)
    risk_level: RiskLevel
    requires_approval: bool
    verification: list[str] = Field(default_factory=list)

    @field_validator("steps")
    @classmethod
    def steps_sorted_unique_order(cls, steps: list[PlanStep]) -> list[PlanStep]:
        orders = [s.order for s in steps]
        if len(set(orders)) != len(orders):
            raise ValueError("step order values must be unique")
        return sorted(steps, key=lambda s: s.order)
