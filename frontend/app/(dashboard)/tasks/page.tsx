import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TaskStatusBadge } from "@/components/dashboard/status-badge";
import { TaskActionsMenu } from "@/components/tasks/task-actions-menu";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "AI Automations" };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function TasksPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", org.organizationId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Automations</h1>
          <p className="text-sm text-muted-foreground">Everything you&apos;ve automated so far.</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">Create automation</Link>
        </Button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <EmptyState
          title="No automations yet"
          description="Describe a repetitive task in plain language and TaskForge will plan, execute, and verify it for you."
          actionLabel="Create your first automation"
          actionHref="/tasks/new"
        />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Link href={`/tasks/${task.id}`} className="font-medium hover:underline">
                      {task.name}
                    </Link>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status} />
                  </TableCell>
                  <TableCell className="text-sm capitalize text-muted-foreground">
                    {task.trigger_type}
                    {task.schedule ? ` · ${task.schedule}` : ""}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(task.last_run_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(task.next_run_at)}</TableCell>
                  <TableCell>
                    <TaskActionsMenu
                      taskId={task.id}
                      status={task.status}
                      naturalLanguageInstruction={task.natural_language_instruction}
                      configuration={task.configuration}
                    />
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
