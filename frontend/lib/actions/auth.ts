"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthActionState = { error: string | null; success?: boolean };

// Public, intentionally-shared credentials for the one-click demo account —
// not a secret. The demo org holds no real data (mock integrations only).
const DEMO_EMAIL = "demo@taskforge.dev";
const DEMO_PASSWORD = "TaskForge-Demo-2026!";

function requireString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = requireString(formData, "email");
  const password = requireString(formData, "password");
  const next = requireString(formData, "next") || "/dashboard";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(next);
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = requireString(formData, "fullName");
  const email = requireString(formData, "email");
  const password = requireString(formData, "password");

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/onboarding");
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = requireString(formData, "email");
  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null, success: true };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = requireString(formData, "password");
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function loginAsDemo(): Promise<AuthActionState> {
  const supabase = await createClient();

  const attempt = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });

  if (attempt.error) {
    // First run: the demo account doesn't exist yet — create it with the
    // service-role client (admin API), then sign in normally.
    let admin: ReturnType<typeof createAdminClient>;
    try {
      admin = createAdminClient();
    } catch {
      return { error: "Demo login isn't configured yet: SUPABASE_SERVICE_ROLE_KEY is missing on the server." };
    }
    const { error: createError } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Demo User" },
    });
    if (createError && !createError.message.toLowerCase().includes("already been registered")) {
      return { error: `Could not create demo account: ${createError.message}` };
    }

    const retry = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (retry.error) {
      return { error: retry.error.message };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Demo sign-in failed unexpectedly." };
  }

  const { count } = await supabase
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!count || count === 0) {
    const { error: orgError } = await supabase.rpc("create_organization", {
      org_name: "TaskForge Demo",
      org_slug: `taskforge-demo-${user.id.slice(0, 8)}`,
    });
    if (orgError) {
      return { error: `Could not set up the demo organization: ${orgError.message}` };
    }
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
