import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { FOUNDER_TTL_SECONDS, startupTag } from "@/lib/cache-tags";
import { freshOrRefetch } from "@/lib/cached-read";
import { toFounderMeetings } from "@/lib/meetings";
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
 *
 * A failed read throws (see `ok`), so it is never saved as "no data". The page shows
 * the error screen, or the last good copy when there is one.
 */

/**
 * The investor fields a founder may see. Deliberately excludes every contact
 * channel (email, cc_email, linkedin_url, contact_person) and internal desk
 * fields (status, do_not_contact, suppressed, notes, source) — only these
 * columns are ever selected for founder reads, so nothing else reaches the client.
 */
export type InvestorProfile = Pick<
  Investor,
  "id" | "name" | "type" | "sectors" | "stage_pref" | "cheque_min_cr" | "cheque_max_cr" | "cheque_as_written" | "geography"
>;

const INVESTOR_PROFILE_COLS = "id,name,type,sectors,stage_pref,cheque_min_cr,cheque_max_cr,cheque_as_written,geography";

async function founderCache<T>(name: string, startupId: number, fn: () => Promise<T>): Promise<T> {
  const read = unstable_cache(async () => ({ at: Date.now(), value: await fn() }), ["v3", name, String(startupId)], {
    revalidate: FOUNDER_TTL_SECONDS,
    tags: [startupTag(startupId)],
  });
  return freshOrRefetch(await read(), FOUNDER_TTL_SECONDS * 1000, fn);
}

/** Postgres and PostgREST codes for a table that hasn't been created yet. */
const TABLE_NOT_CREATED = new Set(["42P01", "PGRST205"]);

/** A table that isn't created yet reads as empty; any other failure throws. */
function ok<R extends { error: { code?: string; message: string } | null }>(res: R, what: string): R {
  if (res.error && !TABLE_NOT_CREATED.has(res.error.code ?? "")) {
    throw new Error(`Could not read ${what}: ${res.error.code || res.error.message}`);
  }
  return res;
}

export const getOwnStartup = cache((startupId: number): Promise<Startup | null> =>
  founderCache("getOwnStartup", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(await admin.from("startups").select("*").eq("id", startupId).maybeSingle(), "startups");
    return (data as Startup | null) ?? null;
  }),
);

export const getOwnMatches = cache(
  (
    startupId: number,
  ): Promise<(Match & { investor: InvestorProfile | null })[]> =>
    founderCache("getOwnMatches.v2", startupId, async () => {
      const admin = createAdminClient();
      const { data } = ok(
        await admin
          .from("matches")
          .select(`*, investor:investors(${INVESTOR_PROFILE_COLS})`)
          .eq("startup_id", startupId)
          .order("priority", { ascending: true, nullsFirst: false })
          .limit(200),
        "matches",
      );
      // Paused matches (outreach Sidana paused, e.g. off-thesis) are internal —
      // never shown to founders. Keep everything else, including null-state rows.
      return ((data ?? []) as any[]).filter((m) => m.state !== "paused");
    }),
);

export const getOwnMeetings = cache((startupId: number): Promise<Meeting[]> =>
  founderCache("getOwnMeetings.v2", startupId, async () => {
    const admin = createAdminClient();
    const [meetingsRes, startupRes] = await Promise.all([
      admin
        .from("meetings")
        .select("*")
        .eq("startup_id", startupId)
        .order("scheduled_at", { ascending: false, nullsFirst: false })
        .limit(300),
      admin.from("startups").select("name").eq("id", startupId).maybeSingle(),
    ]);
    const rows = (ok(meetingsRes, "meetings").data ?? []) as Meeting[];
    const startup = ok(startupRes, "startups").data;
    const ids = [...new Set(rows.map((m) => m.investor_id).filter((id): id is number => id != null))];
    const investorNames = new Map<number, string>();
    if (ids.length) {
      const { data: inv } = ok(await admin.from("investors").select("id,name").in("id", ids), "investors");
      for (const i of (inv ?? []) as { id: number; name: string }[]) investorNames.set(i.id, i.name);
    }
    return toFounderMeetings(rows, startup?.name, investorNames);
  }),
);

export const getOwnFunding = cache((startupId: number): Promise<any[]> =>
  founderCache("getOwnFunding", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin
        .from("funding_rounds")
        .select("*")
        .eq("startup_id", startupId)
        .order("closed_on", { ascending: false, nullsFirst: false }),
      "funding_rounds",
    );
    return data ?? [];
  }),
);

/** Emails on file for this startup (from Founders Info) — any of them can sign in. */
export const getOwnSignInEmails = cache((startupId: number): Promise<string[]> =>
  founderCache("getOwnSignInEmails", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin.from("startup_contacts").select("email").eq("startup_id", startupId).order("id"),
      "startup_contacts",
    );
    return (data ?? []).map((r) => r.email as string);
  }),
);

