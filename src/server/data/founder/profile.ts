import "server-only";

import { cache } from "react";
import type { StartupDeck, StartupProfile, WeeklyReport } from "@/shared/types/db";
import { createAdminClient, founderCache, ok } from "./_internal";

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

export const getOwnPrefill = cache(async (startupId: number): Promise<Record<string, unknown> | null> => {
  const admin = createAdminClient();
  const { data } = ok(
    await admin.from("startup_profile_prefill").select("answers").eq("startup_id", startupId).maybeSingle(),
    "startup_profile_prefill",
  );
  return ((data as { answers: Record<string, unknown> } | null)?.answers ?? null);
});

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
    return ((data ?? []) as WeeklyReport[]).filter(
      (r) =>
        r.source === "backfill-recomputed" ||
        (!!r.sent_to && r.source !== "weekly-dashboard-only" && r.source !== "backfill-dashboard-only"),
    );
  }),
);
