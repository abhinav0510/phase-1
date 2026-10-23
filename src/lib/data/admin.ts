import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AppUser,
  Investor,
  Match,
  Meeting,
  Startup,
} from "@/lib/types/db";

/**
 * Admin / operations data access. Reads across ALL startups and investors.
 * Callers MUST gate with requireAdmin() before invoking anything here.
 */

async function count(table: string, filters?: (q: any) => any): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from(table).select("*", { count: "exact", head: true });
  if (filters) q = filters(q);
  const { count: c } = await q;
  return c ?? 0;
}

export interface AdminKpis {
  startupsTotal: number;
  startupsLive: number;
  startupsTermSheet: number;
  startupsSilent: number;
  investorsTotal: number;
  investorsActive: number;
  matchesTotal: number;
  matchesQueued: number;
  meetingsTotal: number;
  meetingsUpcoming: number;
  docsPending: number;
}

export async function getAdminKpis(): Promise<AdminKpis> {
  const nowIso = new Date().toISOString();
  const [
    startupsTotal,
    startupsLive,
    startupsTermSheet,
    startupsSilent,
    investorsTotal,
    investorsActive,
    matchesTotal,
    matchesQueued,
    meetingsTotal,
    meetingsUpcoming,
    docsPending,
  ] = await Promise.all([
    count("startups"),
    count("startups", (q) => q.eq("status", "live")),
    count("startups", (q) => q.eq("status", "term_sheet")),
    count("startups", (q) => q.eq("status", "silent")),
    count("investors"),
    count("investors", (q) => q.eq("status", "active")),
    count("matches"),
    count("matches", (q) => q.eq("state", "queued")),
    count("meetings"),
    // "upcoming" = scheduled in the future and not yet held. `held` is NULL
    // for un-flagged meetings, so exclude only held=true (null-or-false counts).
    count("meetings", (q) =>
      q.gte("scheduled_at", nowIso).not("held", "is", true),
    ),
    count("docs", (q) => q.is("received_at", null)),
  ]);

  return {
    startupsTotal,
    startupsLive,
    startupsTermSheet,
    startupsSilent,
    investorsTotal,
    investorsActive,
    matchesTotal,
    matchesQueued,
    meetingsTotal,
    meetingsUpcoming,
    docsPending,
  };
}

export async function getStartupStatusDistribution(): Promise<
  { status: string; count: number }[]
> {
  const admin = createAdminClient();
  const { data } = await admin.from("startups").select("status");
  const rows = (data ?? []) as { status: string | null }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.status ?? "unknown";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([status, c]) => ({ status, count: c }));
}

export async function getBucketDistribution(): Promise<
  { bucket: string; count: number }[]
> {
  const admin = createAdminClient();
  const { data } = await admin.from("startups").select("bucket");
  const rows = (data ?? []) as { bucket: string | null }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.bucket ?? "UNASSIGNED";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const order = ["HOT10", "A", "B", "C", "UNASSIGNED"];
  return order
    .filter((b) => map.has(b))
    .map((bucket) => ({ bucket, count: map.get(bucket)! }));
}

export async function getRecentStartups(limit = 6): Promise<Startup[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("startups")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Startup[];
}

export async function getUpcomingMeetings(limit = 6): Promise<Meeting[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("meetings")
    .select("*")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as Meeting[];
}

export interface StartupListParams {
  search?: string;
  status?: string;
  bucket?: string;
  sector?: string;
  page?: number;
  pageSize?: number;
  sort?: string; // column
  dir?: "asc" | "desc";
}

export async function listStartups(params: StartupListParams): Promise<{
  rows: Startup[];
  total: number;
}> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, params.pageSize ?? 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = admin.from("startups").select("*", { count: "exact" });
  if (params.search) q = q.ilike("name", `%${params.search}%`);
  if (params.status) q = q.eq("status", params.status);
  if (params.bucket) q = q.eq("bucket", params.bucket);
  if (params.sector) q = q.ilike("sector", `%${params.sector}%`);

  const sort = params.sort ?? "updated_at";
  q = q.order(sort, { ascending: params.dir === "asc", nullsFirst: false });
  q = q.range(from, to);

  const { data, count: c } = await q;
  return { rows: (data ?? []) as Startup[], total: c ?? 0 };
}

