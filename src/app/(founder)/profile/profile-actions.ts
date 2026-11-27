"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireFounder } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { STARTUPS_TAG, startupTag } from "@/server/config/cache-tags";
import { FIELD_BY_KEY, PROFILE_FIELDS, displayValue, isFilled, type Answers } from "@/shared/lib/profile-fields";
import { logActivity } from "@/server/data/activity";
import { writeFounderBack } from "@/server/data/founder-writeback";

export type ProfileSaveResult = { ok: true } | { ok: false; error: string };

const MAX = { text: 200, url: 300, number: 12, textarea: 2000 } as const;

/**
 * Keep only known fields, trimmed and length-capped; selects must be one of the
 * listed options and multis a subset of them. Anything else is dropped, so the
 * stored JSON can only ever contain the keys defined in fields.ts.
 */
function clean(raw: unknown, submit: boolean): { answers: Answers } | { error: string } {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Answers = {};
  for (const f of PROFILE_FIELDS) {
    const v = src[f.key];
    if (v === undefined || v === null) continue;
    if (f.type === "multi") {
      if (!Array.isArray(v)) continue;
      const picked = Array.from(new Set(v.map((x) => String(x)))).filter((x) =>
        (f.options ?? []).includes(x),
      );
      if (picked.length) out[f.key] = picked;
      continue;
    }
    const s = String(v).trim();
    if (!s) continue;
    if (f.type === "select") {
      if (!(f.options ?? []).includes(s)) return { error: `Pick an option for “${f.label}”.` };
      out[f.key] = s;
    } else if (f.type === "number") {
      const n = Number(s.replace(/,/g, ""));
      if (!Number.isFinite(n) || n < 0 || n > 1e9 || s.length > MAX.number) {
        return { error: `“${f.label}” must be a number.` };
      }
      out[f.key] = String(n);
    } else if (f.type === "url") {
      if (s.length > MAX.url || !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(s)) {
        return { error: `“${f.label}” must be a full link starting with https://` };
      }
      out[f.key] = s;
    } else {
      const max = f.type === "textarea" ? MAX.textarea : MAX.text;
      if (s.length > max) return { error: `“${f.label}” is too long (max ${max} characters).` };
      out[f.key] = s;
    }
  }
  if (submit) {
    const missing = PROFILE_FIELDS.find((f) => f.required && !isFilled(out[f.key]));
    if (missing) return { error: `Please fill in “${missing.label}” before submitting.` };
  }
  return { answers: out };
}

/**
 * Save the founder's answers. They are final the moment they're saved: investors
 * and admins see them at once, and the founder-owned values are copied to the
 * Pilot sheet for the agents (decided 26 Nov). `submit` still asks the Sidana
 * team to look it over. Every changed field is logged for admins with its old
 * and new value. The startup comes from the verified session only.
 */
export async function saveProfile(raw: unknown, submit: boolean): Promise<ProfileSaveResult> {
  const session = await requireFounder();
  const parsed = clean(raw, submit);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const now = new Date().toISOString();
  const admin = createAdminClient();
  // Saving a draft must not pull a submission out of the team's review queue: it stays
  // submitted, and the team sees the latest answers.
  const { data: current, error: readErr } = await admin
    .from("startup_profiles")
    .select("status, answers")
    .eq("startup_id", session.startupId)
    .maybeSingle();
  if (readErr && readErr.code !== "PGRST205") return { ok: false, error: "Could not save your profile. Please try again." };
  const stillSubmitted = !submit && (current as { status: string } | null)?.status === "submitted";

  const { error } = await admin.from("startup_profiles").upsert(
    {
      startup_id: session.startupId,
      answers: parsed.answers,
      status: submit || stillSubmitted ? "submitted" : "draft",
      ...(submit ? { submitted_at: now } : {}),
      updated_by: session.authId,
      updated_at: now,
    },
    { onConflict: "startup_id" },
  );
  if (error) {
    return {
      ok: false,
      error:
        error.code === "PGRST205"
          ? "Profile saving isn't switched on yet. Please try again shortly."
          : "Could not save your profile. Please try again.",
    };
  }
  // Change log for admins: which fields changed, old and new (long text shortened).
  const before = ((current as { answers?: Record<string, unknown> } | null)?.answers ?? {}) as Record<string, unknown>;
  const short = (v: unknown) => {
    const t = displayValue(v).trim();
    return t.length > 120 ? `${t.slice(0, 117)}…` : t;
  };
  const changes = [...new Set([...Object.keys(before), ...Object.keys(parsed.answers)])]
    .filter((k) => short(before[k]) !== short(parsed.answers[k]))
    .map((k) => ({ field: k, label: FIELD_BY_KEY[k]?.label ?? k, before: short(before[k]), after: short(parsed.answers[k]) }));
  if (changes.length) {
    await logActivity({
      portal: "founder",
      action: "profile_updated",
      actorUserId: session.authId,
      actorLabel: session.appUser?.full_name ?? null,
      startupId: session.startupId,
      meta: { changes },
    });
    // The agents use the same values: copy the founder's fields to the Pilot sheet.
    writeFounderBack(session.startupId, "profile");
  }

  // Drop this startup's cached reads, and the investors' shared list, so every portal shows the save at once.
  revalidateTag(startupTag(session.startupId));
  revalidateTag(STARTUPS_TAG);
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  revalidatePath("/financials");
  return { ok: true };
}
