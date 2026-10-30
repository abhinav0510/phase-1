const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];

/**
 * The production container stops at once without its settings, so a bad release fails its
 * health check and rolls back instead of serving errors. Next.js only logs an error thrown
 * while starting and keeps running, so this has to exit.
 */
export function checkRequiredSettings() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (!missing.length) return;
  console.error(`Missing required settings: ${missing.join(", ")}`);
  if (process.env.REQUIRE_ENV === "1") process.exit(1);
}
