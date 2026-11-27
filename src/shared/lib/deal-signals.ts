import { sectorLabel, stageLabel } from "@/shared/lib/sector-taxonomy";
import type { PassReason, TriggerMetric } from "@/shared/types/db";

/**
 * Passing on a deal and revisit triggers. Pure, shared by the pass dialog, the
 * server actions and the unit tests. None of this is ever shown to founders.
 */

export const PASS_REASONS: { key: PassReason; label: string }[] = [
  { key: "sector", label: "Sector isn't a fit" },
  { key: "stage", label: "Wrong stage for us" },
  { key: "traction", label: "Too early on traction" },
  { key: "cheque", label: "Round or cheque size doesn't fit" },
  { key: "valuation", label: "Valuation" },
  { key: "team", label: "Team" },
  { key: "market", label: "Market size or competition" },
  { key: "conflict", label: "Conflicts with a portfolio company" },
  { key: "other", label: "Something else" },
];

export const PASS_REASON_LABEL = Object.fromEntries(PASS_REASONS.map((r) => [r.key, r.label])) as Record<PassReason, string>;

export const TRIGGER_METRICS: { key: TriggerMetric; label: string; unit: string; help: string }[] = [
  { key: "mrr_l", label: "Monthly revenue reaches", unit: "₹ lakh / month", help: "From the monthly figures the founder uploads." },
  { key: "arr_cr", label: "Annual revenue (ARR) reaches", unit: "₹ Cr", help: "The annual run-rate on Sidana's record." },
  { key: "growth_pct", label: "Monthly growth reaches", unit: "% a month", help: "Average month-on-month revenue growth over the last 3 months." },
];

export const TRIGGER_LABEL = Object.fromEntries(TRIGGER_METRICS.map((m) => [m.key, m])) as Record<TriggerMetric, (typeof TRIGGER_METRICS)[number]>;

export interface MonthFigure {
  month: string; // YYYY-MM
  revenue_inr_l: number | null;
  mrr_inr_l: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** The startup's current value for a trigger metric, or null when there isn't enough data. */
export function metricValue(metric: TriggerMetric, months: MonthFigure[], arrInrL: number | null | undefined): number | null {
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  const monthly = sorted.map((m) => m.mrr_inr_l ?? m.revenue_inr_l).filter((v): v is number => v != null && Number.isFinite(Number(v))).map(Number);
  if (metric === "mrr_l") return monthly.length ? round1(monthly.at(-1)!) : null;
  if (metric === "arr_cr") {
    const arrL = arrInrL != null ? Number(arrInrL) : monthly.length ? monthly.at(-1)! * 12 : null;
    return arrL == null ? null : round1(arrL / 100);
  }
  // Growth: average of the last three month-on-month changes, in percent.
  const rev = sorted.map((m) => m.revenue_inr_l).filter((v): v is number => v != null).map(Number);
  if (rev.length < 4) return null;
  const last = rev.slice(-4);
  const changes = [1, 2, 3].map((i) => (last[i - 1] > 0 ? (last[i] - last[i - 1]) / last[i - 1] : NaN)).filter(Number.isFinite);
  if (changes.length < 3) return null;
  return round1((changes.reduce((a, b) => a + b, 0) / changes.length) * 100);
}

export function triggerMet(threshold: number, value: number | null): boolean {
  return value != null && value >= threshold;
}

export function formatMetric(metric: TriggerMetric, v: number): string {
  if (metric === "mrr_l") return `₹${v} L a month`;
  if (metric === "arr_cr") return `₹${v} Cr ARR`;
  return `${v}% a month`;
}

/** What a pass reason may change in the thesis. The investor ticks each one; nothing changes silently. */
export interface ThesisSuggestion {
  key: "exclude_sector" | "exclude_stage" | "min_revenue";
  label: string;
  value: string | number;
}

export function suggestThesisChange(
  reason: PassReason,
  startup: { sectorCodes: string[]; stageCode: string | null; revenue_inr_l: number | null },
): ThesisSuggestion | null {
  // The startup's first (main) sector code, as the agents list it.
  const sector = startup.sectorCodes[0];
  if (reason === "sector" && sector) {
    return { key: "exclude_sector", value: sector, label: `Stop showing me ${sectorLabel(sector)} startups` };
  }
  if (reason === "stage" && startup.stageCode) {
    return { key: "exclude_stage", value: startup.stageCode, label: `Stop showing me ${stageLabel(startup.stageCode)} rounds` };
  }
  if (reason === "traction") {
    // Twice their current ARR, rounded up to the next ₹10 L; at least ₹50 L.
    const now = Number(startup.revenue_inr_l ?? 0);
    const min = Math.max(50, Math.ceil((now * 2) / 10) * 10);
    return { key: "min_revenue", value: min, label: `Only show startups with ARR of at least ₹${min >= 100 ? `${round1(min / 100)} Cr` : `${min} L`}` };
  }
  return null;
}
