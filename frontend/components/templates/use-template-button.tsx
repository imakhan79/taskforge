"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UseTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function useTemplate() {
    setIsPending(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create automation from template.");
      toast.success("Automation created from template.");
      router.push(`/tasks/${data.task.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setIsPending(false);
    }
  }

  return (
    <Button size="sm" className="w-full" onClick={useTemplate} disabled={isPending}>
      {isPending && <Loader2 className="size-4 animate-spin" />}
      Use template
    </Button>
  );
}
