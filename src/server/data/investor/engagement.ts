import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { FOUNDER_TTL_SECONDS } from "@/server/config/cache-tags";
import { toFounderMeetings, withPastMeetingsHeld } from "@/server/data/meetings";
import { ok } from "@/server/data/founder/_internal";
import { normKey } from "@/shared/lib/thesis";
import type { Meeting, PortalMeeting } from "@/shared/types/db";
import { getInvestorSelf } from "./thesis";

/**
 * Interest and meetings for the investor portal: who is interested in what,
 * which meetings an investor has, and the per-startup "investors interested"
 * count (clause 2.5). Calendar rows (public.meetings) and portal bookings
 * (portal_meetings) describe the same call once CAL-SYNC picks a booking up, so
 * they are merged before anything is counted or shown.
 */

export interface PairMeeting {
  key: string;
  startup_id: number;
  investor_id: number | null;
  scheduled_at: string | null;
  held: boolean;
  meet_link: string | null;
  fireflies_id: string | null;
  meeting_id: number | null;
  portal_meeting_id: number | null;
  /** The other side's name as the calendar wrote it. */
  counterparty: string | null;
}

const SAME_CALL_MS = 30 * 60 * 1000;

/** Drops portal bookings that CAL-SYNC has already brought in as a `meetings` row. Pure. */
export function mergePortalMeetings(synced: Meeting[], portal: PortalMeeting[]): PortalMeeting[] {
  return portal.filter((p) => {
    if (p.status === "cancelled") return false;
    const at = Date.parse(p.scheduled_at);
    return !synced.some(
      (m) =>
        (!!p.meet_link && !!m.meet_link && m.meet_link.trim() === p.meet_link.trim()) ||
        (m.startup_id === p.startup_id &&
          (m.investor_id == null || m.investor_id === p.investor_id) &&
          !!m.scheduled_at &&
          Math.abs(Date.parse(m.scheduled_at) - at) < SAME_CALL_MS),
    );
  });
}

const fromSynced = (m: Meeting): PairMeeting => ({
  key: `m${m.id}`,
  startup_id: m.startup_id!,
  investor_id: m.investor_id,
  scheduled_at: m.scheduled_at,
  held: !!m.held,
  meet_link: m.meet_link,
  fireflies_id: m.fireflies_id,
  meeting_id: m.id,
  portal_meeting_id: null,
  counterparty: m.investor_name,
});

const fromPortal = (p: PortalMeeting, now: number): PairMeeting => ({
  key: `p${p.id}`,
  startup_id: p.startup_id,
  investor_id: p.investor_id,
  scheduled_at: p.scheduled_at,
  held: Date.parse(p.scheduled_at) < now,
  meet_link: p.meet_link,
  fireflies_id: null,
  meeting_id: null,
  portal_meeting_id: p.id,
  counterparty: null,
});

async function startupNames(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (!ids.length) return out;
  const admin = createAdminClient();
  const { data } = ok(await admin.from("startups").select("id,name").in("id", ids), "startups");
  for (const r of (data ?? []) as { id: number; name: string | null }[]) out.set(r.id, r.name ?? "");
  return out;
}

async function investorNames(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  if (!ids.length) return out;
  const admin = createAdminClient();
  const { data } = ok(await admin.from("investors").select("id,name").in("id", ids), "investors");
  for (const r of (data ?? []) as { id: number; name: string | null }[]) out.set(r.id, r.name ?? "");
  return out;
}

/** Calendar rows grouped by startup and cleaned the same way the founder portal does. */
async function cleanByStartup(rows: Meeting[]): Promise<Meeting[]> {
  const byStartup = new Map<number, Meeting[]>();
  for (const r of rows) {
    if (r.startup_id == null) continue;
    byStartup.set(r.startup_id, [...(byStartup.get(r.startup_id) ?? []), r]);
  }
  const [sNames, iNames] = await Promise.all([
    startupNames([...byStartup.keys()]),
    investorNames([...new Set(rows.map((r) => r.investor_id).filter((x): x is number => x != null))]),
  ]);
  return [...byStartup].flatMap(([sid, list]) => withPastMeetingsHeld(toFounderMeetings(list, sNames.get(sid), iNames), Date.now()));
}

