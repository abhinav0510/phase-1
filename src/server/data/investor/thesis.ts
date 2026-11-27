import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { FOUNDER_TTL_SECONDS, STARTUPS_TAG } from "@/server/config/cache-tags";
import { ok } from "@/server/data/founder/_internal";
import { NO_PROFILE, normKey, type MatchProfile, type Thesis } from "@/shared/lib/thesis";
import { ANY_SECTOR, expandSector, isStageCode, stageRange, toCode } from "@/shared/lib/sector-taxonomy";
import { resolveStartup } from "@/shared/lib/startup-facts";
import { getAllFounderFacts } from "@/server/data/startup-facts";
import type { Investor, InvestorThesisRow, Startup } from "@/shared/types/db";

export type InvestorSelf = Pick<
  Investor,
  "id" | "name" | "contact_person" | "email" | "type" | "status" | "sectors" | "stage_pref" | "cheque_min_cr" | "cheque_max_cr" | "cheque_as_written" | "geography" | "do_not_contact"
> & {
  /** The agents' matching fields on the INVESTORS tab. */
  sector_mode: string | null;
  sectors_excluded: string[] | null;
  models_excluded: string[] | null;
  stage_min: string | null;
  stage_max: string | null;
};

export const getInvestorSelf = cache(async (investorId: number): Promise<InvestorSelf | null> => {
  const admin = createAdminClient();
  const { data } = ok(
    await admin
      .from("investors")
      .select(
        "id,name,contact_person,email,type,status,sectors,stage_pref,cheque_min_cr,cheque_max_cr,cheque_as_written,geography,do_not_contact,sector_mode,sectors_excluded,models_excluded,stage_min,stage_max",
      )
      .eq("id", investorId)
      .maybeSingle(),
    "investors",
  );
  return (data as InvestorSelf | null) ?? null;
});

const codes = (values: (string | null | undefined)[] | null | undefined) => [...new Set((values ?? []).flatMap(expandSector))];
const stageCodes = (values: (string | null | undefined)[] | null | undefined) =>
  [...new Set((values ?? []).map(toCode).filter(isStageCode))];

/**
 * The investor's thesis in the agents' codes: their own portal edit
 * (investor_thesis) if any, else the INVESTORS tab. Their sheet exclusions
 * (sectors_excluded, models_excluded) always apply.
 */
export const getInvestorThesis = cache(async (investorId: number): Promise<Thesis | null> => {
  const admin = createAdminClient();
  const [own, inv] = await Promise.all([
    admin.from("investor_thesis").select("*").eq("investor_id", investorId).maybeSingle(),
    getInvestorSelf(investorId),
  ]);
  const row = ok(own, "investor_thesis").data as InvestorThesisRow | null;
  const blocked = {
    blockedSectors: codes(inv?.sectors_excluded).filter((c) => c !== ANY_SECTOR),
    blockedModels: (inv?.models_excluded ?? []).map(toCode).filter(Boolean),
  };
  if (row) {
    return {
      sectors: codes(row.sectors),
      stages: stageCodes(row.stages),
      chequeMinCr: row.cheque_min_cr == null ? null : Number(row.cheque_min_cr),
      chequeMaxCr: row.cheque_max_cr == null ? null : Number(row.cheque_max_cr),
      excludedSectors: codes(row.excluded_sectors),
      excludedStages: stageCodes(row.excluded_stages),
      minRevenueL: row.min_revenue_inr_l == null ? null : Number(row.min_revenue_inr_l),
      ...blocked,
      source: "portal",
    };
  }
  if (!inv) return null;
  const agnostic = toCode(inv.sector_mode) === "AGNOSTIC";
  return {
    sectors: agnostic ? [ANY_SECTOR] : codes(inv.sectors),
    stages: stageRange(inv.stage_min, inv.stage_max),
    chequeMinCr: inv.cheque_min_cr == null ? null : Number(inv.cheque_min_cr),
    chequeMaxCr: inv.cheque_max_cr == null ? null : Number(inv.cheque_max_cr),
    ...blocked,
    source: "sheet",
  };
});

export type ListedStartup = Pick<
  Startup,
  | "id" | "name" | "sector" | "subsector" | "stage" | "status" | "ask_current_cr" | "ask_amount" | "ask_currency"
  | "ask_as_written" | "allocation_left_amount" | "allocation_left_as_written" | "revenue_inr_l"
> &
  MatchProfile & { one_liner: string | null; has_logo: boolean; logo_version: string | null };

const STARTUP_COLS =
  "id,name,sector,subsector,stage,status,ask_current_cr,ask_amount,ask_currency,ask_as_written,allocation_left_amount,allocation_left_as_written,revenue_inr_l";

