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

export async function getOwnDocs(startupId: number): Promise<any[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("docs")
    .select("*")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// Normalised startup key — must match the key the n8n write branch stores
// (lowercase, alphanumerics only). Used as a fallback join when a report row
// could not be resolved to a startup_id by name.
function startupKey(name: string | null | undefined): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Weekly fundraising reports for this startup, newest first. Scoped by the
 * verified `startupId` (service-role read, same as every other founder query);
 * `startupName` enables a key fallback for rows the workflow wrote before an id
 * could be resolved. Returns [] when the table is empty or absent, so the page
 * degrades gracefully before the first report lands.
 */
export async function getOwnWeeklyReports(
  startupId: number,
  startupName?: string | null,
): Promise<WeeklyReport[]> {
  const admin = createAdminClient();
  const key = startupKey(startupName);
  const filter = key
    ? `startup_id.eq.${startupId},startup_key.eq.${key}`
    : `startup_id.eq.${startupId}`;
  const { data, error } = await admin
    .from("weekly_reports")
    .select("*")
    .or(filter)
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
