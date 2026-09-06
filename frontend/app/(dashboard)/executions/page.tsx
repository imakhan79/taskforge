import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExecutionStatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";

export const metadata: Metadata = { title: "Executions" };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function ExecutionsPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();

  const { data: executions } = await supabase
    .from("task_executions")
    .select("*, tasks(name)")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <RealtimeRefresher organizationId={org.organizationId} tables={["task_executions"]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Executions</h1>
        <p className="text-sm text-muted-foreground">Live status of every automation run.</p>
      </div>

      {!executions || executions.length === 0 ? (
        <EmptyState
          title="No executions yet"
          description="Run an automation to see its live execution timeline and verified results here."
          actionLabel="View automations"
          actionHref="/tasks"
        />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Verification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell>
                    <Link href={`/executions/${execution.id}`} className="font-medium hover:underline">
                      {(execution.tasks as unknown as { name: string } | null)?.name ?? "Automation"}
                    </Link>
                  </TableCell>
                  <TableCell><ExecutionStatusBadge status={execution.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(execution.started_at ?? execution.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {execution.duration_ms ? `${(execution.duration_ms / 1000).toFixed(1)}s` : "—"}
                  </TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">
                    {execution.verification_status}
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
