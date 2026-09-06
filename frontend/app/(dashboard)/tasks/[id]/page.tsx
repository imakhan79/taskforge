import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskStatusBadge, RiskBadge, ExecutionStatusBadge } from "@/components/dashboard/status-badge";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";

type Params = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Automation" };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function TaskDetailPage({ params }: Params) {
  const { id } = await params;
  const org = await requireCurrentOrg();
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .single();

  if (!task) notFound();

  const [{ data: steps }, { data: executions }] = await Promise.all([
    supabase.from("task_steps").select("*").eq("task_id", id).order("step_order", { ascending: true }),
    supabase
      .from("task_executions")
      .select("*")
      .eq("task_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{task.name}</h1>
            <TaskStatusBadge status={task.status} />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{task.description}</p>
        </div>
        <TaskActionsMenu
          taskId={task.id}
          status={task.status}
          naturalLanguageInstruction={task.natural_language_instruction}
          configuration={task.configuration}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Trigger</CardTitle></CardHeader>
          <CardContent className="text-sm capitalize">{task.trigger_type}{task.schedule ? ` · ${task.schedule}` : ""}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Risk level</CardTitle></CardHeader>
          <CardContent><RiskBadge risk={task.risk_level} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Last run</CardTitle></CardHeader>
          <CardContent className="text-sm">{formatDate(task.last_run_at)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Next run</CardTitle></CardHeader>
          <CardContent className="text-sm">{formatDate(task.next_run_at)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Original instruction</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{task.natural_language_instruction}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(steps ?? []).map((step) => (
            <div key={step.id} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{step.step_order}. {step.name}</p>
                {step.tool_name && (
                  <p className="text-xs text-muted-foreground">
                    Tool: <code className="font-mono">{step.tool_name}</code>
                  </p>
                )}
              </div>
              <RiskBadge risk={step.risk_level} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent executions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!executions || executions.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">This automation hasn&apos;t run yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Time saved</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      <Link href={`/executions/${execution.id}`} className="hover:underline">
                        {formatDate(execution.started_at ?? execution.created_at)}
                      </Link>
                    </TableCell>
                    <TableCell><ExecutionStatusBadge status={execution.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {execution.duration_ms ? `${(execution.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {execution.time_saved_seconds ? `${Math.round(execution.time_saved_seconds / 60)}m` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
