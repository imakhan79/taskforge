"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OrgActionState = { error: string | null };

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "org"}-${suffix}`;
}

export async function createOrganization(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Organization name is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
    org_slug: slugify(name),
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
