import "server-only";

import { after } from "next/server";
import { callN8nWebhook } from "@/server/integrations/n8n/client";
import { logActivity } from "@/server/data/activity";
import { ANY_SECTOR, STAGES } from "@/shared/lib/sector-taxonomy";
import type { Thesis } from "@/shared/lib/thesis";

/**
 * Sends an investor's own thesis change to the agents' INVESTOR_CRITERIA row
 * (n8n PORTAL-THESIS-WRITEBACK), so email outreach uses it too. Only the fields
 * the investor actually changed are sent, and the sheet keeps everything else.
 *
 * Runs after the response (the investor never waits on Google Sheets) and
 * never throws: a failure is logged to the admin activity log instead.
 */
export interface WritebackChange {
  sector_mode?: "AGNOSTIC" | "LIST";
  sectors_in?: string[];
  stage_min?: string;
  stage_max?: string;
  cheque_min_cr?: number | null;
  cheque_max_cr?: number | null;
  arr_min_cr?: number | null;
}

export interface WritebackPayload {
  changes?: WritebackChange;
  add_excluded?: string[];
  remove_excluded?: string[];
}

const ORDER = STAGES.map((s) => s.code);
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** What a thesis edit changed, in INVESTOR_CRITERIA's terms. Pure, unit-tested. */
export function thesisDiff(
  before: Pick<Thesis, "sectors" | "stages" | "chequeMinCr" | "chequeMaxCr"> | null,
  after: Pick<Thesis, "sectors" | "stages" | "chequeMinCr" | "chequeMaxCr">,
): WritebackChange {
  const out: WritebackChange = {};
  if (!before || !sameSet(before.sectors, after.sectors)) {
    if (after.sectors.includes(ANY_SECTOR)) out.sector_mode = "AGNOSTIC";
    else if (after.sectors.length) {
      out.sector_mode = "LIST";
      out.sectors_in = after.sectors;
    }
  }
  if (!before || !sameSet(before.stages, after.stages)) {
    const idx = after.stages.map((s) => ORDER.indexOf(s)).filter((i) => i >= 0).sort((a, b) => a - b);
    out.stage_min = idx.length ? ORDER[idx[0]] : "";
    out.stage_max = idx.length ? ORDER[idx[idx.length - 1]] : "";
  }
  if (!before || before.chequeMinCr !== after.chequeMinCr) out.cheque_min_cr = after.chequeMinCr;
  if (!before || before.chequeMaxCr !== after.chequeMaxCr) out.cheque_max_cr = after.chequeMaxCr;
  return out;
}

const isEmpty = (p: WritebackPayload) =>
  !Object.keys(p.changes ?? {}).length && !(p.add_excluded ?? []).length && !(p.remove_excluded ?? []).length;

export function writeThesisBack(investor: { id: number; name: string | null }, payload: WritebackPayload): void {
  if (!process.env.N8N_THESIS_WRITEBACK_WEBHOOK_URL || !investor.name || isEmpty(payload)) return;
  after(async () => {
    try {
      const res = await callN8nWebhook<{ ok?: boolean; reason?: string | null; cells?: number; changes?: string[] }>(
        "N8N_THESIS_WRITEBACK_WEBHOOK_URL",
        { investor_name: investor.name, ...payload },
        30000,
      );
      await logActivity({
        portal: "system",
        actorLabel: "system",
        action: res?.ok ? "thesis_synced" : "thesis_sync_failed",
        investorId: investor.id,
        meta: { cells: res?.cells ?? 0, changes: res?.changes ?? [], reason: res?.reason ?? null },
      });
    } catch (e) {
      console.error("thesis write-back failed:", e instanceof Error ? e.message : e);
      await logActivity({
        portal: "system",
        actorLabel: "system",
        action: "thesis_sync_failed",
        investorId: investor.id,
        meta: { reason: e instanceof Error ? e.message.slice(0, 200) : "unknown" },
      }).catch(() => undefined);
    }
  });
}
