import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { getOwnProfile, getOwnStartup } from "@/server/data/founder";
import { getFinancials } from "@/server/data/financials";
import { resolveStartup, type FounderFacts, type ResolvedFacts } from "@/shared/lib/startup-facts";
import { toCode } from "@/shared/lib/sector-taxonomy";
import type { Startup } from "@/shared/types/db";

/**
 * Startups as every portal shows them (founder, investor, admin): the founder's
 * own saved answers and uploaded figures over Sidana's record. See
 * src/shared/lib/startup-facts.ts for the rule.
 */

export type ResolvedStartup = Startup & { facts: ResolvedFacts };

/** One founder's facts: their latest saved answers and their uploaded monthly figures. */
export const getFounderFacts = cache(async (startupId: number): Promise<FounderFacts> => {
  const [profile, fin] = await Promise.all([getOwnProfile(startupId), getFinancials(startupId)]);
  return { answers: (profile?.answers ?? null) as Record<string, unknown> | null, months: fin.months };
});

/** The agents' STARTUP_PROFILE codes for one startup, if synced (migration 017). */
const getSidanaCodes = cache(async (startupId: number, name: string | null) => {
  const admin = createAdminClient();
  const { data, error } = await admin.from("startup_match_profile").select("startup_id,startup_name,sector_codes,stage_code").limit(2000);
  if (error || !data) return undefined;
  const key = (v: string | null) => (v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const rows = data as { startup_id: number | null; startup_name: string; sector_codes: string[] | null; stage_code: string | null }[];
  const r = rows.find((x) => x.startup_id === startupId) ?? rows.find((x) => key(x.startup_name) === key(name));
  return r ? { sectorCodes: (r.sector_codes ?? []).map(toCode).filter(Boolean), stageCode: r.stage_code ? toCode(r.stage_code) : null } : undefined;
});

/** One startup, resolved. Null when the startup doesn't exist. */
export const getStartup = cache(async (startupId: number): Promise<ResolvedStartup | null> => {
  const s = await getOwnStartup(startupId);
  if (!s) return null;
  const [facts, codes] = await Promise.all([getFounderFacts(startupId), getSidanaCodes(startupId, s.name)]);
  return resolveStartup(s, facts, codes);
});

/** Every founder's facts at once (lists: investor matches, admin startups). */
export async function getAllFounderFacts(): Promise<Map<number, FounderFacts>> {
  const admin = createAdminClient();
  const [p, m] = await Promise.all([
    admin.from("startup_profiles").select("startup_id, answers").limit(5000),
    admin.from("startup_financial_months").select("startup_id, month, revenue_inr_l, mrr_inr_l").limit(50000),
  ]);
  const out = new Map<number, FounderFacts>();
  const get = (id: number) => {
    let f = out.get(id);
    if (!f) out.set(id, (f = { answers: null, months: [] }));
    return f;
  };
  for (const r of (p.data ?? []) as { startup_id: number; answers: Record<string, unknown> | null }[]) get(r.startup_id).answers = r.answers ?? null;
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  for (const r of (m.data ?? []) as { startup_id: number; month: string; revenue_inr_l: unknown; mrr_inr_l: unknown }[]) {
    get(r.startup_id).months.push({ month: r.month, revenue_inr_l: n(r.revenue_inr_l), mrr_inr_l: n(r.mrr_inr_l) });
  }
  return out;
}
