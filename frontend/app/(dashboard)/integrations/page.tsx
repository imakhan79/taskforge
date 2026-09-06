import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentOrg } from "@/lib/data/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Integrations" };

const LABELS: Record<string, string> = {
  mock_email: "Realistic mock mailbox — search, read, draft, and send.",
  mock_crm: "Mock CRM — customers, leads, and tickets.",
  mock_spreadsheet: "Mock spreadsheet backend for reading and writing rows.",
  mock_database: "Mock relational tables for query/insert/update.",
  http: "Outbound HTTP with SSRF protection for real external APIs.",
  mock_notification: "In-app notifications and webhook delivery.",
  google_workspace: "Bring your own OAuth app to connect Gmail, Sheets, and Drive.",
  microsoft_365: "Bring your own OAuth app to connect Outlook and Excel.",
  slack_webhook: "Bring your own incoming webhook URL to post to Slack.",
};

export default async function IntegrationsPage() {
  const org = await requireCurrentOrg();
  const supabase = await createClient();
  const { data: integrations } = await supabase
    .from("integrations")
    .select("*")
    .eq("organization_id", org.organizationId)
    .order("status", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Mock integrations are connected by default so automations run end to end today.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(integrations ?? []).map((integration) => (
          <Card key={integration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{integration.name}</CardTitle>
                <Badge
                  className="font-normal capitalize"
                  variant={integration.status === "connected" ? "default" : "outline"}
                >
                  {integration.status}
                </Badge>
              </div>
              <CardDescription>{LABELS[integration.provider] ?? integration.provider}</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {integration.status === "connected"
                ? `Connected ${integration.connected_at ? new Date(integration.connected_at).toLocaleDateString() : ""}`
                : "Not connected"}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
