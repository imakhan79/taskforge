"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime for the given tables (scoped to the
 * caller's organization via the row's own organization_id, so RLS on the
 * underlying tables is what actually gates what this can see) and calls
 * router.refresh() when anything changes, so Server Component data stays
 * live without a manual reload. Renders nothing.
 */
export function RealtimeRefresher({
  organizationId,
  tables,
}: {
  organizationId: string;
  tables: string[];
}) {
  const router = useRouter();
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`realtime:${organizationId}:${tables.join(",")}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${organizationId}` },
        () => {
          // Debounce bursts of events (e.g. many execution_events in a row)
          // into a single refresh.
          if (timeout.current) clearTimeout(timeout.current);
          timeout.current = setTimeout(() => router.refresh(), 400);
        },
      );
    }

    channel.subscribe();

    return () => {
      if (timeout.current) clearTimeout(timeout.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, tables.join(",")]);

  return null;
}
