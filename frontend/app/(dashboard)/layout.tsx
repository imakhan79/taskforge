import { requireCurrentOrg } from "@/lib/data/organization";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";

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