export interface StartupDetail {
  startup: Startup | null;
  matches: (Match & { investor: Pick<Investor, "id" | "name" | "type" | "status"> | null })[];
  meetings: Meeting[];
  funding: any[];
  docs: any[];
}

export async function getStartupDetail(id: number): Promise<StartupDetail> {
  const admin = createAdminClient();
  const [startupRes, matchesRes, meetingsRes, fundingRes, docsRes] =
    await Promise.all([
      admin.from("startups").select("*").eq("id", id).maybeSingle(),
      admin
        .from("matches")
        .select("*, investor:investors(id,name,type,status)")
        .eq("startup_id", id)
        .order("priority", { ascending: true })
        .limit(200),
      admin
        .from("meetings")
        .select("*")
        .eq("startup_id", id)
        .order("scheduled_at", { ascending: false })
        .limit(100),
      admin
        .from("funding_rounds")
        .select("*")
        .eq("startup_id", id)
        .order("closed_on", { ascending: false }),
      admin
        .from("docs")
        .select("*")
        .eq("startup_id", id)
        .order("created_at", { ascending: false }),
    ]);

  return {
    startup: (startupRes.data as Startup | null) ?? null,
    matches: (matchesRes.data ?? []) as any[],
    meetings: (meetingsRes.data ?? []) as Meeting[],
    funding: fundingRes.data ?? [],
    docs: docsRes.data ?? [],
  };
}

export interface InvestorListParams {
  search?: string;
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export async function listInvestors(params: InvestorListParams): Promise<{
  rows: Investor[];
  total: number;
}> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, params.pageSize ?? 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = admin.from("investors").select("*", { count: "exact" });
  if (params.search) q = q.ilike("name", `%${params.search}%`);
  if (params.status) q = q.eq("status", params.status);
  if (params.type) q = q.eq("type", params.type);
  q = q.order("updated_at", { ascending: false, nullsFirst: false });
  q = q.range(from, to);

  const { data, count: c } = await q;
  return { rows: (data ?? []) as Investor[], total: c ?? 0 };
}

export async function listAppUsers(): Promise<AppUser[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as AppUser[];
}

export async function getRecentMeetings(limit = 8): Promise<Meeting[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("meetings")
    .select("*")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as Meeting[];
}

export async function listMeetings(params: {
  page?: number;
  pageSize?: number;
  scope?: "upcoming" | "past" | "all";
}): Promise<{ rows: Meeting[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, params.pageSize ?? 25);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const nowIso = new Date().toISOString();

  let q = admin.from("meetings").select("*", { count: "exact" });
  if (params.scope === "upcoming") {
    q = q
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true });
  } else if (params.scope === "past") {
    q = q
      .lt("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: false });
  } else {
    q = q.order("scheduled_at", { ascending: false, nullsFirst: false });
  }
  q = q.range(from, to);
  const { data, count: c } = await q;
  return { rows: (data ?? []) as Meeting[], total: c ?? 0 };
}

export async function getMatchStateDistribution(): Promise<
  { state: string; count: number }[]
> {
  const states = ["queued", "sent", "paused", "tracker_only", "not_queued"];
  const counts = await Promise.all(
    states.map((s) => count("matches", (q) => q.eq("state", s))),
  );
  return states.map((state, i) => ({ state, count: counts[i] }));
}

export async function getInvestorTypeDistribution(): Promise<
  { type: string; count: number }[]
> {
  const admin = createAdminClient();
  const { data } = await admin.from("investors").select("type");
  const rows = (data ?? []) as { type: string | null }[];
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.type ?? "other";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, c]) => ({ type, count: c }));
}

export async function listPendingDocs(): Promise<any[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("docs")
    .select("*, startup:startups(id,name)")
    .is("received_at", null)
    .order("requested_at", { ascending: true })
    .limit(100);
  return data ?? [];
}
