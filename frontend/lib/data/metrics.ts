import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type DashboardMetrics = {
  activeAutomations: number;
  successfulExecutions: number;
  failedExecutions: number;
  pendingApprovals: number;
  successRate: number | null;
  timeSavedMinutes: number;
};

export async function getDashboardMetrics(
  supabase: SupabaseClient<Database>,
  organizationId: string,
): Promise<DashboardMetrics> {
  const [activeTasks, completed, failed, pendingApprovals, timeSaved] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("task_executions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "COMPLETED"),
    supabase
      .from("task_executions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "FAILED"),
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending"),
    supabase.from("task_executions").select("time_saved_seconds").eq("organization_id", organizationId),
  ]);

  const completedCount = completed.count ?? 0;
  const failedCount = failed.count ?? 0;
  const totalFinished = completedCount + failedCount;
  const totalSecondsSaved = (timeSaved.data ?? []).reduce((sum, row) => sum + (row.time_saved_seconds ?? 0), 0);

  return {
    activeAutomations: activeTasks.count ?? 0,
    successfulExecutions: completedCount,
    failedExecutions: failedCount,
    pendingApprovals: pendingApprovals.count ?? 0,
    successRate: totalFinished > 0 ? Math.round((completedCount / totalFinished) * 100) : null,
    timeSavedMinutes: Math.round(totalSecondsSaved / 60),
  };
}
