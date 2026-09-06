"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Play, Pause, PlayCircle, Copy, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskStatus } from "@/types/database";

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}

export function TaskActionsMenu({
  taskId,
  status,
  naturalLanguageInstruction,
  configuration,
}: {
  taskId: string;
  status: TaskStatus;
  naturalLanguageInstruction: string;
  configuration: Record<string, unknown>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMessage);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={status === "archived"}
          onSelect={() => run(() => postJson(`/api/tasks/${taskId}/run`), "Execution started.")}
        >
          <Play className="size-4" /> Run now
        </DropdownMenuItem>
        {status === "active" ? (
          <DropdownMenuItem onSelect={() => run(() => postJson(`/api/tasks/${taskId}/pause`), "Automation paused.")}>
            <Pause className="size-4" /> Pause
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={status === "archived"}
            onSelect={() => run(() => postJson(`/api/tasks/${taskId}/resume`), "Automation activated.")}
          >
            <PlayCircle className="size-4" /> {status === "draft" ? "Activate" : "Resume"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() =>
            run(
              () =>
                postJson("/api/tasks", {
                  natural_language_instruction: naturalLanguageInstruction,
                  plan: { ...configuration, name: `${configuration.name ?? "Automation"} (copy)` },
                }),
              "Automation duplicated.",
            )
          }
        >
          <Copy className="size-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={status === "archived"}
          onSelect={() => run(() => fetch(`/api/tasks/${taskId}`, { method: "DELETE" }), "Automation archived.")}
        >
          <Archive className="size-4" /> Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
