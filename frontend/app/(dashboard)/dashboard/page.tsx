import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CheckCircle2, Clock, ShieldAlert, TrendingUp, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { getDashboardMetrics } from "@/lib/data/metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Dashboard" };

function formatTimeSaved(minutes: number) {
  if (minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export default async function DashboardPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();
  const metrics = await getDashboardMetrics(supabase, org.organizationId);

  const hasAnyActivity =
    metrics.activeAutomations > 0 || metrics.successfulExecutions > 0 || metrics.failedExecutions > 0;

  const stats = [
    { label: "Active automations", value: metrics.activeAutomations, icon: Activity },
    { label: "Successful executions", value: metrics.successfulExecutions, icon: CheckCircle2 },
    { label: "Failed executions", value: metrics.failedExecutions, icon: XCircle },
    { label: "Pending approvals", value: metrics.pendingApprovals, icon: ShieldAlert },
    { label: "Time saved", value: formatTimeSaved(metrics.timeSavedMinutes), icon: Clock },
    { label: "Success rate", value: metrics.successRate === null ? "—" : `${metrics.successRate}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back to {org.organizationName}.</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new">Create automation</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasAnyActivity && (
        <EmptyState
          title="No automations yet"
          description="Describe a repetitive task in plain language and TaskForge will plan, execute, and verify it for you."
          actionLabel="Create your first automation"
          actionHref="/tasks/new"
        />
      )}
    </div>
  );
}
