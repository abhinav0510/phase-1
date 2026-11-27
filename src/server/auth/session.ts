import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/server/integrations/supabase/server";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { ADMIN_ROLES, type AppUser, type UserRole } from "@/shared/types/db";

export interface SessionUser {
  authId: string;
  email: string | null;
  appUser: AppUser | null;
  /** True when the account still holds a one-time activation password that must be changed. */
  mustReset: boolean;
}

/**
 * Resolve the authenticated user and their app_users profile.
 * Wrapped in React.cache so layout + page share one call per request.
 */
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: appUser, error } = await admin
    .from("app_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  // A failed read must not look like "this person has no role".
  if (error) throw new Error(`Could not read app_users: ${error.code || error.message}`);

  return {
    authId: user.id,
    email: user.email ?? null,
    appUser: (appUser as AppUser | null) ?? null,
    mustReset: user.app_metadata?.must_reset === true,
  };
});

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
  // Investors have their own portal.
  if (role === "investor") {
    redirect(INVESTOR_HOME);
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
  if (role === "investor") return INVESTOR_HOME;
  return "/dashboard";
}

export const INVESTOR_HOME = "/investor/matches";
export const INVESTOR_LOGIN = "/investor/login";

/** True while the investor's portal access is granted and not revoked. */
export const hasPortalAccess = cache(async function hasPortalAccess(investorId: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("investor_portal_access")
    .select("investor_id")
    .eq("investor_id", investorId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read investor_portal_access: ${error.code || error.message}`);
  return !!data;
});

/**
 * Require a signed-in investor whose access is still open. Founders and admins
 * are sent to their own portals; anyone else back to the investor sign-in.
 * Access is re-checked on every request, so a revoke takes effect at once.
 */
export async function requireInvestor(): Promise<SessionUser & { investorId: number }> {
  const session = await getSessionUser();
  if (!session) redirect(INVESTOR_LOGIN);
  const role = session.appUser?.role;
  if (isAdmin(role)) redirect("/admin");
  if (role === "founder") redirect("/dashboard");
  if (session.appUser?.active === false) redirect(`${INVESTOR_LOGIN}?error=inactive`);
  const investorId = role === "investor" ? session.appUser?.investor_id ?? null : null;
  if (!investorId) redirect(`${INVESTOR_LOGIN}?error=not_on_list`);
  if (!(await hasPortalAccess(investorId))) redirect(`${INVESTOR_LOGIN}?error=no_access`);
  return { ...session, investorId };
}
