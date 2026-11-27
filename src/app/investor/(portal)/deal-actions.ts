"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInvestor } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { canViewStartup } from "@/server/data/investor/matches";
import { getInvestorSelf, getInvestorThesis, getListedStartups } from "@/server/data/investor/thesis";
import { writeThesisBack } from "@/server/data/investor/thesis-writeback";
import { evaluateTriggers } from "@/server/data/investor/signals";
import { logActivity } from "@/server/data/activity";
import { PASS_REASONS, suggestThesisChange, TRIGGER_METRICS } from "@/shared/lib/deal-signals";
import type { PassReason, TriggerMetric } from "@/shared/types/db";

type Result = { ok: true; message: string } | { ok: false; error: string };

const PassInput = z.object({
  reason: z.enum(PASS_REASONS.map((r) => r.key) as [PassReason, ...PassReason[]]),
  text: z.string().trim().max(1000).optional().default(""),
  applyThesis: z.boolean().optional().default(false),
  minRevenueL: z.number().positive().max(1_000_000).nullable().optional(),
  trigger: z
    .object({
      metric: z.enum(TRIGGER_METRICS.map((m) => m.key) as [TriggerMetric, ...TriggerMetric[]]),
      threshold: z.number().positive().max(1_000_000),
    })
    .nullable()
    .optional(),
});

function refreshAll(startupId: number) {
  for (const p of ["/investor/shared", "/investor/matches", "/investor/past-deals", `/investor/startup/${startupId}`, "/investor/chats"]) revalidatePath(p);
}

/**
 * Pass on a deal with a reason (required), optionally learning from it in the
 * thesis and optionally setting a revisit trigger. Reasons and triggers are
 * visible to the investor and Sidana's team only, never to the founder.
 */
export async function passDeal(startupId: number, raw: unknown): Promise<Result> {
  const { investorId, authId, appUser } = await requireInvestor();
  if (!Number.isInteger(startupId) || !(await canViewStartup(investorId, startupId))) return { ok: false, error: "Not found." };
  const parsed = PassInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Pick a reason for passing." };
  const input = parsed.data;
  if (input.reason === "other" && !input.text) return { ok: false, error: "Tell us a little about why you're passing." };

  const admin = createAdminClient();
  const startup = (await getListedStartups()).find((x) => x.id === startupId);
  if (!startup) return { ok: false, error: "Not found." };

  // 1. Learn from the reason, only when the investor ticked it.
  const suggestion = suggestThesisChange(input.reason, {
    sectorCodes: startup.sector_codes,
    stageCode: startup.stage_code,
    revenue_inr_l: startup.revenue_inr_l == null ? null : Number(startup.revenue_inr_l),
  });
  const changes: Record<string, unknown> = {};
  if (input.applyThesis && suggestion) {
    const t = await getInvestorThesis(investorId);
    const row = {
      investor_id: investorId,
      sectors: t?.sectors ?? [],
      stages: t?.stages ?? [],
      cheque_min_cr: t?.chequeMinCr ?? null,
      cheque_max_cr: t?.chequeMaxCr ?? null,
      excluded_sectors: t?.excludedSectors ?? [],
      excluded_stages: t?.excludedStages ?? [],
      min_revenue_inr_l: t?.minRevenueL ?? null,
      updated_at: new Date().toISOString(),
      updated_by: authId,
    };
    if (suggestion.key === "exclude_sector") {
      row.excluded_sectors = [...new Set([...row.excluded_sectors, String(suggestion.value)])];
      changes.excluded_sector = suggestion.value;
    } else if (suggestion.key === "exclude_stage") {
      row.excluded_stages = [...new Set([...row.excluded_stages, String(suggestion.value)])];
      changes.excluded_stage = suggestion.value;
    } else {
      row.min_revenue_inr_l = input.minRevenueL ?? Number(suggestion.value);
      changes.min_revenue_inr_l = row.min_revenue_inr_l;
    }
    const th = await admin.from("investor_thesis").upsert(row, { onConflict: "investor_id" });
    if (th.error) return { ok: false, error: "Couldn't update your thesis. Please try again." };
    // Outreach learns it too: a skipped sector or an ARR floor goes to INVESTOR_CRITERIA.
    // (A skipped stage has no INVESTOR_CRITERIA field, so it stays portal-only.)
    const who = await getInvestorSelf(investorId);
    if (who && suggestion.key === "exclude_sector") writeThesisBack(who, { add_excluded: [String(suggestion.value)] });
    if (who && suggestion.key === "min_revenue" && row.min_revenue_inr_l != null) {
      writeThesisBack(who, { changes: { arr_min_cr: Math.round(Number(row.min_revenue_inr_l)) / 100 } });
    }
  }

  // 2. The pass itself. Passing also withdraws interest, which closes any chat.
  const pass = await admin.from("investor_passes").upsert(
    {
      investor_id: investorId,
      startup_id: startupId,
      reason_category: input.reason,
      reason_text: input.text || null,
      thesis_changes: changes,
      passed_by: authId,
      created_at: new Date().toISOString(),
    },
    { onConflict: "investor_id,startup_id" },
  );
  if (pass.error) return { ok: false, error: "Couldn't save that. Please try again." };
  await admin.from("investor_interest").delete().eq("investor_id", investorId).eq("startup_id", startupId);

  // 3. Optional revisit trigger.
  if (input.trigger) {
    const tr = await admin.from("investor_deal_triggers").upsert(
      {
        investor_id: investorId,
        startup_id: startupId,
        metric: input.trigger.metric,
        threshold: input.trigger.threshold,
        created_at: new Date().toISOString(),
        fired_at: null,
        fired_value: null,
        cancelled_at: null,
      },
      { onConflict: "investor_id,startup_id,metric" },
    );
    if (tr.error) return { ok: false, error: "Passed, but the trigger couldn't be saved. Please set it again from Past deals." };
  }

  const self = await getInvestorSelf(investorId);
  const label = [appUser?.full_name, self?.name].filter(Boolean).join(" · ");
  await logActivity({
    portal: "investor",
    action: "deal_passed",
    actorUserId: authId,
    actorLabel: label,
    investorId,
    startupId,
    meta: { reason: input.reason, thesis_changes: changes },
  });
  if (input.trigger) {
    await logActivity({ portal: "investor", action: "trigger_set", actorUserId: authId, actorLabel: label, investorId, startupId, meta: input.trigger });
    // Already past the target? Say so straight away.
    await evaluateTriggers({ investorId });
  }
  refreshAll(startupId);
  return {
    ok: true,
    message: input.trigger ? "Passed. We'll tell you when the target is reached." : "Passed. It's moved to Past deals.",
  };
}

