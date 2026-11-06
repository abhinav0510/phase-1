import "server-only";

import { cache } from "react";
import { toFounderMeetings, withPastMeetingsHeld } from "@/server/data/meetings";
import type { Meeting } from "@/shared/types/db";
import { createAdminClient, founderCache, ok } from "./_internal";

export const getOwnMeetings = cache(async (startupId: number): Promise<Meeting[]> =>
  withPastMeetingsHeld(await loadMeetings(startupId), Date.now()),
);

const loadMeetings = (startupId: number): Promise<Meeting[]> =>
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
  });
