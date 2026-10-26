import type { Startup } from "@/lib/types/db";

// The founder profile Sidana uses for investor matchmaking. One list drives the
// founder form (/complete-profile), the completion score on the dashboard and
// the admin review screen, so a field added here shows up everywhere.
//
// `record` reads the value already on file in public.startups (from the
// Pilot sheet). A field counts as complete when the founder has answered it OR
// a value is on record. Founder answers are stored separately
// (public.startup_profiles) and never overwrite the record directly.

export type FieldType = "text" | "textarea" | "url" | "number" | "select" | "multi";

export type SectionKey = "company" | "team" | "traction" | "round" | "preferences";

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
  record?: (s: Startup) => string | null;
}

export const SECTIONS: { key: SectionKey; title: string; blurb: string }[] = [
  { key: "company", title: "Company", blurb: "What you build and who you build it for." },
  { key: "team", title: "Founders & team", blurb: "Who investors will be backing." },
  { key: "traction", title: "Stage & traction", blurb: "Where the business is today." },
  { key: "round", title: "The round", blurb: "What you are raising and on what terms." },
  { key: "preferences", title: "Investor preferences", blurb: "Who you want us to prioritise or skip." },
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

const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A", "Series A", "Series B+"] as const;

const MARKETS = ["India", "United States", "Europe / UK", "Middle East", "South-East Asia", "Global"] as const;

const REVENUE_BASIS = [
  "Pre-revenue",
  "Annual recurring revenue (ARR)",
  "Monthly revenue × 12",
  "Last financial year revenue",
] as const;

const INSTRUMENTS = ["Equity", "CCPS", "CCD", "SAFE / iSAFE", "Convertible note", "Not decided yet"] as const;

const INVESTOR_TYPES = [
  "Angels",
  "Angel networks",
  "Micro VCs",
  "Seed funds",
  "Institutional VCs",
  "Family offices",
  "Corporate / strategic",
] as const;

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t ? t : null;
};
const num = (v: number | null | undefined): string | null =>
  v === null || v === undefined || Number.isNaN(v) ? null : String(v);

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

  // Traction
  { key: "stage", label: "Stage", type: "select", section: "traction", options: STAGES, matching: true, record: (s) => str(s.stage) },
  { key: "revenue_inr_l", label: "Revenue (₹ lakh)", type: "number", section: "traction", matching: true, placeholder: "e.g. 250", help: "Annualised. Enter 0 if pre-revenue.", record: (s) => num(s.revenue_inr_l) },
  { key: "revenue_basis", label: "How that revenue is measured", type: "select", section: "traction", options: REVENUE_BASIS, matching: true },
  { key: "burn_inr_l", label: "Monthly burn (₹ lakh)", type: "number", section: "traction", placeholder: "e.g. 12", record: (s) => num(s.burn_inr_l) },
  { key: "runway_months", label: "Runway (months)", type: "number", section: "traction", placeholder: "e.g. 9", record: (s) => num(s.runway_months) },
  { key: "traction_highlights", label: "Key traction", type: "textarea", section: "traction", placeholder: "Customers, users, growth, retention, notable logos — the numbers you are proudest of." },

  // Round
  { key: "raise_amount", label: "Amount you are raising", type: "text", section: "round", matching: true, placeholder: "e.g. INR 5 Cr or US$1.5M", record: (s) => str(s.ask_as_written) },
  { key: "instrument", label: "Instrument", type: "select", section: "round", options: INSTRUMENTS },
  { key: "valuation", label: "Pre-money valuation (if set)", type: "text", section: "round", placeholder: "e.g. INR 40 Cr, or 'open'" },
  { key: "committed", label: "Already committed in this round", type: "text", section: "round", placeholder: "e.g. INR 1 Cr from existing angels" },
  { key: "use_of_funds", label: "Use of funds", type: "textarea", section: "round", placeholder: "What this round pays for, and the milestone it gets you to." },
  { key: "previous_funding", label: "Funding raised so far", type: "text", section: "round", placeholder: "e.g. INR 80 L pre-seed (2024), bootstrapped before" },

  // Preferences
  { key: "investor_types", label: "Investor types you prefer", type: "multi", section: "preferences", options: INVESTOR_TYPES, matching: true },
  { key: "investors_to_skip", label: "Investors to skip", type: "textarea", section: "preferences", placeholder: "Investors already in your round, or anyone you'd rather we didn't approach." },
];

export const FIELD_BY_KEY: Record<string, ProfileField> = Object.fromEntries(
  PROFILE_FIELDS.map((f) => [f.key, f]),
);

export type Answers = Record<string, string | string[]>;

export function isFilled(v: unknown): boolean {
  if (Array.isArray(v)) return v.some((x) => String(x).trim() !== "");
  return v !== null && v !== undefined && String(v).trim() !== "";
}

/** The value on record for a field (null when nothing is on file). */
export function recordValue(field: ProfileField, startup: Startup | null): string | null {
  if (!startup || !field.record) return null;
  return field.record(startup);
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

/** Display a stored answer as text. */
export function displayValue(v: unknown): string {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return v === null || v === undefined ? "" : String(v);
}