/** Stop watching a startup for one trigger. */
export async function cancelTrigger(triggerId: number): Promise<void> {
  const { investorId } = await requireInvestor();
  if (!Number.isInteger(triggerId)) return;
  const admin = createAdminClient();
  await admin.from("investor_deal_triggers").update({ cancelled_at: new Date().toISOString() }).eq("id", triggerId).eq("investor_id", investorId);
  revalidatePath("/investor/past-deals");
}

/** Dismiss a portal notification. */
export async function markNotificationRead(id: number): Promise<void> {
  const { investorId } = await requireInvestor();
  if (!Number.isInteger(id)) return;
  const admin = createAdminClient();
  await admin.from("investor_notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("investor_id", investorId);
  revalidatePath("/investor", "layout");
}

/** Remove one rule the thesis learned from a pass (a skipped sector or stage, or the revenue floor). */
export async function removeLearnedRule(kind: "sector" | "stage" | "revenue", value: string): Promise<void> {
  const { investorId, authId } = await requireInvestor();
  const admin = createAdminClient();
  const { data } = await admin.from("investor_thesis").select("excluded_sectors, excluded_stages").eq("investor_id", investorId).maybeSingle();
  if (!data) return;
  const patch =
    kind === "sector"
      ? { excluded_sectors: ((data.excluded_sectors as string[]) ?? []).filter((x) => x !== value) }
      : kind === "stage"
        ? { excluded_stages: ((data.excluded_stages as string[]) ?? []).filter((x) => x !== value) }
        : { min_revenue_inr_l: null };
  await admin.from("investor_thesis").update({ ...patch, updated_at: new Date().toISOString(), updated_by: authId }).eq("investor_id", investorId);
  // Un-skip the sector for outreach too. The ARR floor isn't cleared on the sheet:
  // it may hold Sidana's own researched minimum.
  if (kind === "sector") {
    const who = await getInvestorSelf(investorId);
    if (who) writeThesisBack(who, { remove_excluded: [value] });
  }
  revalidatePath("/investor/matches");
}
