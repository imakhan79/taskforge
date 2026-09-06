import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError } from "@/lib/api/context";

export async function GET(request: NextRequest) {
  const ctx = await requireApiContext(request.nextUrl.searchParams.get("organization_id"));
  if (isApiError(ctx)) return ctx;

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 500);

  const { data, error } = await ctx.supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", ctx.organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ audit_logs: data });
}
