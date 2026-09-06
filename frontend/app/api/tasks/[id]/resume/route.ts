import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError, writeAuditLog } from "@/lib/api/context";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await requireApiContext(null, "member");
  if (isApiError(ctx)) return ctx;

  const { data, error } = await ctx.supabase
    .from("tasks")
    .update({ status: "active" })
    .eq("id", id)
    .eq("organization_id", ctx.organizationId)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "task.resumed",
    resourceType: "task",
    resourceId: id,
  });

  return NextResponse.json({ task: data });
}
