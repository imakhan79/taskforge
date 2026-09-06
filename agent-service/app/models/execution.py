from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

from app.models.enums import ExecutionStatus, VerificationStatus


class ExecutionEvent(BaseModel):
    event_type: str
    event_data: dict[str, Any] = Field(default_factory=dict)
    tool_name: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StepResult(BaseModel):
    step_order: int
    tool_name: str
    success: bool
    output: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    retry_count: int = 0
    verified: bool = False


class ExecutionResult(BaseModel):
    execution_id: str
    status: ExecutionStatus
    verification_status: VerificationStatus = VerificationStatus.PENDING
    step_results: list[StepResult] = Field(default_factory=list)
    output_data: dict[str, Any] = Field(default_factory=dict)
    error: str | None = None
    time_saved_seconds: int = 0
