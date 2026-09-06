import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/database";

export type CurrentOrg = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrgRole;
  userId: string;
  userEmail: string | null;
  userFullName: string | null;
};

/**
 * Resolves the signed-in user's organization context for Server Components
 * and Server Actions. Redirects to /login if there is no session, and to
 * /onboarding if the user has not created/joined an organization yet.
 *
 * MVP simplification: a user's first membership (by created_at) is treated
 * as their active organization. Multi-org switching is a follow-up, not a
 * schema limitation — organization_members already supports many-to-many.
 */
export async function requireCurrentOrg(): Promise<CurrentOrg> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load organization membership: ${error.message}`);
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const org = membership.organizations as unknown as { name: string; slug: string } | null;

  return {
    organizationId: membership.organization_id,
    organizationName: org?.name ?? "Organization",
    organizationSlug: org?.slug ?? "",
    role: membership.role,
    userId: user.id,
    userEmail: user.email ?? null,
    userFullName: (user.user_metadata?.full_name as string | undefined) ?? null,
  };
}
