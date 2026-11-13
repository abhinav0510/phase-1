import "server-only";

import { cache } from "react";
import type { InvestorProfile, Match } from "@/shared/types/db";
import { toRupees } from "@/shared/lib/currency";
import { createAdminClient, founderCache, ok, INVESTOR_PROFILE_COLS } from "./_internal";

export type { InvestorProfile };

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
      return ((data ?? []) as any[]).filter((m) => m.state !== "paused");
    }),
);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/\S*/gi;
const PHONE_RE = /(?<![\w@])(?:\+\d{1,3}[\s-]?)?(?:\(?\d\)?[\s.-]?){9,13}\d(?!\w)/g;

export function redactContacts(text: string | null): string | null {
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
  reply_kind: string | null;
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
      reply_gist: toRupees(redactContacts(r.reply_gist)),
      subject: toRupees(redactContacts(r.subject)),
    }));
  }),
);
