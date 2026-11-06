import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";

export async function count(table: string, filters?: (q: any) => any): Promise<number> {
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
