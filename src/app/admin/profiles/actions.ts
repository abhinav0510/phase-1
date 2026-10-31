"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { startupTag } from "@/server/config/cache-tags";

export type ReviewResult = { ok: true } | { ok: false; error: string };

const ReviewSchema = z.object({
  startupId: z.number().int().positive(),
  decision: z.enum(["approve", "changes"]),
  note: z.string().trim().max(1000, "Note is too long.").optional().default(""),
});

/**
 * Approve a founder's submitted profile (it becomes the approved copy used for
 * matching) or send it back with a note. Only the startup_profiles row changes;
 * public.startups and the Pilot sheet are not written.
 */
export async function reviewProfile(raw: unknown): Promise<ReviewResult> {
  const session = await requireAdmin();
  const parsed = ReviewSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid review." };
  const { startupId, decision, note } = parsed.data;
  if (decision === "changes" && note.length < 3) {
    return { ok: false, error: "Tell the founder what to change." };
  }

  const admin = createAdminClient();
  const { data: current, error: readErr } = await admin
    .from("startup_profiles")
    .select("answers,status")
    .eq("startup_id", startupId)
    .maybeSingle();
  if (readErr || !current) return { ok: false, error: "Profile not found." };

  const now = new Date().toISOString();
  const patch =
    decision === "approve"
      ? { status: "approved", approved_answers: current.answers, review_note: note || null }
      : { status: "changes_requested", review_note: note };
  const { error } = await admin
    .from("startup_profiles")
    .update({
      ...patch,
      reviewed_at: now,
      reviewed_by: session.authId,
      reviewed_by_email: session.email,
    })
    .eq("startup_id", startupId);
  if (error) return { ok: false, error: error.message };

  // The review changes what the founder sees (status, note) — drop their cache.
  revalidateTag(startupTag(startupId));
  revalidatePath("/admin/profiles");
  revalidatePath(`/admin/profiles/${startupId}`);
  return { ok: true };
}
