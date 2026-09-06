"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Workflow,
  PlayCircle,
  ShieldCheck,
  LayoutTemplate,
  Wrench,
  Plug,
  Brain,
  BarChart3,
  ScrollText,
  Settings,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "AI Automations", icon: Workflow },
  { href: "/executions", label: "Executions", icon: PlayCircle },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5 font-semibold tracking-tight">
        <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Bot className="size-4" />
        </span>
        TaskForge
      </div>
      <div className="border-b border-sidebar-border px-5 py-3 text-xs text-muted-foreground">
        <p className="truncate font-medium text-sidebar-foreground">{organizationName}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
