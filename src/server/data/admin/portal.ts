import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { ChatMessage, ChatThread, InvestorPortalAccess, MeetingConclusion, PortalActivity } from "@/shared/types/db";

/**
 * Admin read access to everything the investor portal creates (clause 2.11).
 * Every caller has run requireAdmin(). Chats are read-only for admins.
 */

const notCreated = (code?: string) => code === "PGRST205" || code === "42P01";

async function names(table: "investors" | "startups", ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const uniq = [...new Set(ids.filter((x) => x != null))];
  if (!uniq.length) return out;
  const admin = createAdminClient();
  const { data } = await admin.from(table).select("id,name").in("id", uniq);
  for (const r of (data ?? []) as { id: number; name: string | null }[]) out.set(r.id, r.name ?? "");
  return out;
}

export interface ActivityRow extends PortalActivity {
  investor_name: string | null;
  startup_name: string | null;
}

export async function listPortalActivity(params: {
  page?: number;
  pageSize?: number;
  portal?: string | null;
}): Promise<{ rows: ActivityRow[]; total: number; ready: boolean }> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, params.pageSize ?? 50);
  let q = admin.from("portal_activity").select("*", { count: "exact" }).order("at", { ascending: false });
  if (params.portal && ["investor", "founder", "admin", "system"].includes(params.portal)) q = q.eq("portal", params.portal);
  const { data, count, error } = await q.range((page - 1) * pageSize, page * pageSize - 1);
  if (notCreated(error?.code)) return { rows: [], total: 0, ready: false };
  if (error) throw new Error(`Could not read portal_activity: ${error.code || error.message}`);
  const rows = (data ?? []) as PortalActivity[];
  const [inv, st] = await Promise.all([
    names("investors", rows.map((r) => r.investor_id!).filter(Boolean)),
    names("startups", rows.map((r) => r.startup_id!).filter(Boolean)),
  ]);
  return {
    rows: rows.map((r) => ({
      ...r,
      investor_name: r.investor_id ? inv.get(r.investor_id) ?? null : null,
      startup_name: r.startup_id ? st.get(r.startup_id) ?? null : null,
    })),
    total: count ?? 0,
    ready: true,
  };
}

export interface AdminThread extends ChatThread {
  investor_name: string;
  startup_name: string;
  message_count: number;
  last_body: string | null;
}

export async function listChatThreads(): Promise<{ rows: AdminThread[]; ready: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("chat_threads").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(500);
  if (notCreated(error?.code)) return { rows: [], ready: false };
  if (error) throw new Error(`Could not read chat_threads: ${error.code || error.message}`);
  const threads = (data ?? []) as ChatThread[];
  if (!threads.length) return { rows: [], ready: true };
  const [inv, st, msgs] = await Promise.all([
    names("investors", threads.map((t) => t.investor_id)),
    names("startups", threads.map((t) => t.startup_id)),
    admin.from("chat_messages").select("thread_id, body, attachment_name, created_at").in("thread_id", threads.map((t) => t.id)).order("created_at", { ascending: false }).limit(5000),
  ]);
  const all = (msgs.data ?? []) as Pick<ChatMessage, "thread_id" | "body" | "attachment_name" | "created_at">[];
  return {
    rows: threads.map((t) => {
      const mine = all.filter((m) => m.thread_id === t.id);
      return {
        ...t,
        investor_name: inv.get(t.investor_id) ?? `Investor ${t.investor_id}`,
        startup_name: st.get(t.startup_id) ?? `Startup ${t.startup_id}`,
        message_count: mine.length,
        last_body: mine[0] ? mine[0].body || (mine[0].attachment_name ? `Attachment: ${mine[0].attachment_name}` : null) : null,
      };
    }),
    ready: true,
  };
}

