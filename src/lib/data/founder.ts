import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Match,
  Meeting,
  Startup,
  Investor,
  WeeklyReport,
} from "@/lib/types/db";

/**
 * Founder-scoped data access. EVERY query is filtered by `startupId`, which the
 * caller obtains from requireFounder() (verified against the authenticated
 * session server-side — never from client input). This enforces per-startup
 * isolation in application code. A matching RLS policy is also recommended at
 * the database level (see MIGRATIONS/PROPOSED-rls.sql — not auto-applied).
 */

export async function getOwnStartup(startupId: number): Promise<Startup | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("startups")
    .select("*")
    .eq("id", startupId)
    .maybeSingle();
  return (data as Startup | null) ?? null;
}

export async function getOwnMatches(
  startupId: number,
): Promise<(Match & { investor: Pick<Investor, "id" | "name" | "type" | "status"> | null })[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("matches")
    .select("*, investor:investors(id,name,type,status)")
    .eq("startup_id", startupId)
    .order("priority", { ascending: true, nullsFirst: false })
    .limit(200);
  return (data ?? []) as any[];
}

export async function getOwnMeetings(startupId: number): Promise<Meeting[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("meetings")
    .select("*")
    .eq("startup_id", startupId)
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(100);
  return (data ?? []) as Meeting[];
}

export async function getOwnFunding(startupId: number): Promise<any[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("funding_rounds")
    .select("*")
    .eq("startup_id", startupId)
    .order("closed_on", { ascending: false, nullsFirst: false });
  return data ?? [];
}

/** Emails on file for this startup (from Founders Info) — any of them can sign in. */
export async function getOwnSignInEmails(startupId: number): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("startup_contacts")
    .select("email")
    .eq("startup_id", startupId)
    .order("id");
  return (data ?? []).map((r) => r.email as string);
}

export async function getOwnDocs(startupId: number): Promise<any[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("docs")
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/**
 * Weekly fundraising reports for this startup, newest first. Scoped STRICTLY by
 * the verified `startupId` (service-role read, same as every other founder
 * query). We deliberately do NOT fall back to matching on a normalized name
 * key: an `.or(startup_key.eq.…)` could return another startup's row whenever
 * two names normalize alike (e.g. "Orbis Lives" / "OrbisLives"), which would be
 * a cross-tenant leak. The n8n write branch resolves startup_id for every row;
 * any row that somehow lacks one is hidden here rather than matched by name.
 * Returns [] when the table is empty or absent, so the page degrades gracefully
 * before the first report lands.
 */
export async function getOwnWeeklyReports(
  startupId: number,
): Promise<WeeklyReport[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("weekly_reports")
    .select("*")
    .eq("startup_id", startupId)
    .order("week_start", { ascending: false })
    .limit(52);
  // Table may not exist yet (migration pending) — treat as "no reports".
  if (error) return [];
  return (data ?? []) as WeeklyReport[];
}

export interface FounderOverview {
  startup: Startup | null;
  matchCount: number;
  matchSent: number;
  meetingsUpcoming: number;
  meetingsHeld: number;
  profileCompletion: number;
}

const PROFILE_FIELDS: (keyof Startup)[] = [
  "name",
  "sector",
  "subsector",
  "stage",
  "owner_name",
  "ask_amount",
  "ask_as_written",
  "revenue_inr_l",
  "burn_inr_l",
  "runway_months",
  "notes",
];

export function computeProfileCompletion(s: Startup | null): number {
  if (!s) return 0;
  const filled = PROFILE_FIELDS.filter((f) => {
    const v = s[f];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
}

export async function getFounderOverview(
  startupId: number,
): Promise<FounderOverview> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const [startupRes, matchCount, matchSent, meetingsUpcoming, meetingsHeld] =
    await Promise.all([
      admin.from("startups").select("*").eq("id", startupId).maybeSingle(),
      admin
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startupId),
      admin
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startupId)
        .eq("state", "sent"),
      admin
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startupId)
        .gte("scheduled_at", nowIso)
        // `held` is NULL for un-flagged meetings; exclude only held=true.
        .not("held", "is", true),
      admin
        .from("meetings")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startupId)
        .eq("held", true),
    ]);

  const startup = (startupRes.data as Startup | null) ?? null;
  return {
    startup,
    matchCount: matchCount.count ?? 0,
    matchSent: matchSent.count ?? 0,
    meetingsUpcoming: meetingsUpcoming.count ?? 0,
    meetingsHeld: meetingsHeld.count ?? 0,
    profileCompletion: computeProfileCompletion(startup),
  };
}
