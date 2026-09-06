import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/dashboard/status-badge";
import { ApprovalDecisionButtons } from "@/components/approvals/approval-decision-buttons";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";

export const metadata: Metadata = { title: "Approvals" };

const DECISION_ROLES = new Set(["manager", "admin", "owner"]);

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function ApprovalsPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();

  const { data: approvals } = await supabase
    .from("approvals")
    .select("*, task_executions(id, task_id, tasks(name))")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  const canDecide = DECISION_ROLES.has(org.role);
  const pending = (approvals ?? []).filter((a) => a.status === "pending");
  const decided = (approvals ?? []).filter((a) => a.status !== "pending");

  return (
    <div className="space-y-8">
      <RealtimeRefresher organizationId={org.organizationId} tables={["approvals"]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          High-risk actions pause here until a manager or admin decides.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          title="Nothing pending"
          description="When an automation reaches a step above your organization's risk threshold, it will wait here for a decision."
        />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Automation</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Requested</TableHead>
                {canDecide && <TableHead className="w-56" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((approval) => {
                const execution = approval.task_executions as unknown as {
                  id: string;
                  task_id: string;
                  tasks: { name: string } | null;
                } | null;
                return (
                  <TableRow key={approval.id}>
                    <TableCell className="max-w-xs">
                      <p className="text-sm font-medium">{approval.action_description}</p>
                      {execution && (
                        <Link href={`/executions/${execution.id}`} className="text-xs text-muted-foreground hover:underline">
                          View execution
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {execution?.task_id ? (
                        <Link href={`/tasks/${execution.task_id}`} className="hover:underline">
                          {execution.tasks?.name ?? "Automation"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell><RiskBadge risk={approval.risk_level} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(approval.created_at)}</TableCell>
                    {canDecide && (
                      <TableCell>
                        <ApprovalDecisionButtons approvalId={approval.id} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {decided.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-medium">History</h2>
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Decided</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decided.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell className="text-sm">{approval.action_description}</TableCell>
                    <TableCell>
                      <Badge variant={approval.status === "approved" ? "default" : "secondary"} className="capitalize">
                        {approval.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {approval.decided_at ? formatDate(approval.decided_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
