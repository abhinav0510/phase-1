import type { InvestorProfile } from "@/lib/data/founder";

/** Plain, serialisable investor profile for founder UI (no contact details). */
export interface ProfileView {
  typeLabel: string | null;
  cheque: string;
  geography: string | null;
  sectors: string[];
  stages: string[];
}

const ACRONYMS = new Set(["FNB", "AI", "ML", "EV", "IOT", "HR", "IT", "AR", "VR", "API", "UPI", "SME", "MSME", "ESG", "DTC", "UK", "US", "USA", "UAE", "SEA", "MENA"]);

const SMALL_WORDS = new Set(["TO", "AND", "OF", "OR", "IN", "FOR", "THE", "A"]);

/** "D2C BEAUTY PERSONAL CARE" → "D2C Beauty Personal Care"; mixed-case input is left alone. */
export function prettyLabel(s: string): string {
  const t = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  if (!t || /[a-z]/.test(t)) return t;
  return t
    .split(" ")
    .map((w, i) => {
      if (/\d/.test(w) || ACRONYMS.has(w)) return w;
      if (w === "SAAS") return "SaaS";
      if (i > 0 && SMALL_WORDS.has(w)) return w.toLowerCase();
      return w.charAt(0) + w.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Sectors / stages may arrive as a text[] or a delimited string; normalise to unique labels. */
export function listOf(v: unknown): string[] {
  const raw = Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/[,;|]/) : [];
  const seen = new Set<string>();
  for (const s of raw) {
    const t = prettyLabel(s);
    if (t) seen.add(t);
  }
  return Array.from(seen);
}

function num(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

export function chequeLabel(
  p: Pick<InvestorProfile, "cheque_min_cr" | "cheque_max_cr" | "cheque_as_written"> | null | undefined,
): string {
  const min = p?.cheque_min_cr ?? null;
  const max = p?.cheque_max_cr ?? null;
  if (min != null && max != null) return min === max ? `₹${num(min)} Cr` : `₹${num(min)}–${num(max)} Cr`;
  if (min != null) return `₹${num(min)} Cr+`;
  if (max != null) return `Up to ₹${num(max)} Cr`;
  return p?.cheque_as_written?.trim() || "—";
}

export function profileView(p: InvestorProfile | null | undefined, typeLabel: string | null): ProfileView {
  return {
    typeLabel,
    cheque: chequeLabel(p),
    geography: p?.geography ? prettyLabel(p.geography) || null : null,
    sectors: listOf(p?.sectors),
    stages: listOf(p?.stage_pref),
  };
}
