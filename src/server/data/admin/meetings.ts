import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { Meeting } from "@/shared/types/db";

export function flattenMeetingJoins(row: any): Meeting {
  const { startup, investor, ...rest } = row;
  return {
    ...rest,
    startup_name: rest.startup_name || (startup as any)?.name || null,
    investor_name: rest.investor_name || (investor as any)?.name || null,
  } as Meeting;
}

export async function getUpcomingMeetings(limit = 6): Promise<Meeting[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("meetings")
    .select("*, startup:startups(name), investor:investors(name)")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  return ((data ?? []) as any[]).map(flattenMeetingJoins);
}

export async function getRecentMeetings(limit = 8): Promise<Meeting[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("meetings")
    .select("*, startup:startups(name), investor:investors(name)")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return ((data ?? []) as any[]).map(flattenMeetingJoins);
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

  let q = admin.from("meetings").select("*, startup:startups(name), investor:investors(name)", { count: "exact" });
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
  return { rows: ((data ?? []) as any[]).map(flattenMeetingJoins), total: c ?? 0 };
}
