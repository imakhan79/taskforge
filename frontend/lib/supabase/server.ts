import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Server Component / Route Handler client. Runs with the caller's own
 * session (anon key + user JWT), so every query is subject to RLS — this is
 * the client used for all normal reads/writes (tasks, agents, approvals,
 * notifications, etc). Never use the service-role client for anything a
 * user's own permissions should already cover.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no response to write to;
            // the proxy (proxy.ts) refreshes the session cookie instead.
          }
        },
      },
    },
  );
}
