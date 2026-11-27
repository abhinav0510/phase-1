import "server-only";

import { cache } from "react";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { ok } from "@/server/data/founder/_internal";
import { OPEN_STATUSES } from "@/shared/lib/thesis";
import type { StartupStatus } from "@/shared/types/db";
import { getInvestorMeetings } from "./engagement";
import { getListedStartups, investorLogoUrl, type ListedStartup } from "./thesis";
import { getPasses } from "./signals";
import { PASS_REASON_LABEL } from "@/shared/lib/deal-signals";

/**
 * An investor's past deals: every startup Sidana emailed them about, from the
 * mail history the deal agents already sync (mail_log: one row per email, with
 * the classified reply and its gist). Read-only.
 *
 *   passed      their latest reply was a pass; the reason is the reply's gist
 *   not_closed  they were interested or met, but the round is no longer open
 *   no_reply    Sidana shared the deal and they never replied
 *   active      they're interested or have met, and the round is still open
 * The Shared deals page shows the live ones (active, and no_reply while open);
 * Past deals shows the rest.
 */

export type HistoryKind = "passed" | "not_closed" | "no_reply" | "active";

export interface MailRow {
  startup_id: number;
  sent_at: string | null;
  reply_kind: string | null;
  reply_gist: string | null;
}

export interface HistoryItem {
  kind: HistoryKind;
  startupId: number;
  /** When Sidana first shared it. */
  sharedAt: string | null;
  /** When they replied (passed / not closed). */
  repliedAt: string | null;
  /** Their reason for passing, or what they said when interested. */
  said: string | null;
  open: boolean;
}

const ENGAGED = new Set(["interested", "invite"]);
const REPLIED = new Set(["pass", "interested", "invite"]);

/** Pure, unit-tested: one entry per startup Sidana emailed them about. */
export function classifyHistory(
  rows: MailRow[],
  statusOf: (startupId: number) => StartupStatus | null | undefined,
  metWith: Set<number>,
): HistoryItem[] {
  const byStartup = new Map<number, MailRow[]>();
  for (const r of rows) byStartup.set(r.startup_id, [...(byStartup.get(r.startup_id) ?? []), r]);
  const out: HistoryItem[] = [];
  for (const [startupId, list] of byStartup) {
    const sorted = [...list].sort((a, b) => Date.parse(b.sent_at ?? "0") - Date.parse(a.sent_at ?? "0"));
    const shared = sorted.at(-1)?.sent_at ?? null;
    const latestReply = sorted.find((r) => r.reply_kind && REPLIED.has(r.reply_kind)) ?? null;
    const status = statusOf(startupId);
    const open = !!status && OPEN_STATUSES.includes(status);
    const base = { startupId, sharedAt: shared, open };

    if (latestReply?.reply_kind === "pass") {
      out.push({ ...base, kind: "passed", repliedAt: latestReply.sent_at, said: latestReply.reply_gist?.trim() || null });
    } else if ((latestReply && ENGAGED.has(latestReply.reply_kind!)) || metWith.has(startupId)) {
      out.push({ ...base, kind: open ? "active" : "not_closed", repliedAt: latestReply?.sent_at ?? null, said: latestReply?.reply_gist?.trim() || null });
    } else {
      out.push({ ...base, kind: "no_reply", repliedAt: null, said: null });
    }
  }
  return out.sort((a, b) => Date.parse(b.repliedAt ?? b.sharedAt ?? "0") - Date.parse(a.repliedAt ?? a.sharedAt ?? "0"));
}

export interface HistoryEntry extends HistoryItem {
  startup: ListedStartup | null;
  logoUrl: string | null;
}

/** Live deals Sidana shared: engaged ones and unanswered ones whose round is still open. */
export const isLiveShared = (h: HistoryItem) => h.kind === "active" || (h.kind === "no_reply" && h.open);

export const getDealHistory = cache(async (investorId: number): Promise<HistoryEntry[]> => {
  const admin = createAdminClient();
  const [mail, startups, meetings] = await Promise.all([
    admin
      .from("mail_log")
      .select("startup_id, sent_at, reply_kind, reply_gist")
      .eq("investor_id", investorId)
      .not("startup_id", "is", null)
      .order("sent_at", { ascending: false })
      .limit(1000),
    getListedStartups(),
    getInvestorMeetings(investorId),
  ]);
  const rows = (ok(mail, "mail_log").data ?? []) as MailRow[];
  // A deal whose reply opened portal access counts as shared even if its email isn't synced yet.
  const { data: viaReply } = ok(
    await admin.from("investor_interest").select("startup_id, created_at").eq("investor_id", investorId).eq("source", "email_reply"),
    "investor_interest",
  );
  for (const r of (viaReply ?? []) as { startup_id: number; created_at: string }[]) {
    if (!rows.some((m) => m.startup_id === r.startup_id)) rows.push({ startup_id: r.startup_id, sent_at: r.created_at, reply_kind: "interested", reply_gist: null });
  }
  // Passes made in the portal, with the reason the investor picked.
  for (const p of await getPasses(investorId)) {
    const reason = PASS_REASON_LABEL[p.reason_category] ?? "Passed";
    rows.push({ startup_id: p.startup_id, sent_at: p.created_at, reply_kind: "pass", reply_gist: p.reason_text ? `${reason}: ${p.reason_text}` : reason });
  }
  const byId = new Map(startups.map((s) => [s.id, s]));
  const items = classifyHistory(rows, (id) => byId.get(id)?.status, new Set(meetings.map((m) => m.startup_id)));
  return items.map((i) => {
    const s = byId.get(i.startupId) ?? null;
    return { ...i, startup: s, logoUrl: s ? investorLogoUrl(s) : null };
  });
});

/** Startups Sidana has emailed this investor about (any reply or none). */
export async function wasSharedWith(investorId: number, startupId: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = ok(
    await admin.from("mail_log").select("id").eq("investor_id", investorId).eq("startup_id", startupId).limit(1),
    "mail_log",
  );
  return (data ?? []).length > 0;
}