/** Startups this investor has marked interested in (or that their reply did). */
export const getInterests = cache(async (investorId: number): Promise<Set<number>> => {
  const admin = createAdminClient();
  const { data } = ok(await admin.from("investor_interest").select("startup_id").eq("investor_id", investorId), "investor_interest");
  return new Set(((data ?? []) as { startup_id: number }[]).map((r) => r.startup_id));
});

export async function isInterested(investorId: number, startupId: number): Promise<boolean> {
  return (await getInterests(investorId)).has(startupId);
}

/**
 * Every meeting this investor has, with any startup: calendar rows linked to
 * them (or, when the row has no investor, whose title names them) plus portal
 * bookings not yet synced.
 */
export const getInvestorMeetings = cache(async (investorId: number): Promise<PairMeeting[]> => {
  const self = await getInvestorSelf(investorId);
  const name = self?.name ?? "";
  const nameKey = normKey(name);
  const admin = createAdminClient();
  const like = name.replace(/[%_,()]/g, " ").trim();
  const orFilter = like.length >= 3
    ? `investor_id.eq.${investorId},investor_name.ilike.%${like}%,notes.ilike.%${like}%`
    : `investor_id.eq.${investorId}`;
  const [m, p] = await Promise.all([
    admin.from("meetings").select("*").or(orFilter).order("scheduled_at", { ascending: false, nullsFirst: false }).limit(300),
    admin.from("portal_meetings").select("*").eq("investor_id", investorId).limit(200),
  ]);
  const cleaned = (await cleanByStartup((ok(m, "meetings").data ?? []) as Meeting[])).filter((row) => {
    if (row.investor_id === investorId) return true;
    const k = normKey(row.investor_name);
    return !!k && !!nameKey && (k.includes(nameKey) || nameKey.includes(k));
  });
  const portal = mergePortalMeetings(cleaned, (ok(p, "portal_meetings").data ?? []) as PortalMeeting[]);
  const now = Date.now();
  return [...cleaned.map(fromSynced), ...portal.map((x) => fromPortal(x, now))].sort(
    (a, b) => Date.parse(b.scheduled_at ?? "0") - Date.parse(a.scheduled_at ?? "0"),
  );
});

/** Every meeting a startup has (calendar + portal), cleaned and merged. */
export async function getStartupMeetings(startupId: number): Promise<PairMeeting[]> {
  const admin = createAdminClient();
  const [m, p] = await Promise.all([
    admin.from("meetings").select("*").eq("startup_id", startupId).order("scheduled_at", { ascending: false, nullsFirst: false }).limit(300),
    admin.from("portal_meetings").select("*").eq("startup_id", startupId).limit(300),
  ]);
  const cleaned = await cleanByStartup((ok(m, "meetings").data ?? []) as Meeting[]);
  const portal = mergePortalMeetings(cleaned, (ok(p, "portal_meetings").data ?? []) as PortalMeeting[]);
  const now = Date.now();
  return [...cleaned.map(fromSynced), ...portal.map((x) => fromPortal(x, now))];
}

/**
 * "Investors interested" for each startup (clause 2.5): meetings held plus
 * meetings coming up, counted once each. Only the number leaves the server.
 */
export async function getInterestedCounts(startupIds: number[]): Promise<Map<number, number>> {
  const ids = [...new Set(startupIds)].sort((a, b) => a - b);
  if (!ids.length) return new Map();
  const read = unstable_cache(
    async () => {
      const admin = createAdminClient();
      const [m, p] = await Promise.all([
        admin.from("meetings").select("*").in("startup_id", ids).limit(5000),
        admin.from("portal_meetings").select("*").in("startup_id", ids).limit(5000),
      ]);
      const cleaned = await cleanByStartup((ok(m, "meetings").data ?? []) as Meeting[]);
      const portal = mergePortalMeetings(cleaned, (ok(p, "portal_meetings").data ?? []) as PortalMeeting[]);
      const counts: [number, number][] = ids.map((id) => [
        id,
        cleaned.filter((x) => x.startup_id === id).length + portal.filter((x) => x.startup_id === id).length,
      ]);
      return counts;
    },
    ["v1", "interested-counts", ids.join(",")],
    { revalidate: FOUNDER_TTL_SECONDS },
  );
  return new Map(await read());
}

/** True when this investor has a meeting (past or upcoming) with this startup. */
export async function hasMeetingWith(investorId: number, startupId: number): Promise<boolean> {
  return (await getInvestorMeetings(investorId)).some((m) => m.startup_id === startupId);
}
