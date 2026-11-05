import { formatRupees, toRupees } from "@/shared/lib/currency";
import { formatLakh } from "@/shared/lib/utils";
import type { Startup } from "@/shared/types/db";

// The founder profile Sidana uses for investor matchmaking. One list drives the
// founder form (/complete-profile), the completion score on the dashboard and
// the admin review screen, so a field added here shows up everywhere.
//
// `record` reads the value already on file in public.startups (from the
// Pilot sheet). A field counts as complete when the founder has answered it OR
// a value is on record. Founder answers are stored separately
// (public.startup_profiles) and never overwrite the record directly.

export type FieldType = "text" | "textarea" | "url" | "number" | "select" | "multi";

export type SectionKey = "company" | "team" | "financials" | "round";

export interface ProfileField {
  key: string;
  label: string;
  type: FieldType;
  section: SectionKey;
  options?: readonly string[];
  placeholder?: string;
  help?: string;
  /** Used directly by the match engine (sector, stage, cheque size, geography…). */
  matching?: boolean;
  /** Must be answered before the profile can be submitted for review. */
  required?: boolean;
  /** Sub-heading shown above this field in the form, starting a new group. */
  heading?: string;
  record?: (s: Startup) => string | null;
}

export const SECTIONS: { key: SectionKey; title: string; blurb: string }[] = [
  { key: "company", title: "Company", blurb: "What you build and who you build it for." },
  { key: "team", title: "Founders & team", blurb: "Who investors will be backing." },
  { key: "financials", title: "Financials", blurb: "Yearly numbers only. Investors compare you on annual revenue (ARR) and last year's results." },
  { key: "round", title: "The round", blurb: "What you are raising and on what terms." },
];

const SECTORS = [
  "AI / Applied AI",
  "B2B SaaS",
  "Fintech",
  "HealthTech",
  "EdTech",
  "HRTech",
  "Consumer / D2C",
  "FoodTech",
  "Climate / Energy",
  "Mobility / EV",
  "DeepTech / Hardware",
  "SpaceTech / Aerospace",
  "Logistics / Supply chain",
  "PropTech / Real estate",
  "Media / Creator economy",
  "Agritech",
  "Other",
] as const;

const BUSINESS_MODELS = [
  "B2B SaaS",
  "B2B services",
  "D2C brand",
  "B2C app / subscription",
  "Marketplace",
  "Hardware / DeepTech",
  "Lending / financial services",
  "Offline / retail",
  "Other",
] as const;

const MARKETS = ["India", "United States", "Europe / UK", "Middle East", "South-East Asia", "Global"] as const;

const REVENUE_BASIS = [
  "Pre-revenue",
  "Annual recurring revenue (ARR)",
  "Monthly revenue × 12",
  "Last financial year revenue",
] as const;

const INSTRUMENTS = ["Equity", "CCPS", "CCD", "SAFE / iSAFE", "Convertible note", "Not decided yet"] as const;

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t ? t : null;
};
const num = (v: number | null | undefined): string | null =>
  v === null || v === undefined || Number.isNaN(v) ? null : String(v);

/** Indian financial years run April to March. Returns the start year of the current one in IST. */
function currentFyStart(now = new Date()): number {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
}

const fyName = (start: number) => `FY ${start}-${String(start + 1).slice(2)}`;
const fyKey = (start: number) => `${start}_${String(start + 1).slice(2)}`;

export interface FinancialYear {
  key: string;
  label: string;
}

const FY_START = currentFyStart();

/** The last completed financial year. Founders are asked for that one year only. */
export const PAST_YEARS: FinancialYear[] = [1].map((back) => ({
  key: `revenue_actual_fy${fyKey(FY_START - back)}`,
  label: fyName(FY_START - back),
}));

