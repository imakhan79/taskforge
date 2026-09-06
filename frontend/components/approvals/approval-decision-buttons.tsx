"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ApprovalDecisionButtons({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  async function decide(action: "approve" | "reject") {
    setPending(action);
    try {
      const res = await fetch(`/api/approvals/${approvalId}/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to record decision.");
      toast.success(action === "approve" ? "Approved." : "Rejected.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => decide("approve")} disabled={pending !== null}>
        {pending === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => decide("reject")} disabled={pending !== null}>
        {pending === "reject" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        Reject
      </Button>
    </div>
  );
}
