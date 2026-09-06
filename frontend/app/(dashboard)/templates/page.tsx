import type { Metadata } from "next";
import {
  Inbox, FileText, Users, BarChart, FolderTree, Folder, Shuffle, Headphones,
  UserCheck, Bell, Package, ScanText, Presentation, ShieldCheck, Activity, Sparkles,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UseTemplateButton } from "@/components/templates/use-template-button";

export const metadata: Metadata = { title: "Templates" };

const ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  "file-text": FileText,
  users: Users,
  "bar-chart": BarChart,
  "folder-tree": FolderTree,
  folder: Folder,
  shuffle: Shuffle,
  headset: Headphones,
  "user-check": UserCheck,
  bell: Bell,
  package: Package,
  "scan-text": ScanText,
  presentation: Presentation,
  "shield-check": ShieldCheck,
  activity: Activity,
};

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: templates } = await supabase.from("task_templates").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <p className="text-sm text-muted-foreground">Start from a ready-made automation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(templates ?? []).map((template) => {
          const Icon = ICONS[template.icon] ?? Sparkles;
          return (
            <Card key={template.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <Badge variant="outline" className="capitalize">{template.category}</Badge>
                </div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                {template.is_executable ? (
                  <UseTemplateButton templateId={template.id} />
                ) : (
                  <Badge variant="secondary" className="w-full justify-center py-1.5 font-normal">
                    Coming soon
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
