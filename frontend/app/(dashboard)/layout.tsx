import { requireCurrentOrg } from "@/lib/data/organization";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";

// Every page under this layout is session-gated and reads live data —
// never statically prerender any of them (also works around a Next 16.3.4
// Turbopack static-generation-worker bug seen on this build: an
// "Expected workStore to be initialized" invariant intermittently hit
// individual leaf pages under this dynamic layout).
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const org = await requireCurrentOrg();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar organizationName={org.organizationName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar userFullName={org.userFullName} userEmail={org.userEmail} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
