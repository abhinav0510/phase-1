import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES RLS. Server-only.
 * The `server-only` import makes the build fail if this is ever pulled into a
 * client bundle. Use only for:
 *   - trusted aggregations the admin panel needs across all startups/investors
 *   - account provisioning via the Auth Admin API
 * Always re-check authorization in the calling code; this client does not.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
