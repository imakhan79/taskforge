import type { Metadata } from "next";
import { requireCurrentOrg } from "@/lib/data/organization";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const org = await requireCurrentOrg();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">{org.userEmail}</p>
      </div>
      <ProfileForm fullName={org.userFullName ?? ""} />
    </div>
  );
}
