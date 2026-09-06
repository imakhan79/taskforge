import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError, writeAuditLog } from "@/lib/api/context";
import { agentService, AgentServiceError } from "@/lib/agent-service/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await requireApiContext(null, "member");
  if (isApiError(ctx)) return ctx;

  const { data: task, error } = await ctx.supabase
    .from("tasks")
    .select("id, organization_id")
    .eq("id", id)
    .eq("organization_id", ctx.organizationId)
    .single();

  if (error || !task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  try {
    const result = await agentService.execute({
      task_id: task.id,
      organization_id: task.organization_id,
      trigger_source: "manual",
    });

    await writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.userId,
      action: "task.run_triggered",
      resourceType: "task",
      resourceId: id,
      metadata: { execution_id: result.execution_id },
    });

    return NextResponse.json(result, { status: 202 });
  } catch (err) {
    if (err instanceof AgentServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to trigger execution." }, { status: 500 });
  }
}