/**
 * Every startup with what a match card needs, resolved the same way as on the
 * founder's and admins' pages: the founder's saved answers, uploaded figures
 * and sector/stage picks over Sidana's record (startup-facts). Shared by all
 * investors, so cached once for everyone; a founder save clears it.
 */
export const getListedStartups = cache((): Promise<ListedStartup[]> => {
  const read = unstable_cache(
    async () => {
      const admin = createAdminClient();
      const [s, founders, b, m, memo] = await Promise.all([
        admin.from("startups").select(STARTUP_COLS).limit(2000),
        getAllFounderFacts(),
        admin.from("startup_branding").select("startup_id, logo_path, updated_at"),
        admin.from("startup_match_profile").select("startup_name,startup_id,active,sector_codes,business_model,stage_code,raise_cr,arr_cr").limit(2000),
        admin.from("startup_profile_prefill").select("startup_id, answers").limit(2000),
      ]);
      const startups = (ok(s, "startups").data ?? []) as Omit<ListedStartup, keyof MatchProfile | "one_liner" | "has_logo" | "logo_version">[];
      // The agents' STARTUP_PROFILE row for each startup. Until
      // migration 017 is run the table is missing: then nothing matches, nothing breaks.
      if (m.error) console.error("startup_match_profile unavailable:", m.error.code || m.error.message);
      const profiles = new Map<string, MatchProfile>();
      const byId = new Map<number, MatchProfile>();
      for (const r of (m.data ?? []) as {
        startup_name: string;
        startup_id: number | null;
        active: boolean | null;
        sector_codes: string[] | null;
        business_model: string | null;
        stage_code: string | null;
        raise_cr: number | null;
        arr_cr: number | null;
      }[]) {
        const prof: MatchProfile = {
          sector_codes: [...new Set((r.sector_codes ?? []).map(toCode).filter(Boolean))],
          stage_code: r.stage_code ? toCode(r.stage_code) : null,
          business_model: r.business_model ? toCode(r.business_model) : null,
          profile_active: r.active !== false,
          raise_cr: r.raise_cr == null ? null : Number(r.raise_cr),
          arr_cr: r.arr_cr == null ? null : Number(r.arr_cr),
        };
        if (r.startup_id != null) byId.set(Number(r.startup_id), prof);
        profiles.set(normKey(r.startup_name), prof);
      }
      const oneLiner = new Map<number, string>();
      for (const [id, f] of founders) {
        const v = f.answers?.one_liner;
        if (typeof v === "string" && v.trim()) oneLiner.set(id, v.trim());
      }
      // Sidana's deal-memo one-liner until the founder writes their own.
      for (const r of (memo.data ?? []) as { startup_id: number; answers: Record<string, unknown> | null }[]) {
        const v = r.answers?.one_liner;
        if (!oneLiner.has(r.startup_id) && typeof v === "string" && v.trim()) oneLiner.set(r.startup_id, v.trim());
      }
      const logos = new Map<number, string>();
      for (const r of (ok(b, "startup_branding").data ?? []) as { startup_id: number; logo_path: string | null; updated_at: string | null }[]) {
        if (r.logo_path) logos.set(r.startup_id, r.updated_at ?? r.logo_path);
      }
      return startups.map((st) => {
        // The id n8n matched first, else the exact normalised name.
        const agents = byId.get(st.id) ?? profiles.get(normKey(st.name)) ?? NO_PROFILE;
        const r = resolveStartup(st as unknown as Startup, founders.get(st.id) ?? null, { sectorCodes: agents.sector_codes, stageCode: agents.stage_code });
        const { facts, ...resolved } = r;
        return {
          ...(resolved as unknown as typeof st),
          ...agents,
          // The founder's own sector and stage picks win for matching too.
          sector_codes: facts.sectorCodes,
          stage_code: facts.stageCode,
          // A founder who has given figures has a profile to match on, even before the agents add one.
          profile_active: agents.profile_active || (facts.sectorCodes.length > 0 && agents === NO_PROFILE),
          one_liner: oneLiner.get(st.id) ?? null,
          has_logo: logos.has(st.id),
          logo_version: logos.get(st.id) ?? null,
        };
      });
    },
    ["v4", "listed-startups"],
    { revalidate: FOUNDER_TTL_SECONDS, tags: [STARTUPS_TAG] },
  );
  return read();
});

export function investorLogoUrl(s: Pick<ListedStartup, "id" | "has_logo" | "logo_version">): string | null {
  return s.has_logo ? `/api/investor/logo/${s.id}?v=${encodeURIComponent(s.logo_version ?? "1")}` : null;
}
