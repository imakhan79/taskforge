"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiskBadge } from "@/components/dashboard/status-badge";
import type { Plan } from "@/lib/validation/tasks";

const EXAMPLE =
  "Every weekday at 9 AM, check new customer support emails, classify them, create tickets for complaints, and notify me about urgent issues.";

type Phase = "input" | "reviewing";

export function TaskBuilder() {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  async function generate() {
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ natural_language_instruction: instruction, dry_run: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate a plan.");
      setPlan(data.plan);
      setPhase("reviewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate a plan.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function activate() {
    if (!plan) return;
    setError(null);
    setIsActivating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ natural_language_instruction: instruction, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create the automation.");
      toast.success("Automation created.");
      router.push(`/tasks/${data.task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create the automation.");
    } finally {
      setIsActivating(false);
    }
  }

  if (phase === "reviewing" && plan) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">AI generated plan</p>
          <h1 className="text-2xl font-semibold tracking-tight">{plan.name}</h1>
          <p className="mt-1 text-muted-foreground">{plan.objective}</p>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Overview</CardTitle>
              <CardDescription>
                Trigger: {plan.trigger.type}
                {plan.trigger.schedule ? ` · ${plan.trigger.schedule}` : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge risk={plan.risk_level} />
              {plan.requires_approval && (
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Requires approval</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {plan.steps.map((step) => (
              <div key={step.order} className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">
                    {step.order}. {step.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tool: <code className="font-mono">{step.tool_name}</code>
                  </p>
                </div>
                <RiskBadge risk={step.risk_level} />
              </div>
            ))}
            {plan.verification.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Verification: {plan.verification.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t create automation</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button onClick={activate} disabled={isActivating}>
            {isActivating && <Loader2 className="size-4 animate-spin" />}
            Activate automation <ArrowRight className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setPhase("input")} disabled={isActivating}>
            <RotateCcw className="size-4" /> Start over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">What do you want to automate?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe the repetitive work in plain language. TaskForge will plan it for your review.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={EXAMPLE}
            rows={5}
            className="resize-none"
          />
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t generate a plan</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={generate} disabled={instruction.trim().length < 10 || isGenerating} className="w-full">
            {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate automation
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Prefer a starting point? <Link href="/templates" className="font-medium text-foreground hover:underline">Browse templates</Link>
      </p>
    </div>
  );
}
