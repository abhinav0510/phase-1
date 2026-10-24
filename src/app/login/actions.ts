"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { landingPathFor } from "@/lib/auth";
import type { UserRole } from "@/lib/types/db";
import { founderEmailForStartup, loginIdToStartupId } from "@/lib/provisioning";
import { isValidEmail } from "@/lib/email/render";

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

/**
 * Map a founder's email to their startup via the contacts mirrored from the
 * Founders Info sheet. Every address belongs to exactly one startup; anything
 * else (unknown or ambiguous) resolves to null.
 */
async function startupIdForEmail(raw: string): Promise<number | null> {
  const email = raw.trim().toLowerCase();
  if (!isValidEmail(email)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("startup_contacts")
    .select("startup_id")
    .eq("email", email)
    .limit(5);
  const ids = Array.from(new Set((data ?? []).map((r) => r.startup_id as number)));
  return ids.length === 1 ? ids[0] : null;
}

export async function signInFounder(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const identifier = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!identifier) return { error: "Enter your email or Login ID." };
  if (!password) return { error: "Password is required." };

  // Same message for an unknown email/ID and a wrong password, so the form
  // can't be used to discover which emails have accounts.
  const invalid = { error: "Invalid email / Login ID or password." };
  const startupId = identifier.includes("@")
    ? await startupIdForEmail(identifier)
    : loginIdToStartupId(identifier);
  if (!startupId) return invalid;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: founderEmailForStartup(startupId),
    password,
  });
  if (error || !data.user) return invalid;
  await finishLogin(data.user.id);
}
