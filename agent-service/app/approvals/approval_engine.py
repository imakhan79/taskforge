"""Human-in-the-loop gate (spec section 14). When a step's risk crosses the
org's threshold, the executor calls request_approval() and the execution
transitions to WAITING_APPROVAL — the agent genuinely stops and does not
resume until a decision is recorded via the approve/reject Next.js API
routes, which call back into POST /agent/resume."""

from supabase import Client

from app.database import repository
from app.models.enums import ApprovalStatus


class ApprovalEngine:
    def __init__(self, db: Client) -> None:
        self._db = db

    def request_approval(
        self, *, organization_id: str, execution_id: str, step_id: str | None,
        action_description: str, risk_level: str,
    ) -> dict:
        approval = repository.create_approval(
            self._db,
            organization_id=organization_id,
            execution_id=execution_id,
            step_id=step_id,
            action_description=action_description,
            risk_level=risk_level,
        )
        repository.insert_event(
            self._db,
            execution_id=execution_id,
            organization_id=organization_id,
            event_type="approval_requested",
            event_data={"approval_id": approval["id"], "reason": action_description},
        )
        return approval

    def get_decision(self, approval_id: str) -> ApprovalStatus:
        approval = repository.get_approval(self._db, approval_id)
        if not approval:
            raise ValueError(f"approval {approval_id} not found")
        return ApprovalStatus(approval["status"])
