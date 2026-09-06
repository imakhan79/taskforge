"use client";

import { useActionState } from "react";
import { updateOrgLimits, type SettingsActionState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const initialState: SettingsActionState = { error: null };

const FIELDS: { key: string; label: string }[] = [
  { key: "max_daily_executions", label: "Max daily executions" },
  { key: "max_execution_duration_seconds", label: "Max execution duration (s)" },
  { key: "max_tool_calls_per_execution", label: "Max tool calls / execution" },
  { key: "max_retries", label: "Max retries" },
  { key: "max_api_calls_per_execution", label: "Max API calls / execution" },
  { key: "max_concurrent_tasks", label: "Max concurrent tasks" },
  { key: "max_ai_budget_usd_daily", label: "Max daily AI budget (USD)" },
];

export function OrgLimitsForm({
  organizationId,
  settings,
  canEdit,
}: {
  organizationId: string;
  settings: Record<string, unknown>;
  canEdit: boolean;
}) {
  const action = updateOrgLimits.bind(null, organizationId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) toast.success("Limits updated.");
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost & action limits</CardTitle>
        <CardDescription>When a limit is reached the agent stops, saves state, logs it, and notifies admins.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                name={field.key}
                type="number"
                min={0}
                defaultValue={String(settings[field.key] ?? 0)}
                disabled={!canEdit}
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label htmlFor="approval_risk_threshold">Approval risk threshold</Label>
            <Select name="approval_risk_threshold" defaultValue={String(settings.approval_risk_threshold ?? "high")} disabled={!canEdit}>
              <SelectTrigger id="approval_risk_threshold"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        {canEdit && (
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save limits
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
