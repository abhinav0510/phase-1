"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ResetResult = { ok: true } | { ok: false; error: string };

/**
 * Complete the forced first-login password change.
 *
 * The password is set AND the must_reset flag is cleared server-side with the
 * service-role client, acting on the id of the *currently authenticated*
 * session (never a client-supplied id). The flag lives in app_metadata, which
 * the user cannot write themselves, so the gate cannot be bypassed from the
 * browser — it is only ever lifted here, after a real password change.
 */
export async function completeForcedReset(
  password: string,
): Promise<ResetResult> {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "Use at least 8 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Your session has expired. Please sign in again." };
  }

  const admin = createAdminClient();
  // Merge rather than replace, and strip any legacy user_metadata copy.
  const { data: got } = await admin.auth.admin.getUserById(user.id);
  const appMeta = { ...(got?.user?.app_metadata ?? {}), must_reset: false };
  const userMeta = { ...(got?.user?.user_metadata ?? {}) };
  delete (userMeta as Record<string, unknown>).must_reset;

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password,
    app_metadata: appMeta,
    user_metadata: userMeta,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
