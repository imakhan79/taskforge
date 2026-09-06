import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError, writeAuditLog } from "@/lib/api/context";
import type { Database } from "@/types/database";

type Params = { params: Promise<{ id: string }> };
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await requireApiContext(request.nextUrl.searchParams.get("organization_id"));
  if (isApiError(ctx)) return ctx;

  const [{ data: task, error }, { data: steps }] = await Promise.all([
    ctx.supabase.from("tasks").select("*").eq("id", id).eq("organization_id", ctx.organizationId).single(),
    ctx.supabase
      .from("task_steps")
      .select("*")
      .eq("task_id", id)
      .order("step_order", { ascending: true }),
  ]);

  if (error || !task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ task, steps: steps ?? [] });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await requireApiContext(null, "member");
  if (isApiError(ctx)) return ctx;

  const body = await request.json().catch(() => ({}));
  const allowed = ["name", "description", "status", "schedule"] as const;
  const patch: TaskUpdate = {};
  for (const key of allowed) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", ctx.organizationId)
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Update failed." }, { status: 400 });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "task.updated",
    resourceType: "task",
    resourceId: id,
    metadata: patch,
  });

  return NextResponse.json({ task: data });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await requireApiContext(null, "manager");
  if (isApiError(ctx)) return ctx;

  const { error } = await ctx.supabase
    .from("tasks")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("organization_id", ctx.organizationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.userId,
    action: "task.archived",
    resourceType: "task",
    resourceId: id,
  });

  return NextResponse.json({ ok: true });
}
