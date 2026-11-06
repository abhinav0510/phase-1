import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { Startup, StartupProfile } from "@/shared/types/db";
import { count } from "./kpis";

export type ProfileQueueRow = StartupProfile & { startup_name: string | null };

export interface ProfileQueue {
  rows: ProfileQueueRow[];
  problem: "not_created" | "read_failed" | null;
}

export async function listProfileSubmissions(): Promise<ProfileQueue> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("startup_profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    console.error(`startup_profiles read failed: ${error.code || error.message}`);
    return { rows: [], problem: missing ? "not_created" : "read_failed" };
  }
  const rows = (data ?? []) as StartupProfile[];
  const ids = rows.map((r) => r.startup_id);
  const names = new Map<number, string | null>();
  if (ids.length) {
    const { data: st } = await admin.from("startups").select("id,name").in("id", ids);
    for (const s of (st ?? []) as { id: number; name: string | null }[]) names.set(s.id, s.name);
  }
  const rank: Record<string, number> = { submitted: 0, changes_requested: 1, draft: 2, approved: 3 };
  return {
    rows: rows
      .map((r) => ({ ...r, startup_name: names.get(r.startup_id) ?? null }))
      .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9)),
    problem: null,
  };
}

export async function getProfileStatus(startupId: number): Promise<StartupProfile["status"] | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("startup_profiles").select("status").eq("startup_id", startupId).maybeSingle();
  return (data as { status: StartupProfile["status"] } | null)?.status ?? null;
}

export async function getProfileForReview(
  startupId: number,
): Promise<{ startup: Startup | null; profile: StartupProfile | null }> {
  const admin = createAdminClient();
  const [s, p] = await Promise.all([
    admin.from("startups").select("*").eq("id", startupId).maybeSingle(),
    admin.from("startup_profiles").select("*").eq("startup_id", startupId).maybeSingle(),
  ]);
  return {
    startup: (s.data as Startup | null) ?? null,
    profile: p.error ? null : ((p.data as StartupProfile | null) ?? null),
  };
}

export async function countProfilesAwaitingReview(): Promise<number> {
  return count("startup_profiles", (q) => q.eq("status", "submitted"));
}
