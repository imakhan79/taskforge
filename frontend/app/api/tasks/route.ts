import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError, writeAuditLog } from "@/lib/api/context";
import { createTaskRequestSchema, planSchema } from "@/lib/validation/tasks";
import { createTaskFromPlan } from "@/lib/data/tasks-write";
import { agentService, AgentServiceError } from "@/lib/agent-service/client";

export async function GET(request: NextRequest) {
  const ctx = await requireApiContext(request.nextUrl.searchParams.get("organization_id"));
  if (isApiError(ctx)) return ctx;

  const { data, error } = await ctx.supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(request: NextRequest) {
  const ctx = await requireApiContext(null, "member");
  if (isApiError(ctx)) return ctx;

  const body = await request.json().catch(() => null);
  const parsed = createTaskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  try {
    // Path 1: plan already produced (and possibly edited) by the client —
    // create the task directly.
    if ("plan" in input) {
      const task = await createTaskFromPlan(ctx.supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        naturalLanguageInstruction: input.natural_language_instruction,
        plan: input.plan,
      });
      await writeAuditLog({
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: "task.created",
        resourceType: "task",
        resourceId: task.id,
      });
      return NextResponse.json({ task }, { status: 201 });
    }

    // Path 2: from a template's pre-built plan — no AI call needed.
    if ("template_id" in input) {
      const { data: template, error } = await ctx.supabase
        .from("task_templates")
        .select("*")
        .eq("id", input.template_id)
        .single();
      if (error || !template) {
        return NextResponse.json({ error: "Template not found." }, { status: 404 });
      }
      if (!template.is_executable) {
        return NextResponse.json({ error: "This template isn't runnable yet." }, { status: 400 });
      }
      const plan = planSchema.parse(template.default_configuration);
      const task = await createTaskFromPlan(ctx.supabase, {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        naturalLanguageInstruction: template.natural_language_instruction,
        plan,
      });
      await writeAuditLog({
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: "task.created_from_template",
        resourceType: "task",
        resourceId: task.id,
        metadata: { template_id: template.id, template_name: template.name },
      });
      return NextResponse.json({ task }, { status: 201 });
    }

    // Path 3: natural language only — ask the agent-service planner.
    const { plan } = await agentService.plan({
      instruction: input.natural_language_instruction,
      organization_id: ctx.organizationId,
    });

    if (input.dry_run) {
      return NextResponse.json({ plan });
    }

    const task = await createTaskFromPlan(ctx.supabase, {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      naturalLanguageInstruction: input.natural_language_instruction,
      plan,
    });
    await writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.userId,
      action: "task.created",
      resourceType: "task",
      resourceId: task.id,
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof AgentServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
