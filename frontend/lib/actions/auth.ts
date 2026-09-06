"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string | null; success?: boolean };

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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
