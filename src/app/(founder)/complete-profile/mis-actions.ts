"use server";

import { revalidatePath } from "next/cache";
import { requireFounder } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { isMisNotReady } from "@/server/data/mis";
import { MIS_BUCKET, MIS_MAX_BYTES, cleanFileName, sniffSpreadsheet } from "@/server/validators/mis";

export type MisResult = { ok: true } | { ok: false; error: string };

const NOT_READY = "MIS uploads aren't switched on yet. Please try again shortly.";

function refresh() {
  revalidatePath("/complete-profile");
}

/**
 * Store a founder's MIS spreadsheet. The startup comes from the verified session only;
 * the file is checked by its bytes (.xlsx or .xls) and size before it is written.
 * Writes only startup_mis_files and the private bucket, never public.startups.
 */
export async function uploadMis(formData: FormData): Promise<MisResult> {
  const session = await requireFounder();
  const file = formData.get("mis");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an Excel file to upload." };
  if (file.size > MIS_MAX_BYTES) return { ok: false, error: "That file is over 3 MB. Please upload a smaller one." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffSpreadsheet(bytes);
  if (!kind) return { ok: false, error: "Upload an Excel file (.xlsx or .xls) without macros." };

  const admin = createAdminClient();
  const path = `${session.startupId}/mis-${Date.now()}.${kind.ext}`;
  const up = await admin.storage.from(MIS_BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (up.error) {
    return { ok: false, error: isMisNotReady(up.error.message) ? NOT_READY : "Could not upload the file. Please try again." };
  }

  const { error } = await admin.from("startup_mis_files").insert({
    startup_id: session.startupId,
    file_path: path,
    file_name: cleanFileName(file.name, kind.ext),
    content_type: kind.mime,
    size_bytes: bytes.length,
    uploaded_by: session.authId,
  });
  if (error) {
    await admin.storage.from(MIS_BUCKET).remove([path]);
    return { ok: false, error: isMisNotReady(error.message, error.code) ? NOT_READY : "Could not save the file. Please try again." };
  }

  refresh();
  return { ok: true };
}

/** Remove one of the founder's own MIS files. */
export async function removeMis(id: number): Promise<MisResult> {
  const session = await requireFounder();
  if (!Number.isInteger(id)) return { ok: false, error: "Could not remove the file." };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("startup_mis_files")
    .delete()
    .eq("id", id)
    .eq("startup_id", session.startupId)
    .select("file_path");
  if (error) return { ok: false, error: "Could not remove the file. Please try again." };

  const paths = ((data ?? []) as { file_path: string }[])
    .map((r) => r.file_path)
    .filter((p) => p.startsWith(`${session.startupId}/`));
  if (paths.length) await admin.storage.from(MIS_BUCKET).remove(paths);
  refresh();
  return { ok: true };
}
