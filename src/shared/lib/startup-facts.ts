import { INR_PER_USD } from "@/shared/lib/currency";
import { SECTORS, STAGES, stageLabel } from "@/shared/lib/sector-taxonomy";
import type { Startup } from "@/shared/types/db";

/**
 * One rule for every portal: the founder's own data is final, and Sidana's
 * record fills only what the founder hasn't given (decided 26 Nov).
 *
 * Founder-owned: revenue (their uploaded figures, else their ARR answer), the
 * raise, sector, sub-sector and stage, and their sector and stage codes.
 * Sidana-owned: status, allocation left, outreach, meetings.
 *
 * Founder, investor and admin pages all read startups through resolveStartup(),
 * so the same startup shows the same numbers everywhere. Pure, unit-tested.
 */

export interface FounderFacts {
  /** The founder's latest saved profile answers (startup_profiles.answers). */
  answers: Record<string, unknown> | null;
  months: { month: string; revenue_inr_l: number | null; mrr_inr_l: number | null }[];
}

export type FactSource = "founder_upload" | "founder" | "sidana" | "none";

export interface ResolvedFacts {
  arr: { source: FactSource; from: string | null };
  raise: FactSource;
  sector: FactSource;
  stage: FactSource;
  sectorCodes: string[];
  stageCode: string | null;
}

const filled = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const lakh = (n: number) => Math.round(n * 100) / 100;

const SECTOR_BY_LABEL = new Map(SECTORS.map((s) => [s.label, s.code]));
const STAGE_BY_LABEL = new Map(STAGES.map((s) => [s.label, s.code]));

/** The founder's sector and stage codes, from the form's picker labels. */
export function founderCodes(answers: Record<string, unknown> | null): { sectorCodes: string[]; stageCode: string | null } {
  const a = answers ?? {};
  const sectorCodes = [a.sector_code, a.sector_code_2]
    .filter(filled)
    .map((l) => SECTOR_BY_LABEL.get(l.trim()))
    .filter((c): c is string => !!c);
  const stage = filled(a.stage_code) ? STAGE_BY_LABEL.get(a.stage_code.trim()) ?? null : null;
  return { sectorCodes: [...new Set(sectorCodes)], stageCode: stage };
}

/**
 * ARR in ₹ lakh from uploaded monthly figures: the newest month's MRR × 12, or
 * its revenue × 12 when MRR is blank. Same rule as the founder's Financials page.
 */
export function uploadsArrL(months: FounderFacts["months"]): { value: number; from: string } | null {
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  const latest = [...sorted].reverse().find((m) => m.mrr_inr_l != null || m.revenue_inr_l != null);
  if (!latest) return null;
  const useMrr = latest.mrr_inr_l != null;
  const monthly = Number(useMrr ? latest.mrr_inr_l : latest.revenue_inr_l);
  if (!Number.isFinite(monthly)) return null;
  const [y, mm] = latest.month.split("-").map(Number);
  const label = `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][mm - 1] ?? ""} ${y}`;
  return { value: lakh(monthly * 12), from: `${label} ${useMrr ? "MRR" : "revenue"} of ₹${lakh(monthly)} L × 12` };
}

const UNIT: Record<string, number> = { cr: 1, crore: 1, crores: 1, l: 0.01, lakh: 0.01, lakhs: 0.01, lac: 0.01, lacs: 0.01, k: 0.0001 };
const USD_UNIT: Record<string, number> = { m: 1, mn: 1, million: 1, k: 0.001, thousand: 0.001 };

/**
 * A raise typed by a founder, as the STARTUPS columns store it: INR in ₹ Cr,
 * USD in millions. "INR 5 Cr", "₹80 L", "5 crore", "US$1.5M", "$500K". The
 * first figure of a range is used. Null when no amount can be read.
 */
export function parseRaise(text: string | null | undefined): { currency: "INR" | "USD"; amount: number } | null {
  const t = (text ?? "").replace(/,/g, "").trim();
  if (!t) return null;
  const usd = t.match(/(?:US\$|USD|\$)\s*(\d+(?:\.\d+)?)\s*(m|mn|million|k|thousand)?\b/i);
  if (usd) {
    const unit = usd[2] ? USD_UNIT[usd[2].toLowerCase()] : 1;
    return { currency: "USD", amount: Math.round(Number(usd[1]) * unit * 1000) / 1000 };
  }
  const inr = t.match(/(\d+(?:\.\d+)?)\s*(cr|crores?|l|lakhs?|lacs?|k)\b/i);
  if (inr) return { currency: "INR", amount: Math.round(Number(inr[1]) * UNIT[inr[2].toLowerCase()] * 10000) / 10000 };
  return null;
}

