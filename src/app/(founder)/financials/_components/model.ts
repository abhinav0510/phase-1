// Turns uploaded figures into what the Financials page shows. Plain functions (no
// React), so they are unit-tested on their own. Amounts are in ₹ lakh.

export interface Month {
  month: string; // YYYY-MM
  revenue_inr_l: number | null;
  mrr_inr_l: number | null;
  expenses_inr_l: number | null;
}

export interface Year {
  fy_start: number;
  kind: "actual" | "projected";
  revenue_inr_l: number;
}

const NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09" -> "Sep 2026". */
export function monthLabel(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  return `${NAMES[mm - 1]} ${y}`;
}

/** "FY 2025-26". */
export const fyLabel = (start: number) => `FY ${start}-${String(start + 1).slice(2)}`;

export interface LatestMrr {
  value: number;
  month: string;
  /** Change on the month before, as a whole percent; null when it can't be worked out. */
  growthPct: number | null;
  previousMonth: string | null;
}

/** The newest month with an MRR figure, and its change on the previous one that has one. */
export function latestMrr(months: Month[]): LatestMrr | null {
  const withMrr = months.filter((m) => m.mrr_inr_l !== null).sort((a, b) => a.month.localeCompare(b.month));
  const last = withMrr.at(-1);
  if (!last) return null;
  const prev = withMrr.at(-2);
  const growthPct = prev && prev.mrr_inr_l ? Math.round(((last.mrr_inr_l! - prev.mrr_inr_l) / prev.mrr_inr_l) * 100) : null;
  return { value: last.mrr_inr_l!, month: last.month, growthPct, previousMonth: prev?.month ?? null };
}

export interface MonthPoint {
  label: string;
  revenue: number | null;
  expenses: number | null;
}

/** The last `n` months that have revenue or expenses, oldest first, for the chart. */
export function monthlySeries(months: Month[], n = 12): MonthPoint[] {
  return months
    .filter((m) => m.revenue_inr_l !== null || m.expenses_inr_l !== null)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-n)
    .map((m) => ({ label: monthLabel(m.month), revenue: m.revenue_inr_l, expenses: m.expenses_inr_l }));
}

export interface YearRowView {
  fy_start: number;
  label: string;
  kind: "actual" | "projected";
  revenue: number;
  /** Change on the year before, as a whole percent; null for the first year or a zero base. */
  growthPct: number | null;
}

/**
 * Every year to show, oldest first. Uploaded figures come first; the founder's profile
 * answer for last year fills in only when the upload doesn't cover that year.
 */
export function yearRows(years: Year[], profileYear: { fy_start: number; revenue: number } | null): YearRowView[] {
  const all = [...years];
  if (profileYear && !all.some((y) => y.kind === "actual" && y.fy_start === profileYear.fy_start)) {
    all.push({ fy_start: profileYear.fy_start, kind: "actual", revenue_inr_l: profileYear.revenue });
  }
  // A year with an actual figure doesn't also show as projected.
  const actuals = new Set(all.filter((y) => y.kind === "actual").map((y) => y.fy_start));
  const rows = all
    .filter((y) => y.kind === "actual" || !actuals.has(y.fy_start))
    .sort((a, b) => a.fy_start - b.fy_start);
  return rows.map((y, i) => {
    const prev = rows[i - 1];
    const growthPct = prev && prev.revenue_inr_l > 0 ? Math.round(((y.revenue_inr_l - prev.revenue_inr_l) / prev.revenue_inr_l) * 100) : null;
    return { fy_start: y.fy_start, label: fyLabel(y.fy_start), kind: y.kind, revenue: y.revenue_inr_l, growthPct };
  });
}

export interface YearPoint {
  label: string;
  actual: number | null;
  projected: number | null;
}

/** Chart points: projected years draw as a dashed line that starts at the last actual year. */
export function yearSeries(rows: YearRowView[]): YearPoint[] {
  const lastActual = rows.filter((r) => r.kind === "actual").at(-1)?.fy_start;
  const hasProjection = rows.some((r) => r.kind === "projected");
  return rows.map((r) => ({
    label: r.label.replace("FY 20", "FY "),
    actual: r.kind === "actual" ? r.revenue : null,
    projected: r.kind === "projected" || (hasProjection && r.fy_start === lastActual) ? r.revenue : null,
  }));
}
