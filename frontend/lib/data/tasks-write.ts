import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Plan } from "@/lib/validation/tasks";
import { scheduleToCron } from "@/lib/scheduling/cron";

type Client = SupabaseClient<Database>;

/**
 * Persists a reviewed plan as a task + ordered task_steps, and (for
 * schedule-triggered tasks) a task_triggers + schedules row. Runs through
 * the caller's own session client so RLS still governs who may create
 * tasks — this only removes the duplication between the NL-planner path
 * and the template path, which both end up with the same shaped Plan.
 */
export async function createTaskFromPlan(
  supabase: Client,
  params: {
    organizationId: string;
    userId: string;
    naturalLanguageInstruction: string;
    plan: Plan;
  },
) {
  const { organizationId, userId, naturalLanguageInstruction, plan } = params;

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      organization_id: organizationId,
      name: plan.name,
      description: plan.objective,
      natural_language_instruction: naturalLanguageInstruction,
      status: "draft",
      risk_level: plan.risk_level,
      trigger_type: plan.trigger.type,
      schedule: plan.trigger.schedule ?? null,
      configuration: plan,
      requires_approval: plan.requires_approval,
      created_by: userId,
    })
    .select()
    .single();

  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Failed to create task.");
  }

  const sortedSteps = [...plan.steps].sort((a, b) => a.order - b.order);
  const stepRows = sortedSteps.map((step, index) => ({
    task_id: task.id,
    step_order: step.order,
    name: step.name,
    description: step.description ?? null,
    step_type: "tool_call",
    tool_name: step.tool_name,
    configuration: step.configuration,
    risk_level: step.risk_level,
    requires_approval: step.requires_approval,
    verification_rules: index === sortedSteps.length - 1 ? plan.verification : [],
  }));

  const { error: stepsError } = await supabase.from("task_steps").insert(stepRows);
  if (stepsError) {
    throw new Error(stepsError.message);
  }

  if (plan.trigger.type === "schedule") {
    const cron = scheduleToCron(plan.trigger.schedule);
    if (cron) {
      await supabase.from("task_triggers").insert({
        task_id: task.id,
        organization_id: organizationId,
        trigger_type: "schedule",
        schedule_expression: cron,
        is_active: true,
      });
      await supabase.from("schedules").insert({
        task_id: task.id,
        organization_id: organizationId,
        cron_expression: cron,
        is_active: true,
      });
    }
  }

  return task;
}
