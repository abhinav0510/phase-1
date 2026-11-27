import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import { ok } from "@/server/data/founder/_internal";
import type { MeetingConclusion } from "@/shared/types/db";

/**
 * Fireflies conclusions (clauses 2.9, 2.10). Copied into `meeting_conclusions`
 * by the n8n workflow FF-CONCLUSIONS-SYNC and linked to meetings by
 * link_meeting_conclusions(). Investors and founders see only `overview`;
 * action items and the transcript are never shown to them.
 */

export interface Conclusion {
  ffId: string;
  overview: string;
  meetingDate: string | null;
}

/** Conclusions for these meetings, keyed by meeting id. Also matches on the meeting's own fireflies_id. */
export async function getConclusionsForMeetings(
  meetings: { id: number; fireflies_id?: string | null }[],
): Promise<Map<number, Conclusion>> {
  const out = new Map<number, Conclusion>();
  const ids = [...new Set(meetings.map((m) => m.id))];
  const ffIds = [...new Set(meetings.map((m) => m.fireflies_id).filter((x): x is string => !!x))];
  if (!ids.length) return out;
  const admin = createAdminClient();
  const [byMeeting, byFf] = await Promise.all([
    admin.from("meeting_conclusions").select("ff_id,meeting_id,overview,meeting_date").in("meeting_id", ids),
    ffIds.length
      ? admin.from("meeting_conclusions").select("ff_id,meeting_id,overview,meeting_date").in("ff_id", ffIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const rows = [
    ...((ok(byMeeting, "meeting_conclusions").data ?? []) as MeetingConclusion[]),
    ...((ok(byFf as typeof byMeeting, "meeting_conclusions").data ?? []) as MeetingConclusion[]),
  ];
  for (const m of meetings) {
    const hit = rows.find((r) => r.meeting_id === m.id) ?? (m.fireflies_id ? rows.find((r) => r.ff_id === m.fireflies_id) : undefined);
    if (hit?.overview?.trim()) out.set(m.id, { ffId: hit.ff_id, overview: hit.overview.trim(), meetingDate: hit.meeting_date });
  }
  return out;
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const contains = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a));

export interface LinkMeeting {
  id: number;
  scheduled_at: string | null;
  fireflies_id: string | null;
  startup_name: string | null;
  investor_name: string | null;
}

/**
 * TypeScript mirror of link_meeting_conclusions() in MIGRATIONS/016, so the rule
 * is unit-tested: fireflies_id first, else the closest meeting within 3 hours
 * whose startup or investor name matches the Fireflies guesses.
 */
export function linkConclusion(
  c: Pick<MeetingConclusion, "ff_id" | "meeting_date" | "startup_guess" | "investor_guess">,
  meetings: LinkMeeting[],
): number | null {
  const byId = meetings.find((m) => m.fireflies_id && m.fireflies_id === c.ff_id);
  if (byId) return byId.id;
  if (!c.meeting_date) return null;
  const at = Date.parse(c.meeting_date);
  const window = 3 * 60 * 60 * 1000;
  const sg = norm(c.startup_guess);
  const ig = norm(c.investor_guess);
  const hits = meetings
    .filter((m) => m.scheduled_at && Math.abs(Date.parse(m.scheduled_at) - at) <= window)
    .filter((m) => contains(norm(m.startup_name), sg) || contains(norm(m.investor_name), ig))
    .sort((a, b) => Math.abs(Date.parse(a.scheduled_at!) - at) - Math.abs(Date.parse(b.scheduled_at!) - at));
  return hits[0]?.id ?? null;
}
