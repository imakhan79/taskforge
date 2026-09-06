import { NextResponse, type NextRequest } from "next/server";
import { requireApiContext, isApiError } from "@/lib/api/context";
import { getDashboardMetrics } from "@/lib/data/metrics";

export async function GET(request: NextRequest) {
  const ctx = await requireApiContext(request.nextUrl.searchParams.get("organization_id"));
  if (isApiError(ctx)) return ctx;

  const metrics = await getDashboardMetrics(ctx.supabase, ctx.organizationId);
  return NextResponse.json(metrics);
}
