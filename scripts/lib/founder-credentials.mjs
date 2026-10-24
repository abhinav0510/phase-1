// Shared founder-login conventions for the provisioning/reset scripts.

export const FOUNDER_EMAIL_DOMAIN = "founders.sidana.local";

/** Internal Supabase Auth email for a startup's founder login (never shown to founders). */
export const founderAuthEmail = (startupId) => `s${startupId}@${FOUNDER_EMAIL_DOMAIN}`;

/**
 * Initial founder password: the company name with only letters and numbers
 * (capitals kept), a hyphen, then the startup id — e.g. "Body & Beyond" #1 →
 * "BodyBeyond-1". It is a one-time password: every founder must set their own
 * on first sign-in (app_metadata.must_reset), enforced by the app.
 */
export function initialFounderPassword(startupId, startupName) {
  const base = String(startupName ?? "").replace(/[^A-Za-z0-9]/g, "") || "Startup";
  return `${base}-${startupId}`;
}
