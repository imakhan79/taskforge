import "server-only";
import { planSchema, type Plan } from "@/lib/validation/tasks";

const BASE_URL = process.env.AGENT_SERVICE_URL ?? "http://localhost:8000";
const SECRET = process.env.AGENT_SERVICE_SECRET ?? "";

export class AgentServiceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Agent-Service-Secret": SECRET,
      },
      body: JSON.stringify(body),
      // The agent-service is a separate long-running process; never let
      // Next.js cache a call that mutates or triggers execution.
      cache: "no-store",
    });
  } catch {
    throw new AgentServiceError("Agent service is unreachable.", 503);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AgentServiceError(data?.error ?? `Agent service returned ${response.status}`, response.status);
  }
  return data as T;
}

export type ExecuteResponse = { execution_id: string; status: string };

export const agentService = {
  plan: async (input: { instruction: string; organization_id: string }): Promise<{ plan: Plan }> => {
    const data = await call<{ plan: unknown }>("/agent/plan", input);
    const result = planSchema.safeParse(data.plan);
    if (!result.success) {
      throw new AgentServiceError("Agent service returned an invalid plan.", 502);
    }
    return { plan: result.data };
  },
  execute: (input: { task_id: string; organization_id: string; trigger_source: string }) =>
    call<ExecuteResponse>("/agent/execute", input),
  resume: (input: { approval_id: string; decision: "approved" | "rejected"; decided_by: string }) =>
    call<{ execution_id: string; status: string }>("/agent/resume", input),
};
