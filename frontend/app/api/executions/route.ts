import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError } from "@/lib/api/context";
import type { ExecutionStatus } from "@/types/database";

const VALID_STATUSES: ExecutionStatus[] = [
  "DRAFT", "PLANNED", "WAITING_APPROVAL", "QUEUED", "RUNNING", "VERIFYING",
  "COMPLETED", "FAILED", "RETRYING", "PAUSED", "CANCELLED", "ESCALATED",
];

export async function GET(request: NextRequest) {
  const ctx = await requireApiContext(request.nextUrl.searchParams.get("organization_id"));
  if (isApiError(ctx)) return ctx;

  const taskId = request.nextUrl.searchParams.get("task_id");
  const status = request.nextUrl.searchParams.get("status");
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 50), 200);

  let query = ctx.supabase
    .from("task_executions")
    .select("*, tasks(name)")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (taskId) query = query.eq("task_id", taskId);
  if (status && VALID_STATUSES.includes(status as ExecutionStatus)) {
    query = query.eq("status", status as ExecutionStatus);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ executions: data });
}
