import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type {
  Announcement,
  AnnouncementAudience,
  ContactSyncRun,
  EmailBroadcast,
  EmailBroadcastRecipient,
  StartupStatus,
} from "@/shared/types/db";

/**
 * Notifications data access (service role). Admin-facing functions must only be
 * called after requireAdmin(); getAnnouncementsForUser is scoped to the caller's
 * own verified auth id and audience.
 */

export interface StartupRecipient {
  id: number;
  name: string;
  status: StartupStatus | null;
  emails: string[];
  founderName: string | null;
}

/** Every platform startup with the emails on file for it (possibly none), A→Z. */
export async function getStartupRecipients(): Promise<StartupRecipient[]> {
  const admin = createAdminClient();
  const [startupsRes, contactsRes] = await Promise.all([
    admin.from("startups").select("id,name,status"),
    admin.from("startup_contacts").select("startup_id,email,founder_name").order("id"),
  ]);
  const byStartup = new Map<number, { emails: string[]; founderName: string | null }>();
  for (const c of (contactsRes.data ?? []) as {
    startup_id: number;
    email: string;
    founder_name: string | null;
  }[]) {
    const entry = byStartup.get(c.startup_id) ?? { emails: [], founderName: null };
    if (!entry.emails.includes(c.email)) entry.emails.push(c.email);
    if (!entry.founderName && c.founder_name) entry.founderName = c.founder_name;
    byStartup.set(c.startup_id, entry);
  }
  return ((startupsRes.data ?? []) as { id: number; name: string | null; status: StartupStatus | null }[])
    .map((s) => ({
      id: s.id,
      name: s.name ?? `Startup #${s.id}`,
      status: s.status,
      emails: byStartup.get(s.id)?.emails ?? [],
      founderName: byStartup.get(s.id)?.founderName ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLastContactSync(): Promise<ContactSyncRun | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("contact_sync_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ContactSyncRun | null) ?? null;
}

export async function listBroadcasts(limit = 25): Promise<EmailBroadcast[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_broadcasts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as EmailBroadcast[];
}

export async function getBroadcastDetail(id: number): Promise<{
  broadcast: EmailBroadcast | null;
  recipients: EmailBroadcastRecipient[];
}> {
  const admin = createAdminClient();
  const [b, r] = await Promise.all([
    admin.from("email_broadcasts").select("*").eq("id", id).maybeSingle(),
    admin
      .from("email_broadcast_recipients")
      .select("*")
      .eq("broadcast_id", id)
      .order("startup_name", { ascending: true, nullsFirst: false }),
  ]);
  return {
    broadcast: (b.data as EmailBroadcast | null) ?? null,
    recipients: (r.data ?? []) as EmailBroadcastRecipient[],
  };
}

export type AnnouncementWithReach = Announcement & { seenBy: number };

/** All announcements for the admin list, newest first, with how many users dismissed each. */
export async function listAnnouncementsAdmin(): Promise<AnnouncementWithReach[]> {
  const admin = createAdminClient();
  const [a, d] = await Promise.all([
    admin.from("announcements").select("*").order("created_at", { ascending: false }).limit(100),
    admin.from("announcement_dismissals").select("announcement_id"),
  ]);
  const seen = new Map<number, number>();
  for (const row of (d.data ?? []) as { announcement_id: number }[]) {
    seen.set(row.announcement_id, (seen.get(row.announcement_id) ?? 0) + 1);
  }
  return ((a.data ?? []) as Announcement[]).map((x) => ({ ...x, seenBy: seen.get(x.id) ?? 0 }));
}

export interface UserAnnouncements {
  items: Pick<Announcement, "id" | "title" | "body" | "kind" | "publish_at">[];
  unreadIds: number[];
}

/**
 * Live announcements visible to this user (active, published, not expired, and
 * aimed at "all" or their audience) plus which of them they haven't dismissed.
 * Never throws: a failure here must not break the dashboard, so it degrades to
 * "no announcements".
 */
export async function getAnnouncementsForUser(
  userId: string,
  audience: Exclude<AnnouncementAudience, "all">,
): Promise<UserAnnouncements> {
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("announcements")
      .select("id,title,body,kind,publish_at")
      .eq("is_active", true)
      .in("audience", ["all", audience])
      .lte("publish_at", nowIso)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("publish_at", { ascending: false })
      .limit(20);
    if (error || !data?.length) return { items: [], unreadIds: [] };

    const items = data as UserAnnouncements["items"];
    const { data: dismissed } = await admin
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", userId)
      .in(
        "announcement_id",
        items.map((i) => i.id),
      );
    const done = new Set(
      ((dismissed ?? []) as { announcement_id: number }[]).map((r) => r.announcement_id),
    );
    return { items, unreadIds: items.filter((i) => !done.has(i.id)).map((i) => i.id) };
  } catch {
    return { items: [], unreadIds: [] };
  }
}
