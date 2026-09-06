import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrgLimitsForm } from "@/components/settings/org-limits-form";
import { MemberRoleSelect } from "@/components/settings/member-role-select";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();

  const [{ data: orgRow }, { data: members }] = await Promise.all([
    supabase.from("organizations").select("settings").eq("id", org.organizationId).single(),
    supabase
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", org.organizationId)
      .order("created_at", { ascending: true }),
  ]);

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const canEditLimits = org.role === "admin" || org.role === "owner";
  const canEditRoles = org.role === "admin" || org.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{org.organizationName}</p>
      </div>

      <OrgLimitsForm organizationId={org.organizationId} settings={orgRow?.settings ?? {}} canEdit={canEditLimits} />

      <Card>
        <CardHeader><CardTitle className="text-base">Members</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members ?? []).map((member) => {
                const profile = profileById.get(member.user_id);
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{profile?.full_name || profile?.email || member.user_id}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    </TableCell>
                    <TableCell>
                      <MemberRoleSelect memberId={member.id} role={member.role} disabled={!canEditRoles} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
