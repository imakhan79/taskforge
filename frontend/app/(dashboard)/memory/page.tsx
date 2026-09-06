import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";

export const metadata: Metadata = { title: "Memory" };

export default async function MemoryPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();
  const { data: memories } = await supabase
    .from("memories")
    .select("*")
    .eq("organization_id", org.organizationId)
    .order("updated_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Memory</h1>
        <p className="text-sm text-muted-foreground">
          What the agent has learned about your organization, tasks, and past runs. Never contains secrets.
        </p>
      </div>

      {!memories || memories.length === 0 ? (
        <EmptyState
          title="No memory yet"
          description="As automations run, the agent records organization preferences, per-task context, and operational patterns here."
        />
      ) : (
        <div className="rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memories.map((memory) => (
                <TableRow key={memory.id}>
                  <TableCell><Badge variant="outline" className="capitalize">{memory.scope.replaceAll("_", " ")}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{memory.key}</TableCell>
                  <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                    {JSON.stringify(memory.value)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(memory.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
