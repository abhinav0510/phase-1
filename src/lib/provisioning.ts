// Shared conventions for founder accounts.
// Founders sign in with any email on file for their startup (Founders Info) or
// their LOGIN ID (startup id). Either way it maps to a synthetic Supabase Auth
// email, so the standard email/password Auth flow is used underneath. Initial
// passwords are issued by scripts/reset-founder-passwords.mjs and must be
// changed on first sign-in (app_metadata.must_reset).

export const FOUNDER_EMAIL_DOMAIN = "founders.sidana.local";

export function founderEmailForStartup(startupId: number): string {
  return `s${startupId}@${FOUNDER_EMAIL_DOMAIN}`;
}

export function loginIdToStartupId(loginId: string): number | null {
  const trimmed = loginId.trim().replace(/^S/i, "");
  const n = Number(trimmed);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Phase-1 admin bootstrap password. Read from the environment so it is NEVER
 * committed to source. Set ADMIN_BOOTSTRAP_PASSWORD in `.env.local` (git-ignored).
 * Treated as a temporary bootstrap: admins are forced to change it on first login.
 */
export const ADMIN_BOOTSTRAP_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "";
