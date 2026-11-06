import "server-only";

import { cache } from "react";
import type { Startup } from "@/shared/types/db";
import { createAdminClient, founderCache, ok } from "./_internal";
import { getOwnMeetings } from "./meetings";

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
        .or("state.is.null,state.neq.paused"),
      admin
        .from("matches")
        .select("*", { count: "exact", head: true })
        .eq("startup_id", startupId)
        .eq("state", "sent"),
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
