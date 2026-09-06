import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutionStatusBadge } from "@/components/dashboard/status-badge";
import { ExecutionTimeline } from "@/components/executions/execution-timeline";
import { RealtimeRefresher } from "@/components/dashboard/realtime-refresher";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Execution" };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function ExecutionDetailPage({ params }: Params) {
  const { id } = await params;
  const org = await requireCurrentOrg();
  const supabase = await createClient();

  const { data: execution } = await supabase
    .from("task_executions")
    .select("*, tasks(id, name)")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .single();

  if (!execution) notFound();

  const { data: events } = await supabase
    .from("execution_events")
    .select("id, event_type, event_data, tool_name, timestamp")
    .eq("execution_id", id)
    .order("timestamp", { ascending: true });

  const task = execution.tasks as unknown as { id: string; name: string } | null;
  const output = execution.output_data as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <RealtimeRefresher organizationId={org.organizationId} tables={["task_executions", "execution_events"]} />
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={task ? `/tasks/${task.id}` : "/tasks"} className="hover:underline">{task?.name ?? "Automation"}</Link>
        </p>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Execution</h1>
          <ExecutionStatusBadge status={execution.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Started</CardTitle></CardHeader>
          <CardContent className="text-sm">{formatDate(execution.started_at)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle></CardHeader>
          <CardContent className="text-sm">{formatDate(execution.completed_at)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Retry count</CardTitle></CardHeader>
          <CardContent className="text-sm">{execution.retry_count}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Verification</CardTitle></CardHeader>
          <CardContent className="text-sm capitalize">{execution.verification_status}</CardContent>
        </Card>
      </div>

      {execution.error && (
        <Card className="border-destructive/40">
          <CardHeader><CardTitle className="text-base text-destructive">Error</CardTitle></CardHeader>
          <CardContent className="text-sm text-destructive">{execution.error}</CardContent>
        </Card>
      )}

      {output && Object.keys(output).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Result summary</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(output).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-muted-foreground capitalize">{key.replaceAll("_", " ")}</dt>
                  <dd className="text-sm font-medium">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
        <CardContent>
          <ExecutionTimeline events={events ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
