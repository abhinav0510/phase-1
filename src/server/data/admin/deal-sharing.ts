import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { PairMeeting, PipelineRow } from "@/shared/lib/deal-sharing";

export interface PipelineSync {
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  rowsRead: number;
  error: string | null;
}

export interface DealSharingData {
  /** "ready": the mirror exists and has synced; otherwise why the page can't show figures. */
  state: "ready" | "not_created" | "never_synced" | "read_failed";
  rows: PipelineRow[];
  meetings: PairMeeting[];
  /** Newest sync attempt, and newest successful one (they differ when the last run failed). */
  lastRun: PipelineSync | null;
  lastOk: PipelineSync | null;
  /** Startup name key -> id, to link a deal to its startup page. */
  startupIds: Record<string, number>;
}

const PAGE = 1000;
const COLS =
  "deal_id,row_no,startup,owner,investor,investor_domains,deal_shared,date_shared,last_contact,next_action,investor_response,deal_status,meeting_scheduled,match_type,channel";
const NOT_CREATED = new Set(["42P01", "PGRST205"]);

const toSync = (r: any): PipelineSync => ({
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  ok: !!r.ok,
  rowsRead: r.rows_read ?? 0,
  error: r.error ?? null,
});

type Res = PromiseLike<{ data: unknown; error: { code?: string; message: string } | null; count?: number | null }>;

/**
 * Read every row of a query: count first, then fetch all pages at once (PostgREST returns
 * at most 1000 rows per request). Rows come back in the query's order.
 */
async function readAll<T>(count: () => Res, page: (from: number, to: number) => Res) {
  const head = await count();
  if (head.error) return { rows: [] as T[], error: head.error };
  const total = head.count ?? 0;
  const pages = await Promise.all(Array.from({ length: Math.ceil(total / PAGE) }, (_, i) => page(i * PAGE, i * PAGE + PAGE - 1)));
  const failed = pages.find((p) => p.error);
  if (failed) return { rows: [] as T[], error: failed.error };
  return { rows: pages.flatMap((p) => (p.data ?? []) as T[]), error: null };
}

/**
 * Everything the Deal sharing page counts: the PIPELINE mirror (pipeline_deals, written by
 * n8n SYNC-PIPELINE), the calendar meetings, and when the mirror last synced. All rows are
 * read so totals are exact; the page counts in memory with src/shared/lib/deal-sharing.ts.
 */
export async function getDealSharingData(): Promise<DealSharingData> {
  const admin = createAdminClient();
  const empty = { rows: [], meetings: [], lastRun: null, lastOk: null, startupIds: {} };

  const [lastRunRes, lastOkRes] = await Promise.all([
    admin.from("pipeline_sync_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("pipeline_sync_runs").select("*").eq("ok", true).order("started_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (lastRunRes.error) {
    return { ...empty, state: NOT_CREATED.has(lastRunRes.error.code ?? "") ? "not_created" : "read_failed" };
  }
  const lastRun = lastRunRes.data ? toSync(lastRunRes.data) : null;
  const lastOk = lastOkRes.data ? toSync(lastOkRes.data) : null;
  if (!lastOk) return { ...empty, lastRun, state: "never_synced" };

  const [deals, meetings, startups] = await Promise.all([
    readAll<PipelineRow>(
      () => admin.from("pipeline_deals").select("deal_id", { count: "exact", head: true }),
      (a, b) => admin.from("pipeline_deals").select(COLS).order("row_no", { ascending: true }).order("deal_id", { ascending: true }).range(a, b),
    ),
    readAll<any>(
      () => admin.from("meetings").select("id", { count: "exact", head: true }),
      (a, b) => admin.from("meetings").select("id, scheduled_at, investor_name, notes, startup:startups(name)").order("id", { ascending: true }).range(a, b),
    ),
    admin.from("startups").select("id, name"),
  ]);
  if (meetings.error) return { ...empty, lastRun, lastOk, state: "read_failed" };
  if (deals.error) return { ...empty, lastRun, lastOk, state: NOT_CREATED.has(deals.error.code ?? "") ? "not_created" : "read_failed" };

  // Like the report, a meeting is matched on its calendar title, and internal or cancelled
  // events never count.
  const SKIP = /interview|internal|onboarding|\bmou\b|task|cancell?ed/i;
  const pairMeetings: PairMeeting[] = meetings.rows
    .filter((m) => !SKIP.test(m.notes ?? ""))
    .map((m) => ({
      startup_name: m.startup?.name ?? null,
      investor_name: [m.notes, m.investor_name].filter(Boolean).join(" "),
      scheduled_at: m.scheduled_at ?? null,
    }));

  const startupIds: Record<string, number> = {};
  for (const s of (startups.data ?? []) as { id: number; name: string | null }[]) {
    const k = (s.name ?? "").toLowerCase().replace(/[’']/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
    if (k && startupIds[k] == null) startupIds[k] = s.id;
  }
  return { state: "ready", rows: deals.rows, meetings: pairMeetings, lastRun, lastOk, startupIds };
}