export const PROFILE_FIELDS: ProfileField[] = [
  // Company
  { key: "one_liner", label: "One-line pitch", type: "text", section: "company", placeholder: "e.g. AI hiring OS for mid-size Indian companies", help: "The first line investors read about you." },
  { key: "description", label: "What the company does", type: "textarea", section: "company", placeholder: "Problem, product, customer and why now — 3 to 5 sentences." },
  { key: "website", label: "Website", type: "url", section: "company", placeholder: "https://" },
  { key: "sector", label: "Sector", type: "select", section: "company", options: SECTORS, matching: true, record: (s) => str(s.sector) },
  { key: "subsector", label: "Sub-sector / niche", type: "text", section: "company", placeholder: "e.g. Corporate cafeteria management", record: (s) => str(s.subsector) },
  { key: "business_model", label: "Business model", type: "select", section: "company", options: BUSINESS_MODELS, matching: true },
  { key: "markets", label: "Markets you sell in", type: "multi", section: "company", options: MARKETS, matching: true },
  { key: "hq_city", label: "Headquarters city", type: "text", section: "company", placeholder: "e.g. Bengaluru" },
  { key: "founded_year", label: "Year founded", type: "number", section: "company", placeholder: "e.g. 2022" },

  // Team
  { key: "founders", label: "Founder names and roles", type: "textarea", section: "team", placeholder: "e.g. Asha Rao (CEO), Vikram Shah (CTO)" },
  { key: "founder_linkedin", label: "Lead founder LinkedIn", type: "url", section: "team", placeholder: "https://www.linkedin.com/in/…" },
  { key: "women_led", label: "Is there a woman co-founder?", type: "select", section: "team", options: ["Yes", "No"], matching: true, help: "Several funds in our network run women-led mandates." },
  { key: "team_size", label: "Full-time team size", type: "number", section: "team", placeholder: "e.g. 18" },

  // Financials
  { key: "revenue_inr_l", label: "Annual revenue – ARR (₹ lakh)", type: "number", section: "financials", matching: true, required: true, heading: "Current annual revenue", placeholder: "e.g. 250", help: "Enter the full-year figure, not a monthly number. If you bill monthly, multiply by 12. Enter 0 if pre-revenue.", record: (s) => num(s.revenue_inr_l) },
  { key: "revenue_basis", label: "How that revenue is measured", type: "select", section: "financials", options: REVENUE_BASIS, matching: true },
  ...PAST_YEARS.map((y, i): ProfileField => ({
    key: y.key,
    label: `${y.label} revenue (₹ lakh)`,
    type: "number",
    section: "financials",
    heading: i === 0 ? "Previous year's record" : undefined,
    placeholder: "e.g. 180",
    help: i === 0 ? "Full-year actual revenue from your books for the last financial year. Enter 0 if there was no revenue." : undefined,
  })),
  { key: "past_financials_note", label: "Notes on that year", type: "textarea", section: "financials", placeholder: "Net profit or loss, one-off items, and why revenue moved." },
  { key: "financial_statements_link", label: "Link to your financial statements", type: "url", section: "financials", placeholder: "https://", help: "Audited accounts or P&L for that year, shared from Google Drive or similar." },

  // Round
  { key: "raise_amount", label: "Amount you are raising", type: "text", section: "round", matching: true, placeholder: "e.g. INR 5 Cr or US$1.5M", record: (s) => str(s.ask_as_written) },
  { key: "instrument", label: "Instrument", type: "select", section: "round", options: INSTRUMENTS },
  { key: "valuation", label: "Pre-money valuation (if set)", type: "text", section: "round", placeholder: "e.g. INR 40 Cr, or 'open'" },
  { key: "committed", label: "Already committed in this round", type: "text", section: "round", placeholder: "e.g. INR 1 Cr from existing angels" },
  { key: "use_of_funds", label: "Use of funds", type: "textarea", section: "round", placeholder: "What this round pays for, and the milestone it gets you to." },
  { key: "previous_funding", label: "Funding raised so far", type: "text", section: "round", placeholder: "e.g. INR 80 L pre-seed (2024), bootstrapped before" },
];

export const FIELD_BY_KEY: Record<string, ProfileField> = Object.fromEntries(
  PROFILE_FIELDS.map((f) => [f.key, f]),
);

export type Answers = Record<string, string | string[]>;

export interface ArrDisplay {
  value: string;
  source: "record" | "note" | "founder" | "none";
  /** The revenue text to show beside a number on record. */
  note: string | null;
}

/** The sheet's revenue column also holds market sizes and usage figures, which aren't revenue. */
const ABOUT_REVENUE = /\b(?:arr|mrr|revenue|run-?rate|turnover|annuali[sz]ed|pre-revenue)\b/i;

/**
 * What to show for annual revenue. The sync fills `revenue_note` from the sheet but not
 * the number, so for many startups that text is the only figure. A founder's own answer
 * is the fallback. Dollar amounts are shown in rupees.
 */
export function arrDisplay(
  startup: Pick<Startup, "revenue_inr_l" | "revenue_note"> | null | undefined,
  answers: Record<string, unknown> | null | undefined,
): ArrDisplay {
  const text = startup?.revenue_note?.trim();
  const note = text && ABOUT_REVENUE.test(text) ? toRupees(text) : null;
  if (startup?.revenue_inr_l != null) return { value: formatLakh(startup.revenue_inr_l), source: "record", note };
  if (note) return { value: note, source: "note", note: null };
  const own = answers?.revenue_inr_l;
  if (isFilled(own) && !Number.isNaN(Number(own))) return { value: formatLakh(Number(own)), source: "founder", note: null };
  return { value: "—", source: "none", note: null };
}

