import "server-only";

import { after } from "next/server";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { callN8nWebhook } from "@/server/integrations/n8n/client";
import { logActivity } from "@/server/data/activity";
import { resolveStartup, type FounderFacts, type ResolvedFacts } from "@/shared/lib/startup-facts";
import { formatLakh } from "@/shared/lib/utils";
import { toCode } from "@/shared/lib/sector-taxonomy";
import type { Startup } from "@/shared/types/db";

/**
 * Copies a founder's own values to the agents' Pilot sheet (n8n
 * PORTAL-FOUNDER-WRITEBACK): STARTUPS sector / stage / raise / revenue and
 * STARTUP_PROFILE sector_codes / stage_code / raise_cr / arr_cr. Only values the
 * founder gave are sent; Sidana's own values are never written back over
 * themselves. The workflow writes only cells that changed.
 *
 * Runs after the response and never throws; each result is logged for admins.
 */
export interface FounderWritebackPayload {
  startups: { sector?: string; stage?: string; raise_inr_cr?: string; revenue?: string };
  profile: { sector_codes?: string[]; stage_code?: string; raise_cr?: number; arr_cr?: number };
}

/** What to write, from a resolved startup. Pure, unit-tested. */
export function founderWriteback(s: Pick<Startup, "sector" | "subsector" | "stage" | "ask_as_written" | "ask_current_cr" | "revenue_inr_l"> & { facts: ResolvedFacts }, ownCodes: boolean): FounderWritebackPayload {
  const f = s.facts;
  const out: FounderWritebackPayload = { startups: {}, profile: {} };
  if (f.sector === "founder" && s.sector) out.startups.sector = s.subsector ? `${s.sector} | ${s.subsector}` : s.sector;
  if (f.stage === "founder" && s.stage) out.startups.stage = s.stage;
  if (f.stage === "founder" && f.stageCode) out.profile.stage_code = f.stageCode;
  if (ownCodes && f.sectorCodes.length) out.profile.sector_codes = f.sectorCodes;
  if (f.raise === "founder" && s.ask_as_written) {
    out.startups.raise_inr_cr = s.ask_as_written;
    if (s.ask_current_cr != null) out.profile.raise_cr = Number(s.ask_current_cr);
  }
  if ((f.arr.source === "founder" || f.arr.source === "founder_upload") && s.revenue_inr_l != null) {
    const l = Number(s.revenue_inr_l);
    out.startups.revenue = `ARR ${formatLakh(l)} (from the founder${f.arr.source === "founder_upload" ? "'s uploaded figures" : ""})`;
    out.profile.arr_cr = Math.round(l) / 100;
  }
  return out;
}

const isEmpty = (p: FounderWritebackPayload) => !Object.keys(p.startups).length && !Object.keys(p.profile).length;

/** Reads the founder's data fresh (not from any cache) and sends it to the sheet after the response. */
export function writeFounderBack(startupId: number, reason: "profile" | "figures"): void {
  if (!process.env.N8N_FOUNDER_WRITEBACK_WEBHOOK_URL) return;
  after(async () => {
    try {
      const admin = createAdminClient();
      const [s, p, m] = await Promise.all([
        admin.from("startups").select("*").eq("id", startupId).maybeSingle(),
        admin.from("startup_profiles").select("answers").eq("startup_id", startupId).maybeSingle(),
        admin.from("startup_financial_months").select("month, revenue_inr_l, mrr_inr_l").eq("startup_id", startupId),
      ]);
      const startup = s.data as Startup | null;
      if (!startup?.name) return;
      const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
      const facts: FounderFacts = {
        answers: ((p.data as { answers: Record<string, unknown> | null } | null)?.answers ?? null),
        months: ((m.data ?? []) as { month: string; revenue_inr_l: unknown; mrr_inr_l: unknown }[]).map((r) => ({ month: r.month, revenue_inr_l: n(r.revenue_inr_l), mrr_inr_l: n(r.mrr_inr_l) })),
      };
      const resolved = resolveStartup(startup, facts);
      const payload = founderWriteback(resolved, resolved.facts.sectorCodes.length > 0);
      if (isEmpty(payload)) return;
      const res = await callN8nWebhook<{ ok?: boolean; reason?: string | null; cells?: number; changes?: string[] }>(
        "N8N_FOUNDER_WRITEBACK_WEBHOOK_URL",
        { startup_name: startup.name, ...payload, profile: { ...payload.profile, sector_codes: payload.profile.sector_codes?.map(toCode) } },
        30000,
      );
      await logActivity({
        portal: "system",
        actorLabel: "system",
        action: res?.ok ? "founder_synced" : "founder_sync_failed",
        startupId,
        meta: { reason, cells: res?.cells ?? 0, changes: res?.changes ?? [], why: res?.reason ?? null },
      });
    } catch (e) {
      console.error("founder write-back failed:", e instanceof Error ? e.message : e);
      await logActivity({
        portal: "system",
        actorLabel: "system",
        action: "founder_sync_failed",
        startupId,
        meta: { reason, why: e instanceof Error ? e.message.slice(0, 200) : "unknown" },
      }).catch(() => undefined);
    }
  });
}