export const getOwnDocs = cache((startupId: number): Promise<any[]> =>
  founderCache("getOwnDocs", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin.from("docs").select("*").eq("startup_id", startupId).order("created_at", { ascending: false }),
      "docs",
    );
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
 * Returns [] when the table is empty or not created yet, and throws on a failed read.
 */
export const getOwnWeeklyReports = cache((startupId: number): Promise<WeeklyReport[]> =>
  founderCache("getOwnWeeklyReports.v2", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin
        .from("weekly_reports")
        .select("*")
        .eq("startup_id", startupId)
        .order("week_start", { ascending: false })
        .limit(52),
      "weekly_reports",
    );
    // Hide quiet weeks the Saturday run saved without emailing the founder.
    // Keep emailed weeks and the history rebuilt by the backfill.
    return ((data ?? []) as WeeklyReport[]).filter(
      (r) =>
        r.source === "backfill-recomputed" ||
        (!!r.sent_to && r.source !== "weekly-dashboard-only" && r.source !== "backfill-dashboard-only"),
    );
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
    const { data } = ok(
      await admin.from("startup_profiles").select("*").eq("startup_id", startupId).maybeSingle(),
      "startup_profiles",
    );
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
    const { data } = ok(
      await admin.from("startup_decks").select("*").eq("startup_id", startupId).maybeSingle(),
      "startup_decks",
    );
    return (data as StartupDeck | null) ?? null;
  }),
);

/**
 * An investor's classified reply about this startup, read from the live mail_log
 * mirror (kept current hourly by the n8n MAIL-HISTORY workflow). reply_kind is
 * set only on inbound investor replies, so filtering on it gives exactly the
 * replies that said something — passes (with the reason in reply_gist),
 * interest, meeting asks. Scoped strictly by the verified startupId; investor
 * names are resolved from public.investors. Returns [] if the table isn't created yet.
 */
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/\S*/gi;
const PHONE_RE = /(?<![\w@])(?:\+\d{1,3}[\s-]?)?(?:\(?\d\)?[\s.-]?){9,13}\d(?!\w)/g;

/** Reply gists are investor mail; strip any email, phone or LinkedIn link before a founder sees them. */
function redactContacts(text: string | null): string | null {
  if (!text) return text;
  return text
    .replace(EMAIL_RE, "[email hidden]")
    .replace(LINKEDIN_RE, "[profile link hidden]")
    .replace(PHONE_RE, (m) => (m.replace(/\D/g, "").length >= 10 ? "[phone hidden]" : m));
}

export interface MailReply {
  investor_id: number;
  investor_name: string | null;
  investor: InvestorProfile | null;
  sent_at: string | null;
  reply_kind: string | null; // 'pass' | 'interested' | 'invite' | 'other'
  reply_gist: string | null;
  subject: string | null;
}

export const getOwnReplies = cache((startupId: number): Promise<MailReply[]> =>
  founderCache("getOwnReplies.v3", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin
        .from("mail_log")
        .select("investor_id, sent_at, reply_kind, reply_gist, subject")
        .eq("startup_id", startupId)
        .not("reply_kind", "is", null)
        .not("investor_id", "is", null)
        .order("sent_at", { ascending: false })
        .limit(400),
      "mail_log",
    );
    const rows = (data ?? []) as {
      investor_id: number;
      sent_at: string | null;
      reply_kind: string | null;
      reply_gist: string | null;
      subject: string | null;
    }[];
    const ids = Array.from(new Set(rows.map((r) => r.investor_id).filter(Boolean)));
    const profiles = new Map<number, InvestorProfile>();
    if (ids.length) {
      const { data: inv } = ok(await admin.from("investors").select(INVESTOR_PROFILE_COLS).in("id", ids), "investors");
      for (const i of (inv ?? []) as unknown as InvestorProfile[]) profiles.set(i.id, i);
    }
    return rows.map((r) => ({
      investor_id: r.investor_id,
      investor_name: profiles.get(r.investor_id)?.name ?? null,
      investor: profiles.get(r.investor_id) ?? null,
      sent_at: r.sent_at,
      reply_kind: r.reply_kind,
      reply_gist: redactContacts(r.reply_gist),
      subject: redactContacts(r.subject),
    }));
  }),
);

/** The founder's uploaded company logo (MIGRATIONS/startup-branding.sql), or null. */
export interface StartupBranding {
  logo_path: string | null;
  logo_content_type: string | null;
  updated_at: string | null;
}

export const getOwnBranding = cache((startupId: number): Promise<StartupBranding | null> =>
  founderCache("getOwnBranding", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin
        .from("startup_branding")
        .select("logo_path, logo_content_type, updated_at")
        .eq("startup_id", startupId)
        .maybeSingle(),
      "startup_branding",
    );
    return (data as StartupBranding | null) ?? null;
  }),
);

/** Versioned URL for the founder's own logo; the version busts the browser cache on change. */
export function logoUrlFor(b: StartupBranding | null): string | null {
  if (!b?.logo_path) return null;
  return `/api/founder/logo?v=${encodeURIComponent(b.updated_at ?? b.logo_path)}`;
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

export const getFounderOverview = cache((startupId: number): Promise<FounderOverview> =>
  founderCache("getFounderOverview.v2", startupId, async () => {
    const admin = createAdminClient();
    const now = Date.now();
    const [startupRes, matchCount, matchSent, meetings] = await Promise.all([
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
      // Same de-duplicated, investor-only list the Meetings page shows.
      getOwnMeetings(startupId),
    ]);

    const startup = (ok(startupRes, "startups").data as Startup | null) ?? null;
    return {
      startup,
      matchCount: ok(matchCount, "matches").count ?? 0,
      matchSent: ok(matchSent, "matches").count ?? 0,
      meetingsUpcoming: meetings.filter((m) => !!m.scheduled_at && Date.parse(m.scheduled_at) >= now && !m.held).length,
      meetingsHeld: meetings.filter((m) => m.held).length,
      profileCompletion: computeProfileCompletion(startup),
    };
  }),
);