export interface MrrDisplay {
  value: string;
  source: "note" | "none";
}

const RUPEES = String.raw`(?:₹|INR|Rs\.?)\s*~?\s*(\d[\d,]*(?:\.\d+)?)\s*(cr|crores?|lakhs?|lacs?|l|k)?\b`;
const RUPEE_UNIT: Record<string, number> = { cr: 1e7, crore: 1e7, crores: 1e7, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, l: 1e5, k: 1e3 };
// "INR 6L MRR", "MRR INR 4 Cr", "~INR 1 Cr per month", "monthly run-rate ~INR 50K", "~INR 2.8 lakh in the last month".
const MONTHLY = [
  new RegExp(`~?\\s*${RUPEES}\\s*MRR\\b`, "i"),
  new RegExp(`\\bMRR\\b[^;.\\d₹]{0,12}?~?\\s*${RUPEES}`, "i"),
  new RegExp(`~?\\s*${RUPEES}\\s*(?:per|a|/)\\s*month\\b`, "i"),
  new RegExp(`monthly run-?rate\\s*~?\\s*${RUPEES}`, "i"),
  new RegExp(`~?\\s*${RUPEES}\\s*in the last month\\b`, "i"),
];

/**
 * Monthly revenue, when Sidana's revenue text states one. Nothing stores MRR as a number,
 * and ARR ÷ 12 would invent a figure for revenue that isn't recurring, so otherwise it's "—".
 */
export function mrrDisplay(startup: Pick<Startup, "revenue_note"> | null | undefined): MrrDisplay {
  const text = toRupees(startup?.revenue_note?.trim());
  if (!text) return { value: "—", source: "none" };
  for (const pattern of MONTHLY) {
    const m = pattern.exec(text);
    if (!m) continue;
    const inr = parseFloat(m[1].replace(/,/g, "")) * (m[2] ? RUPEE_UNIT[m[2].toLowerCase()] : 1);
    return { value: `${m[0].includes("~") ? "~" : ""}${formatRupees(inr)}`, source: "note" };
  }
  return { value: "—", source: "none" };
}

export function isFilled(v: unknown): boolean {
  if (Array.isArray(v)) return v.some((x) => String(x).trim() !== "");
  return v !== null && v !== undefined && String(v).trim() !== "";
}

/** The value on record for a field (null when nothing is on file). */
export function recordValue(field: ProfileField, startup: Startup | null): string | null {
  if (!startup || !field.record) return null;
  return toRupees(field.record(startup));
}

export interface ProfileProgress {
  pct: number;
  done: number;
  total: number;
  /** Missing fields, matchmaking-critical first, in form order. */
  missing: ProfileField[];
  bySection: Record<SectionKey, { done: number; total: number }>;
}

export function profileProgress(startup: Startup | null, answers: Answers | null): ProfileProgress {
  const a = answers ?? {};
  const bySection = Object.fromEntries(
    SECTIONS.map((s) => [s.key, { done: 0, total: 0 }]),
  ) as Record<SectionKey, { done: number; total: number }>;
  const missing: ProfileField[] = [];
  let done = 0;
  for (const f of PROFILE_FIELDS) {
    bySection[f.section].total++;
    const ok = isFilled(a[f.key]) || isFilled(recordValue(f, startup));
    if (ok) {
      done++;
      bySection[f.section].done++;
    } else {
      missing.push(f);
    }
  }
  missing.sort((x, y) => Number(!!y.matching) - Number(!!x.matching));
  const total = PROFILE_FIELDS.length;
  return { pct: Math.round((done / total) * 100), done, total, missing, bySection };
}

const URL_RE = /^https?:\/\/[^\s]+\.[^\s]+$/i;

/**
 * A team-provided value, if it's one the founder could have entered for this question;
 * otherwise null, so the question stays empty and a bad value can't block saving.
 */
export function prefillValue(field: ProfileField, raw: unknown): string | string[] | null {
  if (field.type === "multi") {
    const list = Array.isArray(raw) ? raw.map(String).filter((x) => (field.options ?? []).includes(x)) : [];
    return list.length ? list : null;
  }
  if (raw === null || raw === undefined || Array.isArray(raw) || typeof raw === "object") return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (field.type === "select") return (field.options ?? []).includes(s) ? s : null;
  if (field.type === "number") return Number.isFinite(Number(s.replace(/,/g, ""))) && Number(s.replace(/,/g, "")) >= 0 ? s : null;
  if (field.type === "url") return s.length <= 300 && URL_RE.test(s) ? s : null;
  return s.length <= (field.type === "textarea" ? 2000 : 200) ? s : null;
}

/** Display a stored answer as text. */
export function displayValue(v: unknown): string {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return v === null || v === undefined ? "" : String(v);
}
