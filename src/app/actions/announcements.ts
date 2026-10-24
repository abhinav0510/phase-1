"use server";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mark announcements as seen for the signed-in user (founder or team). The user
 * id comes from the verified session, never from the client, so a user can only
 * ever dismiss for themselves.
 */
export async function dismissAnnouncements(ids: number[]): Promise<{ ok: boolean }> {
  const session = await getSessionUser();
  if (!session) return { ok: false };
  const clean = Array.from(
    new Set((Array.isArray(ids) ? ids : []).filter((n) => Number.isInteger(n) && n > 0)),
  ).slice(0, 50);
  if (!clean.length) return { ok: true };

  const admin = createAdminClient();
  const { error } = await admin.from("announcement_dismissals").upsert(
    clean.map((id) => ({ announcement_id: id, user_id: session.authId })),
    { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
  );
  return { ok: !error };
}
