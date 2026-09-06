import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError } from "@/lib/api/context";

export async function GET(request: NextRequest) {
  const ctx = await requireApiContext(request.nextUrl.searchParams.get("organization_id"));
  if (isApiError(ctx)) return ctx;

  const status = request.nextUrl.searchParams.get("status") ?? "pending";

  let query = ctx.supabase
    .from("approvals")
    .select("*, task_executions(id, task_id, tasks(name))")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status as "pending" | "approved" | "rejected" | "expired");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ approvals: data });
}
