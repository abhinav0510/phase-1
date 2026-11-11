import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { DealMail } from "@/shared/lib/deal-shares";
import type { StartupDeck } from "@/shared/types/db";

/**
 * Every email the deal agents sent about this startup (mail_log), with the investor's
 * name. For the team only: unlike the founder view, replies are not redacted.
 */
export async function getDealMails(startupId: number): Promise<{ mails: DealMail[]; failed: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mail_log")
    .select("investor_id, sent_at, reply_kind, reply_gist, subject, investor:investors(name)")
    .eq("startup_id", startupId)
    .order("sent_at", { ascending: false })
    .limit(1000);
  if (error) return { mails: [], failed: true };
  return {
    mails: ((data ?? []) as any[]).map((r) => ({
      investor_id: r.investor_id ?? null,
      investor_name: r.investor?.name ?? null,
      sent_at: r.sent_at ?? null,
      reply_kind: r.reply_kind ?? null,
      reply_gist: r.reply_gist ?? null,
      subject: r.subject ?? null,
    })),
    failed: false,
  };
}

/** The deck link investors receive, as mirrored from the Pilot sheet (null if none). */
export async function getStartupDeck(startupId: number): Promise<StartupDeck | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("startup_decks").select("*").eq("startup_id", startupId).maybeSingle();
  return error ? null : ((data as StartupDeck | null) ?? null);
}
