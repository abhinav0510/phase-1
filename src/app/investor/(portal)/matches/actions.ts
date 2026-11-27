"use server";

import { revalidatePath } from "next/cache";
import { requireInvestor } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { getInvestorSelf, getInvestorThesis, getListedStartups } from "@/server/data/investor/thesis";
import { logActivity } from "@/server/data/activity";
import { matchStartups } from "@/shared/lib/thesis";
import { sectorLabel } from "@/shared/lib/sector-taxonomy";
import { validateThesis } from "@/server/validators/thesis";
import { thesisDiff, writeThesisBack } from "@/server/data/investor/thesis-writeback";

export type ThesisResult =
  | { ok: true; added: number[]; removed: number[] }
  | { ok: false; error: string };

/**
 * Saves the investor's thesis (clause 2.6) to investor_thesis (never to
 * `investors` or the sheet) and returns which startups started or stopped
 * matching, so the page can tag new matches without a reload.
 */
export async function updateThesis(raw: unknown): Promise<ThesisResult> {
  const { investorId, authId, appUser } = await requireInvestor();
  const startups = await getListedStartups();
  const v = validateThesis(raw);
  if (!v.ok) return v;

  const before = await getInvestorThesis(investorId);
  const beforeIds = new Set(matchStartups(startups, before).map((r) => r.startup.id));

  const admin = createAdminClient();
  const { error } = await admin.from("investor_thesis").upsert(
    {
      investor_id: investorId,
      sectors: v.value.sectors,
      stages: v.value.stages,
      cheque_min_cr: v.value.chequeMinCr,
      cheque_max_cr: v.value.chequeMaxCr,
      updated_at: new Date().toISOString(),
      updated_by: authId,
    },
    { onConflict: "investor_id" },
  );
  if (error) return { ok: false, error: "Couldn't save your thesis. Please try again." };

  const afterIds = new Set(
    matchStartups(startups, {
      sectors: v.value.sectors,
      stages: v.value.stages,
      chequeMinCr: v.value.chequeMinCr,
      chequeMaxCr: v.value.chequeMaxCr,
      excludedSectors: before?.excludedSectors,
      excludedStages: before?.excludedStages,
      minRevenueL: before?.minRevenueL,
      blockedSectors: before?.blockedSectors,
      blockedModels: before?.blockedModels,
      source: "portal",
    }).map((r) => r.startup.id),
  );

  const self = await getInvestorSelf(investorId);
  const was = new Set(before?.sectors ?? []);
  const now = new Set(v.value.sectors);
  const addedSectors = [...now].filter((s) => !was.has(s)).map(sectorLabel);
  const removedSectors = [...was].filter((s) => s && !now.has(s)).map(sectorLabel);
  await logActivity({
    portal: "investor",
    action: "thesis_changed",
    actorUserId: authId,
    actorLabel: [appUser?.full_name, self?.name].filter(Boolean).join(" · "),
    investorId,
    meta: { added_sectors: addedSectors, removed_sectors: removedSectors, stages: v.value.stages, cheque_min_cr: v.value.chequeMinCr, cheque_max_cr: v.value.chequeMaxCr },
  });

  // Outreach uses the same thesis: copy what changed to INVESTOR_CRITERIA (after the response).
  if (self) writeThesisBack(self, { changes: thesisDiff(before, v.value) });

  revalidatePath("/investor/matches");
  return {
    ok: true,
    added: [...afterIds].filter((id) => !beforeIds.has(id)),
    removed: [...beforeIds].filter((id) => !afterIds.has(id)),
  };
}
