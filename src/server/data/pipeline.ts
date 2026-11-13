import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import { nz, type PipelineRow } from "@/shared/lib/deal-sharing";

/**
 * One startup's rows of the Pilot sheet's PIPELINE tab, from the Supabase mirror that n8n
 * SYNC-PIPELINE refreshes every few minutes. The founder dashboard, the founder Overview
 * page and the admin startup page all read deals through here, and count them with
 * src/shared/lib/deal-sharing.ts, the same code as the admin Deal sharing page, so every
 * view shows the same numbers.
 */

export interface StartupDeals {
  /** "ready" once the mirror exists and has synced at least once. */
  state: "ready" | "not_created" | "never_synced" | "read_failed";
  rows: (PipelineRow & { pass_reason: string | null })[];
  /** When the mirror last synced successfully (ISO), or null. */
  syncedAt: string | null;
}

const COLS =
  "deal_id,row_no,startup,owner,investor,deal_shared,date_shared,last_contact,next_action,investor_response,deal_status,meeting_scheduled,match_type,channel,pass_reason";
const NOT_CREATED = new Set(["42P01", "PGRST205"]);
const PAGE = 1000;

/**
 * A word from the name to narrow the query; rows are then matched exactly on the report's
 * name key, so "Sugar's Daddy" and "Sugars Daddy" are the same startup and nothing else is.
 */
function searchToken(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const best = words.sort((a, b) => b.length - a.length)[0] ?? "";
  return best.replace(/[%_]/g, "");
}

export async function getStartupDeals(startupName: string | null | undefined): Promise<StartupDeals> {
  const admin = createAdminClient();
  const key = nz(startupName);
  const sync = await admin.from("pipeline_sync_runs").select("finished_at").eq("ok", true).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (sync.error) {
    return { state: NOT_CREATED.has(sync.error.code ?? "") ? "not_created" : "read_failed", rows: [], syncedAt: null };
  }
  const syncedAt = (sync.data as { finished_at: string } | null)?.finished_at ?? null;
  if (!syncedAt) return { state: "never_synced", rows: [], syncedAt: null };
  if (!key) return { state: "ready", rows: [], syncedAt };

  const token = searchToken(startupName ?? "");
  const rows: StartupDeals["rows"] = [];
  for (let from = 0; ; from += PAGE) {
    let q = admin.from("pipeline_deals").select(COLS).order("row_no", { ascending: true }).range(from, from + PAGE - 1);
    if (token) q = q.ilike("startup", `%${token}%`);
    const { data, error } = await q;
    if (error) return { state: "read_failed", rows: [], syncedAt };
    const page = (data ?? []) as unknown as StartupDeals["rows"];
    rows.push(...page.filter((r) => nz(r.startup) === key));
    if (page.length < PAGE) break;
  }
  return { state: "ready", rows, syncedAt };
}
