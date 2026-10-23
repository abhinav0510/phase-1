// Shared conventions for founder account provisioning.
// Founders sign in with a LOGIN ID (their startup id) rather than an email;
// internally that maps to a synthetic Supabase Auth email so we can use the
// standard email/password Auth flow.

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
 * Deterministic ACTIVATION password for a founder's first login.
 * NOTE: this value is intentionally simple for rollout and is GUESSABLE.
 * It must be treated as a one-time code: founders are forced to change it on
 * first login (see `must_reset` handling). Do NOT rely on it as a durable secret.
 *
 * Formula: SID-<startupId>-<first 4 of slugified name>, uppercased.
 */
export function activationPassword(startupId: number, startupName: string | null): string {
  const slug = (startupName ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  return `SID-${startupId}-${slug}`;
}

export const ADMIN_BOOTSTRAP_PASSWORD = "Sidana2026";
