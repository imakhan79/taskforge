import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Only import this in code that must legitimately act outside a user's own
 * permissions: the org-bootstrap step before a user has a role, writing to
 * tables RLS deliberately blocks for the `authenticated` role (executions,
 * execution_events, memories, audit_logs, integration_credentials,
 * agent_metrics), and the agent-service-to-Next.js webhook receivers.
 *
 * The `server-only` import makes bundling this into a Client Component a
 * build-time error instead of a runtime secret leak.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
