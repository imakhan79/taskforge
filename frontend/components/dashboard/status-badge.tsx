import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExecutionStatus, RiskLevel, TaskStatus } from "@/types/database";

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  archived: "bg-muted text-muted-foreground",
};

const EXECUTION_STATUS_STYLES: Record<ExecutionStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  PLANNED: "bg-muted text-muted-foreground",
  WAITING_APPROVAL: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  QUEUED: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  RUNNING: "bg-sky-500/15 text-sky-700 dark:text-sky-400 animate-pulse",
  VERIFYING: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  FAILED: "bg-destructive/15 text-destructive",
  RETRYING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PAUSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground",
  ESCALATED: "bg-destructive/15 text-destructive",
};

const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  critical: "bg-destructive/15 text-destructive",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge className={cn("font-normal capitalize", TASK_STATUS_STYLES[status])}>{status}</Badge>;
}

export function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  return (
    <Badge className={cn("font-normal", EXECUTION_STATUS_STYLES[status])}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <Badge className={cn("font-normal capitalize", RISK_STYLES[risk])}>{risk}</Badge>;
}