export async function getChatTranscript(threadId: number): Promise<{ thread: AdminThread; messages: ChatMessage[] } | null> {
  const { rows } = await listChatThreads();
  const thread = rows.find((t) => t.id === threadId);
  if (!thread) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("chat_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(2000);
  return { thread, messages: (data ?? []) as ChatMessage[] };
}

/** Fireflies conclusions (overview) and whether a meeting was booked in the portal, for the admin meetings table. */
export async function meetingExtras(meetings: { id: number; fireflies_id: string | null; meet_link: string | null }[]): Promise<{
  conclusion: Map<number, string>;
  portalBooked: Set<number>;
}> {
  const conclusion = new Map<number, string>();
  const portalBooked = new Set<number>();
  if (!meetings.length) return { conclusion, portalBooked };
  const admin = createAdminClient();
  const ffIds = meetings.map((m) => m.fireflies_id).filter((x): x is string => !!x);
  const links = meetings.map((m) => m.meet_link?.trim()).filter((x): x is string => !!x);
  const [byId, byFf, portal] = await Promise.all([
    admin.from("meeting_conclusions").select("ff_id,meeting_id,overview").in("meeting_id", meetings.map((m) => m.id)),
    ffIds.length ? admin.from("meeting_conclusions").select("ff_id,meeting_id,overview").in("ff_id", ffIds) : Promise.resolve({ data: [], error: null }),
    links.length ? admin.from("portal_meetings").select("meet_link").in("meet_link", links) : Promise.resolve({ data: [], error: null }),
  ]);
  const rows = [...((byId.data ?? []) as MeetingConclusion[]), ...((byFf.data ?? []) as MeetingConclusion[])];
  const portalLinks = new Set(((portal.data ?? []) as { meet_link: string | null }[]).map((p) => p.meet_link?.trim()));
  for (const m of meetings) {
    const hit = rows.find((r) => r.meeting_id === m.id) ?? rows.find((r) => !!m.fireflies_id && r.ff_id === m.fireflies_id);
    if (hit?.overview) conclusion.set(m.id, hit.overview);
    if (m.meet_link && portalLinks.has(m.meet_link.trim())) portalBooked.add(m.id);
  }
  return { conclusion, portalBooked };
}

export interface AccessRow extends InvestorPortalAccess {
  investor_name: string;
  startup_name: string | null;
  signed_in: boolean;
}

export async function listPortalAccess(): Promise<{ rows: AccessRow[]; ready: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("investor_portal_access").select("*").order("granted_at", { ascending: false }).limit(1000);
  if (notCreated(error?.code)) return { rows: [], ready: false };
  if (error) throw new Error(`Could not read investor_portal_access: ${error.code || error.message}`);
  const rows = (data ?? []) as InvestorPortalAccess[];
  const [inv, st] = await Promise.all([
    names("investors", rows.map((r) => r.investor_id)),
    names("startups", rows.map((r) => r.startup_id!).filter(Boolean)),
  ]);
  return {
    rows: rows.map((r) => ({
      ...r,
      investor_name: inv.get(r.investor_id) ?? `Investor ${r.investor_id}`,
      startup_name: r.startup_id ? st.get(r.startup_id) ?? null : null,
      signed_in: !!r.first_signin_at,
    })),
    ready: true,
  };
}

export interface UnresolvedEngagement {
  deal_id: string | null;
  startup_name: string | null;
  investor_name: string | null;
  via: string;
  investor_id: number | null;
  startup_id: number | null;
}

/** Engaged replies the grant function couldn't tie to an investor or startup (view from MIGRATIONS/017). */
export async function listUnresolvedEngagements(): Promise<UnresolvedEngagement[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("portal_engaged_unresolved").select("*").limit(200);
  if (error) return [];
  return (data ?? []) as UnresolvedEngagement[];
}

export async function listUnlinkedConclusions(): Promise<MeetingConclusion[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("meeting_conclusions")
    .select("*")
    .is("meeting_id", null)
    .order("meeting_date", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) return [];
  return (data ?? []) as MeetingConclusion[];
}
