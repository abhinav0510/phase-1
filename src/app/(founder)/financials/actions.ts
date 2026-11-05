"use server";

import { requireFounder } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { isMisNotReady } from "@/server/data/mis";
import { parseFinancialsWorkbook, parseMonthEntry } from "@/server/validators/financials-upload";
import { MIS_BUCKET, MIS_MAX_BYTES, cleanFileName, sniffSpreadsheet } from "@/server/validators/mis";

export type FinancialsUploadResult =
  | { ok: true; months: number; years: number }
  | { ok: false; errors: string[] };

const NOT_READY = "Financial uploads aren't switched on yet. Please try again shortly.";
const fail = (...errors: string[]): FinancialsUploadResult => ({ ok: false, errors });

/**
 * Read a founder's filled-in financials template, check every row, and save the figures.
 * The startup comes from the verified session only. A new upload replaces that startup's
 * figures; the file is kept beside their MIS uploads so the team can download it.
 * Never writes public.startups or the Pilot sheet.
 */
export async function uploadFinancials(formData: FormData): Promise<FinancialsUploadResult> {
  const session = await requireFounder();
  const file = formData.get("financials");
  if (!(file instanceof File) || file.size === 0) return fail("Choose the filled-in template to upload.");
  if (file.size > MIS_MAX_BYTES) return fail("That file is over 3 MB. Please upload a smaller one.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffSpreadsheet(bytes);
  if (kind?.ext !== "xlsx") return fail("Upload the template as an Excel file (.xlsx), without macros.");
  const parsed = parseFinancialsWorkbook(bytes);
  if (!parsed.ok) return parsed;

  const admin = createAdminClient();
  const id = session.startupId;
  const now = new Date().toISOString();

  // Save the new figures first, then remove any the new file no longer has, so a
  // failed upload never leaves the founder with nothing.
  if (parsed.months.length) {
    const { error } = await admin
      .from("startup_financial_months")
      .upsert(parsed.months.map((m) => ({ ...m, startup_id: id, updated_at: now })), { onConflict: "startup_id,month" });
    if (error) return fail(isMisNotReady(error.message, error.code) ? NOT_READY : "Could not save your figures. Please try again.");
  }
  if (parsed.years.length) {
    const { error } = await admin
      .from("startup_financial_years")
      .upsert(parsed.years.map((y) => ({ ...y, startup_id: id, updated_at: now })), { onConflict: "startup_id,fy_start,kind" });
    if (error) return fail(isMisNotReady(error.message, error.code) ? NOT_READY : "Could not save your figures. Please try again.");
  }
  const staleMonths = admin.from("startup_financial_months").delete().eq("startup_id", id);
  const { error: delM } = parsed.months.length
    ? await staleMonths.not("month", "in", `(${parsed.months.map((m) => `"${m.month}"`).join(",")})`)
    : await staleMonths;
  const { data: oldYears, error: readY } = await admin.from("startup_financial_years").select("fy_start, kind").eq("startup_id", id);
  if (delM || readY) {
    const code = (delM ?? readY)?.code;
    return fail(code === "PGRST205" || code === "42P01" ? NOT_READY : "Could not save your figures. Please try again.");
  }
  const keep = new Set(parsed.years.map((y) => `${y.fy_start}:${y.kind}`));
  for (const y of (oldYears ?? []) as { fy_start: number; kind: string }[]) {
    if (!keep.has(`${y.fy_start}:${y.kind}`)) {
      await admin.from("startup_financial_years").delete().eq("startup_id", id).eq("fy_start", y.fy_start).eq("kind", y.kind);
    }
  }

  // Keep the file for the team. The figures are already saved, so a storage problem
  // here doesn't fail the upload.
  const path = `${id}/financials-${Date.now()}.xlsx`;
  const up = await admin.storage.from(MIS_BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (!up.error) {
    const { error } = await admin.from("startup_mis_files").insert({
      startup_id: id,
      file_path: path,
      file_name: cleanFileName(file.name || "Financials template", "xlsx"),
      content_type: kind.mime,
      size_bytes: bytes.length,
      uploaded_by: session.authId,
    });
    if (error) await admin.storage.from(MIS_BUCKET).remove([path]);
  }

  // No revalidatePath: the upload card reloads the page, and every founder page is dynamic.
  return { ok: true, months: parsed.months.length, years: parsed.years.length };
}

export type MonthlyFiguresResult = { ok: true } | { ok: false; errors: string[] };

/**
 * Save the figures typed into the monthly prompt: one month, and a closed year's total
 * when it was asked for. Only those rows change; every other month and year stays.
 * The startup comes from the verified session only. Never writes public.startups.
 */
export async function saveMonthlyFigures(formData: FormData): Promise<MonthlyFiguresResult> {
  const session = await requireFounder();
  const field = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.slice(0, 40) : undefined;
  };
  const entry = parseMonthEntry({
    month: field("month"),
    revenue: field("revenue"),
    mrr: field("mrr"),
    expenses: field("expenses"),
    fy: field("fy"),
    fyRevenue: field("fyRevenue"),
  });
  if (!entry.ok) return entry;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const saveFailed = (code?: string, message?: string): MonthlyFiguresResult => ({
    ok: false,
    errors: [isMisNotReady(message ?? "", code) ? NOT_READY : "Could not save your figures. Please try again."],
  });
  if (entry.month) {
    const { error } = await admin
      .from("startup_financial_months")
      .upsert({ ...entry.month, startup_id: session.startupId, updated_at: now }, { onConflict: "startup_id,month" });
    if (error) return saveFailed(error.code, error.message);
  }
  if (entry.year) {
    const { error } = await admin
      .from("startup_financial_years")
      .upsert({ ...entry.year, startup_id: session.startupId, updated_at: now }, { onConflict: "startup_id,fy_start,kind" });
    if (error) return saveFailed(error.code, error.message);
  }
  return { ok: true };
}
