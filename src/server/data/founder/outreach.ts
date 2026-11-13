import "server-only";

import { cache } from "react";
import type { InvestorProfile, Match } from "@/shared/types/db";
import { toRupees } from "@/shared/lib/currency";
import { categorizedPairs, firmOf, nz, type DealCategory } from "@/shared/lib/deal-sharing";
import { getStartupDeals } from "@/server/data/pipeline";
import { createAdminClient, founderCache, ok, INVESTOR_PROFILE_COLS } from "./_internal";
import { redactContacts } from "./matches";
import { getOwnMeetings } from "./meetings";

/**
 * One investor firm this startup's deal was shared with, from the PIPELINE tab. Shaped like
 * a match row so the dashboard and Overview helpers keep working; `state` is always "sent"
 * because every row here was shared. Founder-safe: firm name only (no person, no email),
 * a response category rather than the team's notes, and a pass reason with contacts hidden.
 */
export type OutreachRow = Match & {
  investor: InvestorProfile;
  firm: string;
  /** First day the deal went to this firm (YYYY-MM-DD, IST). */
  firstShared: string;
  category: DealCategory;
  passReason: string | null;
  /** Times the deal was sent to this firm (more than 1 = shared again). */
  shares: number;
};

export interface Outreach {
  state: "ready" | "not_created" | "never_synced" | "read_failed";
  rows: OutreachRow[];
  syncedAt: string | null;
}

const SHOWN_NONE: InvestorProfile = {
  id: 0, name: null, type: null, sectors: null, stage_pref: null, cheque_min_cr: null, cheque_max_cr: null, cheque_as_written: null, geography: null,
} as unknown as InvestorProfile;

export const getOwnOutreach = cache((startupId: number): Promise<Outreach> =>
  founderCache("getOwnOutreach.v1", startupId, async () => {
    const admin = createAdminClient();
    const { data: startup } = ok(await admin.from("startups").select("name").eq("id", startupId).maybeSingle(), "startups");
    const name = (startup as { name: string | null } | null)?.name ?? null;
    const deals = await getStartupDeals(name);
    if (deals.state !== "ready") return { state: deals.state, rows: [], syncedAt: deals.syncedAt };
    if (!deals.rows.length) return { state: "ready", rows: [], syncedAt: deals.syncedAt };

    // A calendar meeting with the firm marks the deal as a meeting, as on the admin page.
    const meetings = (await getOwnMeetings(startupId)).map((m) => ({
      startup_name: name,
      investor_name: [m.notes, m.investor_name].filter(Boolean).join(" "),
      scheduled_at: m.scheduled_at,
    }));
    const pairs = categorizedPairs(deals.rows, meetings);

    // Investor profiles (type, sectors, cheque) where the firm is in the investor book.
    const { data: inv } = ok(await admin.from("investors").select(INVESTOR_PROFILE_COLS).limit(5000), "investors");
    const profiles = new Map<string, InvestorProfile>();
    for (const i of (inv ?? []) as unknown as InvestorProfile[]) {
      for (const k of [nz(i.name), nz(firmOf(i.name ?? ""))]) if (k && !profiles.has(k)) profiles.set(k, i);
    }
    const passReason = new Map<string, string>();
    for (const r of deals.rows) {
      if (r.pass_reason) passReason.set(`${nz(r.startup)}|${nz(firmOf(r.investor ?? ""))}`, r.pass_reason);
    }

    const rows = pairs
      .sort((a, b) => (a.date === b.date ? a.investor.localeCompare(b.investor) : a.date < b.date ? 1 : -1))
      .map((p, i): OutreachRow => {
        const firm = firmOf(p.investor).trim();
        const profile = profiles.get(nz(firm)) ?? { ...SHOWN_NONE, id: -(i + 1), name: firm };
        const day = p.date.slice(0, 10);
        return {
          id: i + 1,
          startup_id: startupId,
          investor_id: profile.id > 0 ? profile.id : null,
          type: null,
          state: "sent",
          score: null,
          stage_fit: null,
          cheque_fit: null,
          priority: null,
          created_at: /^\d{4}-\d\d-\d\d$/.test(day) ? `${day}T00:00:00+05:30` : new Date(0).toISOString(),
          investor: { ...profile, name: firm },
          firm,
          firstShared: day,
          category: p.category,
          passReason: p.category === "passed" ? toRupees(redactContacts(passReason.get(p.key) ?? null)) : null,
          shares: p.rows,
        } as OutreachRow;
      });
    return { state: "ready", rows, syncedAt: deals.syncedAt };
  }),
);

/** What a founder sees for each response, without the team's own wording. */
export const FOUNDER_STATUS: Record<DealCategory, string> = {
  meeting: "Meeting",
  tobook: "Meeting requested",
  interested: "Interested",
  passed: "Passed",
  referred: "Referred on",
  other: "Replied",
  bounced: "Reached out",
  none: "Reached out",
};
