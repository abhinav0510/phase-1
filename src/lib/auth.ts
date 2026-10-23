import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES, type AppUser, type UserRole } from "@/lib/types/db";

export interface SessionUser {
  authId: string;
  email: string | null;
  appUser: AppUser | null;
  /** True when the account still holds a one-time activation password that must be changed. */
  mustReset: boolean;
}

/**
 * Resolve the authenticated user and their app_users profile.
 * The auth user is verified server-side via Supabase; the profile is read with
 * the service-role client FILTERED BY the verified auth id (never by client input),
 * so it does not depend on app_users RLS being configured for self-reads.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: appUser } = await admin
    .from("app_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    authId: user.id,
    email: user.email ?? null,
    appUser: (appUser as AppUser | null) ?? null,
    // Read from app_metadata, which only the service role can write — a user
    // cannot clear this flag client-side to skip the forced password change.
    // (Legacy user_metadata copies are migrated by scripts/migrate-mustreset.mjs.)
    mustReset: user.app_metadata?.must_reset === true,
  };
}

export function isAdmin(role: UserRole | undefined | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/** Require any authenticated + active user. Redirects to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.appUser && session.appUser.active === false) {
    redirect("/login?error=inactive");
  }
  return session;
}

/** Require an admin/ops role. Redirects founders to their dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireUser();
  if (!isAdmin(session.appUser?.role)) {
    redirect("/dashboard");
  }
  // Force a password change before any admin access while a bootstrap/activation
  // password is still in effect.
  if (session.mustReset) {
    redirect("/force-reset");
  }
  return session;
}

/** Require a founder with a linked startup. Redirects admins to /admin. */
export async function requireFounder(): Promise<SessionUser & { startupId: number }> {
  const session = await requireUser();
  const role = session.appUser?.role;
  if (isAdmin(role)) {
    redirect("/admin");
  }
  // Force a password change before any portal access while the one-time
  // activation password is still in effect.
  if (session.mustReset) {
    redirect("/force-reset");
  }
  const startupId = session.appUser?.startup_id ?? null;
  if (!startupId) {
    redirect("/login?error=no_startup");
  }
  return { ...session, startupId };
}

/** Where to send a user after login, based on their role. */
export function landingPathFor(role: UserRole | undefined | null): string {
  if (isAdmin(role)) return "/admin";
  return "/dashboard";
}
