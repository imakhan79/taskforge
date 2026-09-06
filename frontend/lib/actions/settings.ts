"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/database";

export type SettingsActionState = { error: string | null; success?: boolean };

export async function updateOrgLimits(
  organizationId: string,
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const num = (key: string) => Number(formData.get(key) ?? 0);

  const settings = {
    max_daily_executions: num("max_daily_executions"),
    max_execution_duration_seconds: num("max_execution_duration_seconds"),
    max_tool_calls_per_execution: num("max_tool_calls_per_execution"),
    max_retries: num("max_retries"),
    max_api_calls_per_execution: num("max_api_calls_per_execution"),
    max_concurrent_tasks: num("max_concurrent_tasks"),
    max_ai_budget_usd_daily: num("max_ai_budget_usd_daily"),
    approval_risk_threshold: String(formData.get("approval_risk_threshold") ?? "high"),
  };

  const { error } = await supabase.from("organizations").update({ settings }).eq("id", organizationId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function updateMemberRole(formData: FormData): Promise<SettingsActionState> {
  const supabase = await createClient();
  const memberId = String(formData.get("member_id") ?? "");
  const role = String(formData.get("role") ?? "") as OrgRole;

  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null, success: true };
}

export async function updateProfile(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const [{ error: authError }, { error: profileError }] = await Promise.all([
    supabase.auth.updateUser({ data: { full_name: fullName } }),
    supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id),
  ]);

  if (authError || profileError) return { error: (authError ?? profileError)?.message ?? "Update failed." };

  revalidatePath("/settings/profile");
  return { error: null, success: true };
}
