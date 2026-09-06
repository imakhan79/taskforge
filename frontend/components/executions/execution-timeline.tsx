import {
  PlayCircle,
  FileText,
  Wrench,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RotateCcw,
  AlertTriangle,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_META: Record<string, { icon: typeof PlayCircle; label: string; tone: string }> = {
  agent_started: { icon: PlayCircle, label: "Agent started", tone: "text-sky-600" },
  plan_loaded: { icon: FileText, label: "Plan loaded", tone: "text-sky-600" },
  tool_called: { icon: Wrench, label: "Tool called", tone: "text-muted-foreground" },
  tool_completed: { icon: CheckCircle2, label: "Tool completed", tone: "text-emerald-600" },
  tool_failed: { icon: XCircle, label: "Tool failed", tone: "text-destructive" },
  verification_started: { icon: ShieldCheck, label: "Verification started", tone: "text-violet-600" },
  verification_completed: { icon: ShieldCheck, label: "Verification passed", tone: "text-emerald-600" },
  verification_failed: { icon: ShieldX, label: "Verification failed", tone: "text-destructive" },
  approval_requested: { icon: ShieldAlert, label: "Approval requested", tone: "text-amber-600" },
  approval_granted: { icon: ShieldCheck, label: "Approval granted", tone: "text-emerald-600" },
  approval_rejected: { icon: ShieldX, label: "Approval rejected", tone: "text-destructive" },
  retry: { icon: RotateCcw, label: "Retrying", tone: "text-amber-600" },
  escalated: { icon: AlertTriangle, label: "Escalated to a human", tone: "text-destructive" },
  task_completed: { icon: Flag, label: "Task completed", tone: "text-emerald-600" },
  task_failed: { icon: Flag, label: "Task failed", tone: "text-destructive" },
};

export type ExecutionEvent = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  tool_name: string | null;
  timestamp: string;
};

function describe(event: ExecutionEvent): string | null {
  const data = event.event_data ?? {};
  if (event.tool_name && event.event_type.startsWith("tool_")) {
    return event.tool_name;
  }
  if (typeof data.message === "string") return data.message;
  if (typeof data.reason === "string") return data.reason;
  return null;
}

export function ExecutionTimeline({ events }: { events: ExecutionEvent[] }) {
  if (events.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No events recorded yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => {
        const meta = EVENT_META[event.event_type] ?? { icon: Wrench, label: event.event_type, tone: "text-muted-foreground" };
        const Icon = meta.icon;
        const detail = describe(event);
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={cn("flex size-7 items-center justify-center rounded-full bg-muted", meta.tone)}>
                <Icon className="size-4" />
              </span>
              {index < events.length - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className="pb-6">
              <p className="text-sm font-medium">{meta.label}</p>
              {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
              <p className="text-xs text-muted-foreground">
                {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
