import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/dashboard/status-badge";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage() {
  const supabase = await createClient();
  const { data: tools } = await supabase.from("tool_definitions").select("*").order("category");

  const byCategory = new Map<string, typeof tools>();
  for (const tool of tools ?? []) {
    const list = byCategory.get(tool.category) ?? [];
    list.push(tool);
    byCategory.set(tool.category, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-sm text-muted-foreground">
          Every action an automation can take. Adding a new tool never requires rewriting the core agent.
        </p>
      </div>

      {[...byCategory.entries()].map(([category, categoryTools]) => (
        <div key={category}>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">{category}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categoryTools?.map((tool) => (
              <Card key={tool.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-mono text-sm">{tool.name}</CardTitle>
                    <RiskBadge risk={tool.risk_level} />
                  </div>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-1.5">
                  {tool.is_mock && <Badge variant="secondary" className="font-normal">Mock</Badge>}
                  {tool.required_permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="font-mono text-xs font-normal">
                      {perm}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
