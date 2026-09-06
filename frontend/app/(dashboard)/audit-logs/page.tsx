import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Every meaningful action, who did it, and when.</p>
      </div>

      {!logs || logs.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions taken by your team and by automations will appear here." />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.action}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{log.actor_type}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.resource_type ? `${log.resource_type}${log.resource_id ? ` · ${log.resource_id.slice(0, 8)}` : ""}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
