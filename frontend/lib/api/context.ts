import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/database";

export type ApiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  organizationId: string;
  role: OrgRole;
};

const ROLE_RANK: Record<OrgRole, number> = { viewer: 0, member: 1, manager: 2, admin: 3, owner: 4 };

/**
 * Resolves { user, organization, role } for a Route Handler using the
 * caller's own session (so every downstream query still goes through RLS —
 * this is a convenience wrapper, not a privilege escalation path). Returns
 * a ready-to-return NextResponse on failure so callers can
 * `const ctx = await requireApiContext(...); if (ctx instanceof NextResponse) return ctx;`
 */
export async function requireApiContext(
  organizationId: string | null,
  minRole: OrgRole = "viewer",
): Promise<ApiContext | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let query = supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id);
  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }
  const { data: membership, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (error || !membership) {
    return NextResponse.json({ error: "No organization membership found." }, { status: 403 });
  }

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    return NextResponse.json({ error: `Requires ${minRole} role or higher.` }, { status: 403 });
  }

  return { supabase, userId: user.id, organizationId: membership.organization_id, role: membership.role };
}

export function isApiError(ctx: ApiContext | NextResponse): ctx is NextResponse {
  return ctx instanceof NextResponse;
}

export async function writeAuditLog(params: {
  organizationId: string;
  actorId: string | null;
  actorType?: "user" | "agent" | "system";
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    organization_id: params.organizationId,
    actor_id: params.actorId,
    actor_type: params.actorType ?? "user",
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    metadata: params.metadata ?? {},
  });
}