/** A raise in ₹ Cr, whatever currency it was given in. */
export function raiseCr(r: { currency: "INR" | "USD"; amount: number } | null): number | null {
  if (!r) return null;
  return r.currency === "INR" ? r.amount : Math.round(((r.amount * 1e6 * INR_PER_USD) / 1e7) * 100) / 100;
}

type Resolvable = Pick<
  Startup,
  "revenue_inr_l" | "ask_as_written" | "ask_amount" | "ask_currency" | "ask_current_cr" | "sector" | "subsector" | "stage"
>;

/**
 * The startup as every portal should show it: the founder's values over
 * Sidana's record, field by field. `sidanaCodes` are the agents' STARTUP_PROFILE
 * codes, used only when the founder hasn't picked their own.
 */
export function resolveStartup<S extends Resolvable>(
  s: S,
  facts: FounderFacts | null,
  sidanaCodes?: { sectorCodes: string[]; stageCode: string | null },
): S & { facts: ResolvedFacts } {
  const a = facts?.answers ?? {};
  const out = { ...s } as S;

  // Revenue: uploaded figures, else the founder's ARR answer, else Sidana's record.
  // A founder answer that just confirms the record keeps Sidana's note beside it.
  const up = facts ? uploadsArrL(facts.months) : null;
  const typed = filled(a.revenue_inr_l) && Number.isFinite(Number(a.revenue_inr_l)) ? Number(a.revenue_inr_l) : null;
  let arr: ResolvedFacts["arr"];
  if (up) {
    out.revenue_inr_l = up.value as S["revenue_inr_l"];
    arr = { source: "founder_upload", from: up.from };
  } else if (typed != null && !(s.revenue_inr_l != null && Number(s.revenue_inr_l) === typed)) {
    out.revenue_inr_l = typed as S["revenue_inr_l"];
    arr = { source: "founder", from: null };
  } else {
    arr = { source: s.revenue_inr_l != null ? "sidana" : "none", from: null };
  }

  // Raise: the founder's text as written, with the amount read from it.
  let raise: FactSource = s.ask_as_written || s.ask_amount != null || s.ask_current_cr != null ? "sidana" : "none";
  if (filled(a.raise_amount)) {
    const parsed = parseRaise(a.raise_amount);
    out.ask_as_written = a.raise_amount.trim() as S["ask_as_written"];
    out.ask_amount = (parsed ? parsed.amount : null) as S["ask_amount"];
    out.ask_currency = (parsed ? parsed.currency : null) as S["ask_currency"];
    out.ask_current_cr = raiseCr(parsed) as S["ask_current_cr"];
    raise = "founder";
  }

  // Sector and sub-sector as the founder wrote them.
  let sector: FactSource = s.sector ? "sidana" : "none";
  if (filled(a.sector)) {
    out.sector = a.sector.trim() as S["sector"];
    sector = "founder";
  }
  if (filled(a.subsector)) out.subsector = a.subsector.trim() as S["subsector"];

  // Codes: the founder's picks, else the agents'.
  const own = founderCodes(facts?.answers ?? null);
  const sectorCodes = own.sectorCodes.length ? own.sectorCodes : sidanaCodes?.sectorCodes ?? [];
  const stageCode = own.stageCode ?? sidanaCodes?.stageCode ?? null;

  // Stage: the founder's pick, shown by name.
  let stage: FactSource = s.stage ? "sidana" : "none";
  if (own.stageCode) {
    out.stage = stageLabel(own.stageCode) as S["stage"];
    stage = "founder";
  }

  return { ...out, facts: { arr, raise, sector, stage, sectorCodes, stageCode } };
}

/** Human wording for where a figure came from, shared by all portals. */
export const SOURCE_HINT: Record<FactSource, string> = {
  founder_upload: "From the founder's uploaded figures",
  founder: "From the founder's profile",
  sidana: "On record with Sidana",
  none: "Not shared yet",
};
