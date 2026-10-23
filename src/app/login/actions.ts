"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { landingPathFor } from "@/lib/auth";
import type { UserRole } from "@/lib/types/db";
import { founderEmailForStartup, loginIdToStartupId } from "@/lib/provisioning";

type LoginResult = { error: string } | void;

async function finishLogin(authId: string): Promise<never> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_users")
    .select("role")
    .eq("id", authId)
    .maybeSingle();
  redirect(landingPathFor((data?.role as UserRole | undefined) ?? "founder"));
}

export async function signInTeam(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }
  await finishLogin(data.user.id);
}

export async function signInFounder(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const loginId = String(formData.get("loginId") ?? "");
  const password = String(formData.get("password") ?? "");
  const startupId = loginIdToStartupId(loginId);
  if (!startupId) return { error: "Enter a valid Login ID." };
  if (!password) return { error: "Password is required." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: founderEmailForStartup(startupId),
    password,
  });
  if (error || !data.user) {
    return { error: "Invalid Login ID or password." };
  }
  await finishLogin(data.user.id);
}
