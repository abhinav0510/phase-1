import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { FOUNDER_TTL_SECONDS, startupTag } from "@/lib/cache-tags";
import type {
  Match,
  Meeting,
  Startup,
  Investor,
  StartupDeck,
  StartupProfile,
  WeeklyReport,
} from "@/lib/types/db";

/**
 * Founder-scoped data access. EVERY query is filtered by `startupId`, which the
 * caller obtains from requireFounder() (verified against the authenticated
 * session server-side — never from client input). This enforces per-startup
 * isolation in application code. A matching RLS policy is also recommended at
 * the database level (see MIGRATIONS/PROPOSED-rls.sql — not auto-applied).
 *
 * Reads go through a two-layer cache:
 *   - react `cache()` dedups repeat calls within one request/render.
 *   - `unstable_cache` persists the result across requests for FOUNDER_TTL_SECONDS,
 *     keyed and tagged per startup. Each founder only ever reads their own rows
 *     via the verified startupId, so cache entries never cross tenants. A write
 *     that changes a founder's data calls revalidateTag(startupTag(id)) to drop
 *     that startup's entries immediately (see the profile actions); data written
 *     out-of-band (n8n sync, the match engine) simply refreshes within the TTL.
 */

function founderCache<T>(name: string, startupId: number, fn: () => Promise<T>): Promise<T> {
  return unstable_cache(fn, [name, String(startupId)], {
    revalidate: FOUNDER_TTL_SECONDS,
    tags: [startupTag(startupId)],
  })();
}

export const getOwnStartup = cache((startupId: number): Promise<Startup | null> =>
  founderCache("getOwnStartup", startupId, async () => {
    const admin = createAdminClient();
    const { data } = await admin.from("startups").select("*").eq("id", startupId).maybeSingle();
    return (data as Startup | null) ?? null;
  }),
);

export const getOwnMatches = cache(
  (
    startupId: number,
  ): Promise<(Match & { investor: Pick<Investor, "id" | "name" | "type" | "status"> | null })[]> =>
    founderCache("getOwnMatches", startupId, async () => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("matches")
        .select("*, investor:investors(id,name,type,status)")
        .eq("startup_id", startupId)
        .order("priority", { ascending: true, nullsFirst: false })
        .limit(200);
      // Paused matches (outreach Sidana paused, e.g. off-thesis) are internal —
      // never shown to founders. Keep everything else, including null-state rows.
      return ((data ?? []) as any[]).filter((m) => m.state !== "paused");
    }),
);

export const getOwnMeetings = cache((startupId: number): Promise<Meeting[]> =>
  founderCache("getOwnMeetings", startupId, async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("meetings")
      .select("*")
      .eq("startup_id", startupId)
      .order("scheduled_at", { ascending: false, nullsFirst: false })
      .limit(100);
    return (data ?? []) as Meeting[];
  }),
);

export const getOwnFunding = cache((startupId: number): Promise<any[]> =>
  founderCache("getOwnFunding", startupId, async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("funding_rounds")
      .select("*")
      .eq("startup_id", startupId)
      .order("closed_on", { ascending: false, nullsFirst: false });
    return data ?? [];
  }),
);

/** Emails on file for this startup (from Founders Info) — any of them can sign in. */
export const getOwnSignInEmails = cache((startupId: number): Promise<string[]> =>
  founderCache("getOwnSignInEmails", startupId, async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("startup_contacts")
      .select("email")
      .eq("startup_id", startupId)
      .order("id");
    return (data ?? []).map((r) => r.email as string);
  }),
);

export const getOwnDocs = cache((startupId: number): Promise<any[]> =>
  founderCache("getOwnDocs", startupId, async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from("docs")
      .select("*")
      .eq("startup_id", startupId)
      .order("created_at", { ascending: false });
    return data ?? [];
  }),
);

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
export const getOwnWeeklyReports = cache((startupId: number): Promise<WeeklyReport[]> =>
  founderCache("getOwnWeeklyReports", startupId, async () => {
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
  }),
);

/**
 * The founder's own profile submission (answers + review status), or null when
 * they have not started one or the table is not created yet. Scoped strictly
 * by the verified startupId.
 */
export const getOwnProfile = cache((startupId: number): Promise<StartupProfile | null> =>
  founderCache("getOwnProfile", startupId, async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("startup_profiles")
      .select("*")
      .eq("startup_id", startupId)
      .maybeSingle();
    if (error) return null;
    return (data as StartupProfile | null) ?? null;
  }),
);

/**
 * The deck Sidana sends to investors for this startup (mirrored hourly from the
 * Pilot sheet by n8n SYNC-DECKS). Scoped strictly by the verified startupId.
 * Returns null when there is no deck on file or the table is not created yet.
 */
export const getOwnDeck = cache((startupId: number): Promise<StartupDeck | null> =>
  founderCache("getOwnDeck", startupId, async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("startup_decks")
      .select("*")
      .eq("startup_id", startupId)
      .maybeSingle();
    if (error) return null;
    return (data as StartupDeck | null) ?? null;
  }),
);

/**
 * An investor's classified reply about this startup, read from the live mail_log
 * mirror (kept current hourly by the n8n MAIL-HISTORY workflow). reply_kind is
 * set only on inbound investor replies, so filtering on it gives exactly the
 * replies that said something — passes (with the reason in reply_gist),
 * interest, meeting asks. Scoped strictly by the verified startupId; investor
 * names are resolved from public.investors. Returns [] if the table is absent.
 */
export interface MailReply {
  investor_id: number;
  investor_name: string | null;
  sent_at: string | null;
  reply_kind: string | null; // 'pass' | 'interested' | 'invite' | 'other'
  reply_gist: string | null;
  subject: string | null;
}

export const getOwnReplies = cache((startupId: number): Promise<MailReply[]> =>
  founderCache("getOwnReplies", startupId, async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("mail_log")
      .select("investor_id, sent_at, reply_kind, reply_gist, subject")
      .eq("startup_id", startupId)
      .not("reply_kind", "is", null)
      .not("investor_id", "is", null)
      .order("sent_at", { ascending: false })
      .limit(400);
    if (error) return [];
    const rows = (data ?? []) as {
      investor_id: number;
      sent_at: string | null;
      reply_kind: string | null;
      reply_gist: string | null;
      subject: string | null;
    }[];
    const ids = Array.from(new Set(rows.map((r) => r.investor_id).filter(Boolean)));
    const names = new Map<number, string | null>();
    if (ids.length) {
      const { data: inv } = await admin.from("investors").select("id,name").in("id", ids);
      for (const i of (inv ?? []) as { id: number; name: string | null }[]) names.set(i.id, i.name);
    }
    return rows.map((r) => ({
      investor_id: r.investor_id,
      investor_name: names.get(r.investor_id) ?? null,
      sent_at: r.sent_at,
      reply_kind: r.reply_kind,
      reply_gist: r.reply_gist,
      subject: r.subject,
    }));
  }),
);

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

export const getFounderOverview = cache((startupId: number): Promise<FounderOverview> =>
  founderCache("getFounderOverview", startupId, async () => {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const [startupRes, matchCount, matchSent, meetingsUpcoming, meetingsHeld] = await Promise.all([
      admin.from("startups").select("*").eq("id", startupId).maybeSingle(),
      admin
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startupId)
        // Exclude paused matches from the count too (keep null-state rows).
        .or("state.is.null,state.neq.paused"),
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
  }),
);
