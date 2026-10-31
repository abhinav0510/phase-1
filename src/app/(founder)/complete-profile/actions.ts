"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireFounder } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { startupTag } from "@/server/config/cache-tags";
import { PROFILE_FIELDS, isFilled, type Answers } from "@/shared/lib/profile-fields";

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
 * Save the founder's answers. `submit` sends them to the Sidana team for review;
 * otherwise they are kept as a draft. The startup comes from the verified
 * session only. public.startups and the Pilot sheet are never written here.
 */
export async function saveProfile(raw: unknown, submit: boolean): Promise<ProfileSaveResult> {
  const session = await requireFounder();
  const parsed = clean(raw, submit);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin.from("startup_profiles").upsert(
    {
      startup_id: session.startupId,
      answers: parsed.answers,
      status: submit ? "submitted" : "draft",
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
  // Drop this startup's cached reads so the founder sees their own save at once.
  revalidateTag(startupTag(session.startupId));
  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  revalidatePath("/financials");
  return { ok: true };
}
