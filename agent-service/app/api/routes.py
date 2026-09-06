import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, ValidationError

from app.agents.model_provider import ModelNotConfiguredError, build_model
from app.api.deps import require_shared_secret
from app.config import get_settings
from app.database import repository
from app.database.client import get_supabase
from app.executor.execution_engine import ExecutionEngine
from app.models.enums import ApprovalStatus
from app.planner.planner import TaskPlanner
from app.tools.registry import get_default_registry
from app.verifier.verification_engine import VerificationEngine

logger = logging.getLogger("taskforge.agent")
router = APIRouter(prefix="/agent", dependencies=[Depends(require_shared_secret)])


class PlanRequest(BaseModel):
    instruction: str
    organization_id: str


class ExecuteRequest(BaseModel):
    task_id: str
    organization_id: str
    trigger_source: str = "manual"
    idempotency_key: str | None = None


class ResumeRequest(BaseModel):
    approval_id: str
    decision: str
    decided_by: str


class VerifyRequest(BaseModel):
    execution_id: str


@router.get("/health")
def health() -> dict:
    try:
        registry = get_default_registry()
        tool_count = len(registry.list())
    except Exception as exc:  # noqa: BLE001
        return {"status": "degraded", "detail": str(exc)}
    return {"status": "ok", "tools_registered": tool_count}


@router.post("/plan")
def plan(body: PlanRequest) -> dict:
    settings = get_settings()
    db = get_supabase()

    try:
        model = build_model(settings)
    except ModelNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    tool_catalog = db.table("tool_definitions").select("name, description, risk_level").eq("is_active", True).execute().data or []
    planner = TaskPlanner(model, tool_catalog)

    try:
        generated_plan = planner.generate_plan(body.instruction)
    except ValidationError as exc:
        raise HTTPException(status_code=502, detail=f"Planner produced an invalid plan: {exc}") from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("planning failed")
        raise HTTPException(status_code=502, detail=f"Planning failed: {exc}") from exc

    return {"plan": generated_plan.model_dump(mode="json")}


@router.post("/execute", status_code=202)
def execute(body: ExecuteRequest, background_tasks: BackgroundTasks) -> dict:
    db = get_supabase()
    task = repository.get_task(db, body.task_id, body.organization_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    idempotency_key = body.idempotency_key or f"{body.trigger_source}-{uuid.uuid4()}"
    execution = repository.create_execution(
        db, task_id=body.task_id, organization_id=body.organization_id,
        idempotency_key=idempotency_key, trigger_source=body.trigger_source,
    )

    def _run() -> None:
        registry = get_default_registry()
        ExecutionEngine(db, registry).run(execution["id"])

    background_tasks.add_task(_run)
    return {"execution_id": execution["id"], "status": execution["status"]}


@router.post("/resume")
def resume(body: ResumeRequest, background_tasks: BackgroundTasks) -> dict:
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'.")

    db = get_supabase()
    approval = repository.get_approval(db, body.approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found.")

    # The Next.js route already wrote the decision to `approvals`; this call
    # just wakes the paused execution back up so it can read that decision.
    if approval["status"] not in (ApprovalStatus.APPROVED.value, ApprovalStatus.REJECTED.value):
        raise HTTPException(status_code=409, detail="Approval has not been decided yet.")

    execution_id = approval["execution_id"]

    def _run() -> None:
        registry = get_default_registry()
        ExecutionEngine(db, registry).run(execution_id)

    background_tasks.add_task(_run)
    execution = repository.get_execution(db, execution_id)
    return {"execution_id": execution_id, "status": execution["status"] if execution else "UNKNOWN"}


@router.post("/verify")
def verify(body: VerifyRequest) -> dict:
    db = get_supabase()
    execution = repository.get_execution(db, body.execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found.")

    registry = get_default_registry()
    verifier = VerificationEngine()
    step_results = (execution.get("output_data") or {}).get("_step_results", [])

    from app.tools.base import ToolContext, ToolResult

    outcomes = []
    for raw in step_results:
        try:
            tool = registry.get(raw["tool_name"])
        except Exception:  # noqa: BLE001
            outcomes.append({"step_order": raw["step_order"], "verified": False})
            continue
        ctx = ToolContext(organization_id=execution["organization_id"], execution_id=execution["id"], step_order=raw["step_order"])
        result = ToolResult(success=raw["success"], output=raw.get("output", {}), error=raw.get("error"))
        verified = verifier.verify_step(tool, {}, result, ctx)
        outcomes.append({"step_order": raw["step_order"], "verified": verified})

    return {"execution_id": body.execution_id, "results": outcomes}
