"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireFounder } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { startupTag } from "@/lib/cache-tags";
import { LOGO_BUCKET, LOGO_MAX_BYTES, sniffImage } from "@/lib/branding";

export type LogoResult = { ok: true } | { ok: false; error: string };

const NOT_READY = "Logo uploads aren't switched on yet. Please try again shortly.";

/** Missing table (migration not run yet) or missing bucket. */
function isNotReady(message?: string, code?: string): boolean {
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    /bucket not found|does not exist|could not find the table/i.test(message ?? "")
  );
}

function refresh(startupId: number) {
  revalidateTag(startupTag(startupId));
  revalidatePath("/", "layout");
}

/**
 * Store the founder's company logo. The startup comes from the verified session
 * only; the file is checked by its bytes (PNG/JPEG/WebP) and size before it is
 * written. Writes only startup_branding + the private bucket — never public.startups.
 */
export async function uploadLogo(formData: FormData): Promise<LogoResult> {
  const session = await requireFounder();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  if (file.size > LOGO_MAX_BYTES) return { ok: false, error: "That image is over 2 MB. Please use a smaller file." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "Use a PNG, JPG or WebP image." };

  const admin = createAdminClient();
  const { data: prev, error: readErr } = await admin
    .from("startup_branding")
    .select("logo_path")
    .eq("startup_id", session.startupId)
    .maybeSingle();
  if (readErr) {
    return { ok: false, error: isNotReady(readErr.message, readErr.code) ? NOT_READY : "Could not save the logo. Please try again." };
  }

  const path = `${session.startupId}/logo-${Date.now()}.${kind.ext}`;
  const up = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: "31536000" });
  if (up.error) {
    return { ok: false, error: isNotReady(up.error.message) ? NOT_READY : "Could not upload the logo. Please try again." };
  }

  const { error } = await admin.from("startup_branding").upsert(
    {
      startup_id: session.startupId,
      logo_path: path,
      logo_content_type: kind.mime,
      updated_by: session.authId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "startup_id" },
  );
  if (error) {
    await admin.storage.from(LOGO_BUCKET).remove([path]);
    return { ok: false, error: isNotReady(error.message, error.code) ? NOT_READY : "Could not save the logo. Please try again." };
  }

  const old = (prev as { logo_path: string | null } | null)?.logo_path;
  if (old && old !== path && old.startsWith(`${session.startupId}/`)) {
    await admin.storage.from(LOGO_BUCKET).remove([old]);
  }

  refresh(session.startupId);
  return { ok: true };
}

/** Remove the founder's logo; the portal falls back to their initials. */
export async function removeLogo(): Promise<LogoResult> {
  const session = await requireFounder();
  const admin = createAdminClient();
  const { data, error: readErr } = await admin
    .from("startup_branding")
    .select("logo_path")
    .eq("startup_id", session.startupId)
    .maybeSingle();
  if (readErr) {
    return { ok: false, error: isNotReady(readErr.message, readErr.code) ? NOT_READY : "Could not remove the logo." };
  }
  const path = (data as { logo_path: string | null } | null)?.logo_path;
  if (!path) return { ok: true };

  const { error } = await admin
    .from("startup_branding")
    .update({
      logo_path: null,
      logo_content_type: null,
      updated_by: session.authId,
      updated_at: new Date().toISOString(),
    })
    .eq("startup_id", session.startupId);
  if (error) return { ok: false, error: "Could not remove the logo. Please try again." };

  if (path.startsWith(`${session.startupId}/`)) {
    await admin.storage.from(LOGO_BUCKET).remove([path]);
  }
  refresh(session.startupId);
  return { ok: true };
}
