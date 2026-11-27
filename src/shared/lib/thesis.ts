import { INR_PER_USD } from "@/shared/lib/currency";
import type { Startup, StartupStatus } from "@/shared/types/db";
import { ANY_SECTOR, SECTOR_GROUPS, SECTORS, STAGES, sectorLabel, stageLabel } from "@/shared/lib/sector-taxonomy";

/**
 * Investor thesis matching (clause 2.4). Pure: the same rule runs on every page
 * load and in the unit tests. Both sides use the agents' codes: investors'
 * sectors and stage range from the INVESTORS tab (or their portal edit), and
 * each startup's sector codes and stage code from STARTUP_PROFILE.
 */

export interface Thesis {
  /** Sector codes (FINTECH_INFRA, ...), or [ANY_SECTOR] for any sector. */
  sectors: string[];
  /** Stage codes (PRE_SEED .. SERIES_C_PLUS); empty = any stage. */
  stages: string[];
  chequeMinCr: number | null;
  chequeMaxCr: number | null;
  /** Learned from pass reasons the investor confirmed (codes). */
  excludedSectors?: string[];
  excludedStages?: string[];
  minRevenueL?: number | null;
  /** The investor's own exclusions on the INVESTORS tab (sectors_excluded, models_excluded). */
  blockedSectors?: string[];
  blockedModels?: string[];
  /** "portal" once the investor has edited it, else the INVESTORS tab ("sheet"). */
  source: "portal" | "sheet";
}

/** Letters and digits only: "B2B SaaS" → "b2bsaas". Mirrors portal_norm() in SQL. */
export function normKey(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Startups still raising. Sidana to confirm this list. */
export const OPEN_STATUSES: StartupStatus[] = ["live", "a1_ready", "a2_waiting", "term_sheet"];

/** What matching reads from the agents' STARTUP_PROFILE row (startup_match_profile). */
export interface MatchProfile {
  sector_codes: string[];
  stage_code: string | null;
  business_model: string | null;
  profile_active: boolean;
  raise_cr: number | null;
  arr_cr: number | null;
}

export type MatchStartup = Pick<
  Startup,
  "id" | "name" | "sector" | "subsector" | "stage" | "status" | "ask_current_cr" | "ask_amount" | "ask_currency" | "allocation_left_amount" | "revenue_inr_l"
> &
  MatchProfile;

/** A startup with no STARTUP_PROFILE row: it can't be matched until the agents profile it. */
export const NO_PROFILE: MatchProfile = {
  sector_codes: [],
  stage_code: null,
  business_model: null,
  profile_active: false,
  raise_cr: null,
  arr_cr: null,
};

export interface MatchReasons {
  sector: string;
  stage: string;
  /** Room left in the round in ₹ Cr, or null when the round size isn't known. */
  roomCr: number | null;
  chequeChecked: boolean;
}

export interface MatchResult<S extends MatchStartup = MatchStartup> {
  startup: S;
  reasons: MatchReasons;
}

/** An amount in the startup's ask currency, in ₹ Cr. INR amounts are stored in Cr, USD in millions. */
export function toCr(amount: number | null | undefined, currency: string | null | undefined): number | null {
  if (amount == null || !Number.isFinite(Number(amount))) return null;
  const cur = (currency ?? "INR").toUpperCase();
  if (cur === "INR") return Number(amount);
  if (cur === "USD") return (Number(amount) * 1e6 * INR_PER_USD) / 1e7;
  return null;
}

/** Room left in the round in ₹ Cr: allocation left, else the current ask, else the profile's round size. */
export function roomLeftCr(s: MatchStartup): number | null {
  return toCr(s.allocation_left_amount, s.ask_currency) ?? toCr(s.ask_amount, s.ask_currency) ?? s.ask_current_cr ?? s.raise_cr ?? null;
}

/** Revenue in ₹ L: the STARTUPS figure, else the profile's ARR (₹ Cr). */
export function revenueL(s: MatchStartup): number | null {
  if (s.revenue_inr_l != null && Number.isFinite(Number(s.revenue_inr_l))) return Number(s.revenue_inr_l);
  return s.arr_cr != null && Number.isFinite(Number(s.arr_cr)) ? Number(s.arr_cr) * 100 : null;
}

/** True when the investor has a thesis the matcher can use. No sectors = nothing is shown. */
export function hasThesis(t: Thesis | null | undefined): t is Thesis {
  return !!t && t.sectors.length > 0;
}

export function matchStartups<S extends MatchStartup>(startups: S[], thesis: Thesis | null): MatchResult<S>[] {
  if (!hasThesis(thesis)) return [];
  const anySector = thesis.sectors.includes(ANY_SECTOR);
  const sectors = new Set(thesis.sectors);
  const stages = new Set(thesis.stages);
  const skipSectors = new Set([...(thesis.excludedSectors ?? []), ...(thesis.blockedSectors ?? [])]);
  const skipStages = new Set(thesis.excludedStages ?? []);
  const skipModels = new Set(thesis.blockedModels ?? []);

  const out: MatchResult<S>[] = [];
  for (const s of startups) {
    if (!s.status || !OPEN_STATUSES.includes(s.status) || !s.profile_active) continue;

    const codes = (s.sector_codes ?? []).filter(Boolean);
    if (!codes.length) continue;
    if (codes.some((c) => skipSectors.has(c))) continue;
    if (s.business_model && skipModels.has(s.business_model)) continue;
    const sectorHit = anySector ? codes[0] : codes.find((c) => sectors.has(c));
    if (!sectorHit) continue;

    const stage = s.stage_code;
    if (stage && skipStages.has(stage)) continue;
    if (stages.size && (!stage || !stages.has(stage))) continue;

    if (thesis.minRevenueL != null) {
      const rev = revenueL(s);
      if (rev == null || rev < thesis.minRevenueL) continue;
    }

    const roomCr = roomLeftCr(s);
    const chequeChecked = thesis.chequeMinCr != null && roomCr != null;
    if (chequeChecked && roomCr! < thesis.chequeMinCr!) continue;

    out.push({
      startup: s,
      reasons: {
        sector: sectorLabel(sectorHit),
        stage: stage ? stageLabel(stage) : s.stage?.trim() || "Stage not stated",
        roomCr,
        chequeChecked,
      },
    });
  }
  return out.sort(
    (a, b) => (revenueL(b.startup) ?? 0) - (revenueL(a.startup) ?? 0) || (a.startup.name ?? "").localeCompare(b.startup.name ?? ""),
  );
}

export interface OptionGroup {
  group: string;
  options: { key: string; label: string }[];
}

/** The thesis picker's choices: every agents' sector code, grouped, and the stage ladder. */
export function thesisOptions(): { sectorGroups: OptionGroup[]; stages: { key: string; label: string }[] } {
  return {
    sectorGroups: SECTOR_GROUPS.map((g) => ({
      group: g,
      options: SECTORS.filter((s) => s.group === g).map((s) => ({ key: s.code, label: s.label })),
    })),
    stages: STAGES.map((s) => ({ key: s.code, label: s.label })),
  };
}
