import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "@/components/onboarding/create-organization-form";

export const metadata: Metadata = { title: "Create your organization" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && count > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-12">
      <CreateOrganizationForm />
    </div>
  );
}
