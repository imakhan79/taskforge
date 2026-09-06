"""Runs a task's steps through the ToolRegistry, enforcing the state
machine (spec section 9), the approval gate, the recovery loop, and
verification before anything counts as done. This is the one place all the
other engines get wired together — planning has already happened by the
time an execution reaches here; the plan's steps are just data."""

import time
from datetime import datetime, timezone

from supabase import Client

from app.approvals.approval_engine import ApprovalEngine
from app.database import repository
from app.models.enums import ALLOWED_TRANSITIONS, ApprovalStatus, ExecutionStatus, VerificationStatus
from app.models.execution import StepResult
from app.policies.policy_engine import PolicyEngine, PolicyViolation
from app.recovery.recovery_engine import RecoveryEngine
from app.reporting.reporting_engine import ReportingEngine
from app.security.risk_engine import RiskEngine
from app.tools.base import ToolContext
from app.tools.registry import ToolRegistry
from app.verifier.verification_engine import VerificationEngine


class IllegalTransitionError(Exception):
    pass


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class ExecutionEngine:
    def __init__(self, db: Client, registry: ToolRegistry) -> None:
        self.db = db
        self.registry = registry
        self.risk_engine = RiskEngine(db)
        self.policy_engine = PolicyEngine(db)
        self.approval_engine = ApprovalEngine(db)
        self.recovery_engine = RecoveryEngine()
        self.verification_engine = VerificationEngine()
        self.reporting_engine = ReportingEngine()

    def _transition(self, execution: dict, new_status: ExecutionStatus) -> None:
        current = ExecutionStatus(execution["status"])
        if new_status != current and new_status not in ALLOWED_TRANSITIONS.get(current, set()):
            raise IllegalTransitionError(f"cannot transition execution from {current} to {new_status}")
        repository.update_execution(self.db, execution["id"], status=new_status)
        execution["status"] = new_status.value

    def _fail(self, execution: dict, error: str) -> None:
        self._transition(execution, ExecutionStatus.FAILED)
        repository.update_execution(
            self.db, execution["id"], error=error, completed_at=_now_iso(),
            verification_status=VerificationStatus.FAILED.value,
        )
        repository.insert_event(
            self.db, execution_id=execution["id"], organization_id=execution["organization_id"],
            event_type="task_failed", event_data={"error": error},
        )
        repository.insert_audit_log(
            self.db, organization_id=execution["organization_id"], action="execution.failed",
            resource_type="task_execution", resource_id=execution["id"], metadata={"error": error},
        )

    def _escalate(self, execution: dict, reason: str) -> None:
        self._transition(execution, ExecutionStatus.ESCALATED)
        repository.update_execution(self.db, execution["id"], error=reason, verification_status=VerificationStatus.FAILED.value)
        repository.insert_event(
            self.db, execution_id=execution["id"], organization_id=execution["organization_id"],
            event_type="escalated", event_data={"reason": reason},
        )
        repository.insert_notification(
            self.db, organization_id=execution["organization_id"], execution_id=execution["id"],
            notification_type="task_failed", title="Automation needs attention", message=reason,
            idempotency_key=f"escalation:{execution['id']}",
        )
        repository.insert_audit_log(
            self.db, organization_id=execution["organization_id"], action="execution.escalated",
            resource_type="task_execution", resource_id=execution["id"], metadata={"reason": reason},
        )

    def _load_step_results(self, execution: dict) -> list[StepResult]:
        raw = (execution.get("output_data") or {}).get("_step_results", [])
        return [StepResult(**r) for r in raw]

    def _persist_step_results(self, execution: dict, step_results: list[StepResult]) -> None:
        repository.update_execution(
            self.db, execution["id"],
            output_data={"_step_results": [r.model_dump(mode="json") for r in step_results]},
        )

    def _execute_step_with_recovery(self, step: dict, ctx: ToolContext, max_retries: int, execution: dict) -> StepResult:
        tool = self.registry.get(step["tool_name"])
        attempt = 0
        last_error: str | None = None

        try:
            tool.validate(step["configuration"])
        except ValueError as exc:
            return StepResult(step_order=step["step_order"], tool_name=step["tool_name"], success=False, error=str(exc))

        while True:
            repository.insert_event(
                self.db, execution_id=execution["id"], organization_id=execution["organization_id"],
                event_type="tool_called", tool_name=step["tool_name"], event_data={"step": step["name"]},
            )
            result = tool.execute(step["configuration"], ctx)

            if result.success:
                verified = self.verification_engine.verify_step(tool, step["configuration"], result, ctx)
                repository.insert_event(
                    self.db, execution_id=execution["id"], organization_id=execution["organization_id"],
                    event_type="tool_completed" if verified else "verification_failed",
                    tool_name=step["tool_name"], event_data={"output": result.output, "verified": verified},
                )
                if verified:
                    return StepResult(
                        step_order=step["step_order"], tool_name=step["tool_name"], success=True,
                        output=result.output, retry_count=attempt, verified=True,
                    )
                last_error = "Verification failed: the system of record does not reflect this change."
            else:
                repository.insert_event(
                    self.db, execution_id=execution["id"], organization_id=execution["organization_id"],
                    event_type="tool_failed", tool_name=step["tool_name"], event_data={"error": result.error},
                )
                last_error = result.error

            decision = self.recovery_engine.decide(attempt=attempt, max_retries=max_retries)
            if not decision.should_retry:
                return StepResult(
                    step_order=step["step_order"], tool_name=step["tool_name"], success=False,
                    error=last_error, retry_count=attempt, verified=False,
                )

            repository.insert_event(
                self.db, execution_id=execution["id"], organization_id=execution["organization_id"],
                event_type="retry", tool_name=step["tool_name"],
                event_data={"attempt": attempt + 1, "backoff_seconds": decision.backoff_seconds},
            )
            self.recovery_engine.sleep_for_backoff(decision.backoff_seconds)
            attempt += 1

    def run(self, execution_id: str) -> dict:
        execution = repository.get_execution(self.db, execution_id)
        if not execution:
            raise ValueError(f"execution {execution_id} not found")

        if execution["status"] in (
            ExecutionStatus.COMPLETED.value, ExecutionStatus.FAILED.value,
            ExecutionStatus.CANCELLED.value, ExecutionStatus.ESCALATED.value,
        ):
            return execution  # terminal — re-invoking run() is a safe no-op, not a re-run

        task = repository.get_task(self.db, execution["task_id"], execution["organization_id"])
        if not task:
            raise ValueError(f"task {execution['task_id']} not found")

        org_settings = repository.get_org_settings(self.db, execution["organization_id"])

        if execution["status"] == ExecutionStatus.DRAFT.value:
            self._transition(execution, ExecutionStatus.PLANNED)
        try:
            self.policy_engine.check_can_start_execution(execution["organization_id"], org_settings)
        except PolicyViolation as exc:
            self._fail(execution, str(exc))
            return execution
        if execution["status"] in (ExecutionStatus.PLANNED.value, ExecutionStatus.QUEUED.value, ExecutionStatus.WAITING_APPROVAL.value):
            self._transition(execution, ExecutionStatus.RUNNING)

        if not execution.get("started_at"):
            repository.update_execution(self.db, execution_id, started_at=_now_iso())
            repository.insert_event(self.db, execution_id=execution_id, organization_id=execution["organization_id"], event_type="agent_started")
            repository.insert_event(
                self.db, execution_id=execution_id, organization_id=execution["organization_id"],
                event_type="plan_loaded", event_data={"task_id": task["id"]},
            )

        steps = repository.get_task_steps(self.db, task["id"])
        budget = self.policy_engine.budget_for(org_settings)
        step_results = self._load_step_results(execution)
        completed_orders = {r.step_order for r in step_results}
        start_time = time.monotonic()

        for step in steps:
            if step["step_order"] in completed_orders:
                continue

            risk = self.risk_engine.get_tool_risk(step["tool_name"])
            requires_approval = step["requires_approval"] or self.risk_engine.requires_approval(risk, org_settings)

            if requires_approval:
                approval = repository.get_approval_for_step(self.db, execution_id, step["id"])
                if not approval:
                    approval = self.approval_engine.request_approval(
                        organization_id=execution["organization_id"], execution_id=execution_id,
                        step_id=step["id"], action_description=f"{step['name']} ({step['tool_name']})",
                        risk_level=risk.value,
                    )
                decision = ApprovalStatus(approval["status"])
                if decision == ApprovalStatus.PENDING:
                    self._persist_step_results(execution, step_results)
                    self._transition(execution, ExecutionStatus.WAITING_APPROVAL)
                    return execution
                if decision in (ApprovalStatus.REJECTED, ApprovalStatus.EXPIRED):
                    repository.insert_event(
                        self.db, execution_id=execution_id, organization_id=execution["organization_id"],
                        event_type="approval_rejected", event_data={"step": step["name"]},
                    )
                    self._fail(execution, f"Approval rejected for step '{step['name']}'.")
                    return execution
                repository.insert_event(
                    self.db, execution_id=execution_id, organization_id=execution["organization_id"],
                    event_type="approval_granted", event_data={"step": step["name"]},
                )

            ctx = ToolContext(organization_id=execution["organization_id"], execution_id=execution_id, step_order=step["step_order"])

            try:
                budget.record_tool_call()
            except PolicyViolation as exc:
                self._persist_step_results(execution, step_results)
                self._fail(execution, str(exc))
                return execution

            result = self._execute_step_with_recovery(step, ctx, budget.max_retries, execution)
            step_results.append(result)
            self._persist_step_results(execution, step_results)

            if not (result.success and result.verified):
                self._escalate(execution, f"Step '{step['name']}' could not be completed after {result.retry_count} retr{'y' if result.retry_count == 1 else 'ies'}: {result.error}")
                return execution

        duration_ms = int((time.monotonic() - start_time) * 1000)
        self._transition(execution, ExecutionStatus.VERIFYING)
        summary = self.reporting_engine.build_summary(step_results, duration_ms)

        repository.update_execution(
            self.db, execution_id, completed_at=_now_iso(), duration_ms=duration_ms,
            output_data=summary, verification_status=VerificationStatus.PASSED.value,
            time_saved_seconds=summary["time_saved_seconds"],
        )
        self._transition(execution, ExecutionStatus.COMPLETED)
        repository.update_task(self.db, task["id"], last_run_at=_now_iso())
        repository.record_metric(
            self.db, organization_id=execution["organization_id"], metric_type="time_saved_seconds",
            metric_value=summary["time_saved_seconds"], task_id=task["id"], execution_id=execution_id,
        )
        repository.insert_event(
            self.db, execution_id=execution_id, organization_id=execution["organization_id"],
            event_type="task_completed", event_data=summary,
        )
        repository.insert_audit_log(
            self.db, organization_id=execution["organization_id"], action="execution.completed",
            resource_type="task_execution", resource_id=execution_id, metadata=summary,
        )

        return repository.get_execution(self.db, execution_id)
