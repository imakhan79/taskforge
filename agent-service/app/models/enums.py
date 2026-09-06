from enum import StrEnum


class RiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


RISK_ORDER = {RiskLevel.LOW: 0, RiskLevel.MEDIUM: 1, RiskLevel.HIGH: 2, RiskLevel.CRITICAL: 3}


class TriggerType(StrEnum):
    MANUAL = "manual"
    SCHEDULE = "schedule"
    WEBHOOK = "webhook"
    EVENT = "event"


class ExecutionStatus(StrEnum):
    DRAFT = "DRAFT"
    PLANNED = "PLANNED"
    WAITING_APPROVAL = "WAITING_APPROVAL"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"
    ESCALATED = "ESCALATED"


# Legal transitions for the execution state machine (spec section 9). The
# executor rejects any transition not listed here instead of just hiding it
# in the UI.
ALLOWED_TRANSITIONS: dict[ExecutionStatus, set[ExecutionStatus]] = {
    ExecutionStatus.DRAFT: {ExecutionStatus.PLANNED, ExecutionStatus.CANCELLED},
    ExecutionStatus.PLANNED: {ExecutionStatus.QUEUED, ExecutionStatus.WAITING_APPROVAL, ExecutionStatus.CANCELLED},
    ExecutionStatus.QUEUED: {ExecutionStatus.RUNNING, ExecutionStatus.CANCELLED},
    ExecutionStatus.WAITING_APPROVAL: {ExecutionStatus.RUNNING, ExecutionStatus.CANCELLED, ExecutionStatus.FAILED},
    ExecutionStatus.RUNNING: {
        ExecutionStatus.VERIFYING,
        ExecutionStatus.WAITING_APPROVAL,
        ExecutionStatus.RETRYING,
        ExecutionStatus.FAILED,
        ExecutionStatus.ESCALATED,
        ExecutionStatus.COMPLETED,
    },
    ExecutionStatus.VERIFYING: {ExecutionStatus.COMPLETED, ExecutionStatus.FAILED, ExecutionStatus.RETRYING},
    ExecutionStatus.RETRYING: {ExecutionStatus.RUNNING, ExecutionStatus.ESCALATED, ExecutionStatus.FAILED},
    ExecutionStatus.ESCALATED: {ExecutionStatus.RUNNING, ExecutionStatus.CANCELLED, ExecutionStatus.FAILED},
    ExecutionStatus.FAILED: set(),
    ExecutionStatus.COMPLETED: set(),
    ExecutionStatus.CANCELLED: set(),
    ExecutionStatus.PAUSED: {ExecutionStatus.RUNNING, ExecutionStatus.CANCELLED},
}


class ApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class VerificationStatus(StrEnum):
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"


class MemoryScope(StrEnum):
    SHORT_TERM = "short_term"
    TASK = "task"
    USER = "user"
    ORGANIZATION = "organization"
    OPERATIONAL = "operational"
