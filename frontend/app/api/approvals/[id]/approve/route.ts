import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError, writeAuditLog } from "@/lib/api/context";
import { agentService, AgentServiceError } from "@/lib/agent-service/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await requireApiContext(null, "manager");
  if (isApiError(ctx)) return ctx;

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : null;

  const { data: approval, error } = await ctx.supabase
    .from("approvals")
    .update({ status: "approved", decided_by: ctx.userId, decision_reason: reason, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.organizationId)
    .eq("status", "pending")
    .select()
    .single();

  if (error || !approval) {
    return NextResponse.json({ error: "Approval not found or already decided." }, { status: 404 });
  }

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "approval.approved",
    resourceType: "approval",
    resourceId: id,
    metadata: { execution_id: approval.execution_id },
  });

  try {
    await agentService.resume({ approval_id: id, decision: "approved", decided_by: ctx.userId });
  } catch (err) {
    // The decision is durably recorded either way; the worker's periodic
    // sweep for decided-but-unresumed approvals is the fallback if the
    // agent-service was briefly unreachable.
    if (!(err instanceof AgentServiceError)) throw err;
  }

  return NextResponse.json({ approval });
}
