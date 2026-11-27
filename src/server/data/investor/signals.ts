import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { ok } from "@/server/data/founder/_internal";
import { getFinancials } from "@/server/data/financials";
import { logActivity } from "@/server/data/activity";
import { formatMetric, metricValue, TRIGGER_LABEL, triggerMet } from "@/shared/lib/deal-signals";
import type { DealTrigger, InvestorNotification, InvestorPass } from "@/shared/types/db";

/**
 * Pass reasons, revisit triggers and the notifications they raise. Read only by
 * the investor themself and by Sidana admins; no founder page or query ever
 * touches these tables.
 */

export const getPasses = cache(async (investorId: number): Promise<InvestorPass[]> => {
  const admin = createAdminClient();
  const { data } = ok(await admin.from("investor_passes").select("*").eq("investor_id", investorId).order("created_at", { ascending: false }), "investor_passes");
  return (data ?? []) as InvestorPass[];
});

export const getTriggers = cache(async (investorId: number): Promise<DealTrigger[]> => {
  const admin = createAdminClient();
  const { data } = ok(
    await admin.from("investor_deal_triggers").select("*").eq("investor_id", investorId).is("cancelled_at", null).order("created_at", { ascending: false }),
    "investor_deal_triggers",
  );
  return (data ?? []) as DealTrigger[];
});

export async function getUnreadNotifications(investorId: number): Promise<InvestorNotification[]> {
  const admin = createAdminClient();
  const { data } = ok(
    await admin.from("investor_notifications").select("*").eq("investor_id", investorId).is("read_at", null).order("created_at", { ascending: false }).limit(20),
    "investor_notifications",
  );
  return (data ?? []) as InvestorNotification[];
}

/** The startup's current values for every trigger metric. */
export async function currentMetrics(startupId: number): Promise<Record<"mrr_l" | "arr_cr" | "growth_pct", number | null>> {
  const admin = createAdminClient();
  const [fin, st] = await Promise.all([getFinancials(startupId), admin.from("startups").select("revenue_inr_l").eq("id", startupId).maybeSingle()]);
  const arr = (st.data as { revenue_inr_l: number | null } | null)?.revenue_inr_l ?? null;
  return {
    mrr_l: metricValue("mrr_l", fin.months, arr),
    arr_cr: metricValue("arr_cr", fin.months, arr),
    growth_pct: metricValue("growth_pct", fin.months, arr),
  };
}

/**
 * Checks open triggers (for one startup, or for one investor) against the
 * startup's latest figures. A trigger that is met fires once: it gets a
 * notification for the investor and an activity entry for Sidana's team.
 * Called after a founder uploads figures and whenever an investor opens the portal.
 */
export async function evaluateTriggers(scope: { startupId?: number; investorId?: number }): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from("investor_deal_triggers").select("*").is("fired_at", null).is("cancelled_at", null);
  if (scope.startupId) q = q.eq("startup_id", scope.startupId);
  if (scope.investorId) q = q.eq("investor_id", scope.investorId);
  const { data, error } = await q.limit(500);
  if (error) return 0; // table not created yet, or a read failure: never block the page
  const open = (data ?? []) as DealTrigger[];
  if (!open.length) return 0;

  const values = new Map<number, Awaited<ReturnType<typeof currentMetrics>>>();
  for (const id of [...new Set(open.map((t) => t.startup_id))]) values.set(id, await currentMetrics(id));
  const { data: names } = await admin.from("startups").select("id,name").in("id", [...values.keys()]);
  const nameOf = new Map(((names ?? []) as { id: number; name: string | null }[]).map((n) => [n.id, n.name ?? "A startup"]));

  let fired = 0;
  for (const t of open) {
    const value = values.get(t.startup_id)?.[t.metric] ?? null;
    if (!triggerMet(Number(t.threshold), value)) continue;
    // Claim it first so two checks at once can't notify twice.
    const claim = await admin
      .from("investor_deal_triggers")
      .update({ fired_at: new Date().toISOString(), fired_value: value })
      .eq("id", t.id)
      .is("fired_at", null)
      .select("id");
    if (!claim.data?.length) continue;
    fired++;
    const name = nameOf.get(t.startup_id) ?? "A startup";
    const what = TRIGGER_LABEL[t.metric].label.replace(" reaches", "").toLowerCase();
    await admin.from("investor_notifications").insert({
      investor_id: t.investor_id,
      startup_id: t.startup_id,
      kind: "trigger_met",
      title: `${name} hit your target`,
      body: `${name}'s ${what} is now ${formatMetric(t.metric, value!)}, past the ${formatMetric(t.metric, Number(t.threshold))} you asked to be told about.`,
    });
    await logActivity({
      portal: "system",
      action: "trigger_met",
      actorLabel: "system",
      investorId: t.investor_id,
      startupId: t.startup_id,
      meta: { metric: t.metric, threshold: Number(t.threshold), value },
    });
  }
  return fired;
}
