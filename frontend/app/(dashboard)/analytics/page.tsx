import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { getDashboardMetrics } from "@/lib/data/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExecutionsOverTimeChart, ToolUsageChart } from "@/components/analytics/analytics-charts";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();
  const metrics = await getDashboardMetrics(supabase, org.organizationId);

  const since = new Date();
  since.setDate(since.getDate() - 13);

  const [{ data: recentExecutions }, { data: toolEvents }] = await Promise.all([
    supabase
      .from("task_executions")
      .select("status, created_at")
      .eq("organization_id", org.organizationId)
      .gte("created_at", since.toISOString()),
    supabase
      .from("execution_events")
      .select("tool_name")
      .eq("organization_id", org.organizationId)
      .eq("event_type", "tool_completed")
      .not("tool_name", "is", null),
  ]);

  const byDay = new Map<string, { completed: number; failed: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    byDay.set(d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), { completed: 0, failed: 0 });
  }
  for (const row of recentExecutions ?? []) {
    const key = new Date(row.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const bucket = byDay.get(key);
    if (!bucket) continue;
    if (row.status === "COMPLETED") bucket.completed += 1;
    if (row.status === "FAILED") bucket.failed += 1;
  }
  const executionsOverTime = [...byDay.entries()].map(([date, counts]) => ({ date, ...counts }));

  const toolCounts = new Map<string, number>();
  for (const row of toolEvents ?? []) {
    if (!row.tool_name) continue;
    toolCounts.set(row.tool_name, (toolCounts.get(row.tool_name) ?? 0) + 1);
  }
  const toolUsage = [...toolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Real numbers from your organization&apos;s executions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Success rate</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.successRate === null ? "—" : `${metrics.successRate}%`}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Completed</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.successfulExecutions}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Failed</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{metrics.failedExecutions}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Time saved</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{Math.round(metrics.timeSavedMinutes / 6) / 10}h</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutionsOverTimeChart data={executionsOverTime} />
        <ToolUsageChart data={toolUsage} />
      </div>
    </div>
  );
}
