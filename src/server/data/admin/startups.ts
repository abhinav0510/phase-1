import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { AppUser, Investor, Match, Meeting, Startup } from "@/shared/types/db";
import { flattenMeetingJoins } from "./meetings";

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

export interface StartupListParams {
  search?: string;
  status?: string;
  bucket?: string;
  sector?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
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
        .select("*, startup:startups(name), investor:investors(name)")
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
    meetings: ((meetingsRes.data ?? []) as any[]).map(flattenMeetingJoins),
    funding: fundingRes.data ?? [],
    docs: docsRes.data ?? [],
  };
}

export async function listAppUsers(): Promise<AppUser[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_users")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as AppUser[];
}

export async function getContactEmailsByStartup(): Promise<Map<number, string[]>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("startup_contacts")
    .select("startup_id, email")
    .order("id");
  const map = new Map<number, string[]>();
  for (const row of (data ?? []) as { startup_id: number; email: string }[]) {
    const list = map.get(row.startup_id) ?? [];
    list.push(row.email);
    map.set(row.startup_id, list);
  }
  return map;
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
