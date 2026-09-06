import { z } from "zod";

export const planStepSchema = z.object({
  order: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  action: z.string().min(1),
  tool_name: z.string().min(1),
  configuration: z.record(z.string(), z.unknown()).default({}),
  risk_level: z.enum(["low", "medium", "high", "critical"]).default("low"),
  requires_approval: z.boolean().default(false),
});

export const planSchema = z.object({
  name: z.string().min(1),
  objective: z.string().min(1),
  trigger: z.object({
    type: z.enum(["manual", "schedule", "webhook", "event"]),
    schedule: z.string().nullable().optional(),
  }),
  steps: z.array(planStepSchema).min(1),
  risk_level: z.enum(["low", "medium", "high", "critical"]),
  requires_approval: z.boolean(),
  verification: z.array(z.string()).default([]),
});

export type Plan = z.infer<typeof planSchema>;

export const createTaskRequestSchema = z.union([
  // 1. Ask the AI planner for a structured plan. `dry_run: true` returns it
  //    for review without creating anything.
  z.object({
    natural_language_instruction: z.string().min(10, "Describe the task in a bit more detail."),
    dry_run: z.boolean().optional(),
    name: z.string().optional(),
  }),
  // 2. Create a task directly from an already-produced (and possibly
  //    user-edited) plan — used by the "Activate" step after review.
  z.object({
    natural_language_instruction: z.string().min(1),
    plan: planSchema,
  }),
  // 3. Create a task directly from a template's default_configuration.
  z.object({
    template_id: z.string().uuid(),
  }),
]);
