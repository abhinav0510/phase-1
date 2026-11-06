import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { Investor } from "@/shared/types/db";
import { count } from "./kpis";

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
