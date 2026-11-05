import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { MonthRow, YearRow } from "@/server/validators/financials-upload";

/**
 * Figures founders uploaded with the financials template (service role). Every caller
 * passes a startup id it has already verified: the founder's own from the session, or
 * any for requireAdmin().
 */

export interface UploadedFinancials {
  months: MonthRow[];
  years: YearRow[];
  /** False until MIGRATIONS/startup-financials.sql has been run. */
  ready: boolean;
}

const notCreated = (code?: string) => code === "PGRST205" || code === "42P01";

export async function getFinancials(startupId: number): Promise<UploadedFinancials> {
  const admin = createAdminClient();
  const [m, y] = await Promise.all([
    admin
      .from("startup_financial_months")
      .select("month, revenue_inr_l, mrr_inr_l, expenses_inr_l")
      .eq("startup_id", startupId)
      .order("month", { ascending: true }),
    admin
      .from("startup_financial_years")
      .select("fy_start, kind, revenue_inr_l")
      .eq("startup_id", startupId)
      .order("fy_start", { ascending: true }),
  ]);
  if (notCreated(m.error?.code) || notCreated(y.error?.code)) return { months: [], years: [], ready: false };
  if (m.error || y.error) throw new Error(`Could not read financial figures: ${(m.error ?? y.error)?.code || (m.error ?? y.error)?.message}`);
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    months: ((m.data ?? []) as MonthRow[]).map((r) => ({ ...r, revenue_inr_l: n(r.revenue_inr_l), mrr_inr_l: n(r.mrr_inr_l), expenses_inr_l: n(r.expenses_inr_l) })),
    years: ((y.data ?? []) as YearRow[]).map((r) => ({ ...r, fy_start: Number(r.fy_start), revenue_inr_l: Number(r.revenue_inr_l) })),
    ready: true,
  };
}
