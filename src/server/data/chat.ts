import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import { ok } from "@/server/data/founder/_internal";
import { getInterests, getInvestorMeetings } from "@/server/data/investor/engagement";
import type { ChatMessage, ChatThread } from "@/shared/types/db";
import { CHAT_BUCKET, CHAT_MAX_BYTES, cleanAttachmentName, sniffAttachment } from "@/server/validators/chat-attachment";

/**
 * Investor–founder chat (clause 2.8). A pair may chat only while the investor
 * is interested in the startup AND has a meeting with it (past or upcoming).
 * chatAllowed() runs inside every read and send, never only in the UI.
 * Withdrawing interest closes the chat again; the history stays for admins.
 */

/** Pure rule, unit-tested. */
export function chatRule(input: { interested: boolean; hasMeeting: boolean }): boolean {
  return input.interested && input.hasMeeting;
}

export async function chatAllowed(investorId: number, startupId: number): Promise<boolean> {
  const interests = await getInterests(investorId);
  if (!interests.has(startupId)) return false;
  const meetings = await getInvestorMeetings(investorId);
  return chatRule({ interested: true, hasMeeting: meetings.some((m) => m.startup_id === startupId) });
}

/** Startups this investor may chat with right now. */
export async function allowedStartupsForInvestor(investorId: number): Promise<number[]> {
  const [interests, meetings] = await Promise.all([getInterests(investorId), getInvestorMeetings(investorId)]);
  const met = new Set(meetings.map((m) => m.startup_id));
  return [...interests].filter((id) => met.has(id));
}

/** Investors who may chat with this startup right now (same rule as chatAllowed, per investor). */
export async function allowedInvestorsForStartup(startupId: number): Promise<number[]> {
  const admin = createAdminClient();
  const { data } = ok(await admin.from("investor_interest").select("investor_id").eq("startup_id", startupId), "investor_interest");
  const interested = [...new Set(((data ?? []) as { investor_id: number }[]).map((r) => r.investor_id))];
  const allowed = await Promise.all(interested.map(async (id) => ((await chatAllowed(id, startupId)) ? id : null)));
  return allowed.filter((x): x is number => x != null);
}

export async function getThread(investorId: number, startupId: number): Promise<ChatThread | null> {
  const admin = createAdminClient();
  const { data } = ok(
    await admin.from("chat_threads").select("*").eq("investor_id", investorId).eq("startup_id", startupId).maybeSingle(),
    "chat_threads",
  );
  return (data as ChatThread | null) ?? null;
}

export async function getOrCreateThread(investorId: number, startupId: number): Promise<ChatThread> {
  const found = await getThread(investorId, startupId);
  if (found) return found;
  const admin = createAdminClient();
  const ins = await admin.from("chat_threads").insert({ investor_id: investorId, startup_id: startupId }).select("*").single();
  if (ins.error) {
    // Two first messages at once: the other insert won, read it.
    const again = await getThread(investorId, startupId);
    if (again) return again;
    throw new Error(`Could not open chat: ${ins.error.code || ins.error.message}`);
  }
  return ins.data as ChatThread;
}

export async function getMessages(threadId: number, limit = 300): Promise<ChatMessage[]> {
  const admin = createAdminClient();
  const { data } = ok(
    await admin.from("chat_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(limit),
    "chat_messages",
  );
  return (data ?? []) as ChatMessage[];
}

export async function getThreadsFor(side: "investor" | "founder", id: number): Promise<ChatThread[]> {
  const admin = createAdminClient();
  const { data } = ok(
    await admin
      .from("chat_threads")
      .select("*")
      .eq(side === "investor" ? "investor_id" : "startup_id", id)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    "chat_threads",
  );
  return (data ?? []) as ChatThread[];
}

/** Unread = messages from the other side after this side last read the thread. */
export async function unreadCounts(side: "investor" | "founder", threads: ChatThread[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (!threads.length) return out;
  const admin = createAdminClient();
  const other = side === "investor" ? "founder" : "investor";
  const { data } = ok(
    await admin
      .from("chat_messages")
      .select("thread_id, created_at")
      .in("thread_id", threads.map((t) => t.id))
      .eq("sender_role", other)
      .order("created_at", { ascending: false })
      .limit(2000),
    "chat_messages",
  );
  for (const t of threads) {
    const readAt = side === "investor" ? t.investor_last_read_at : t.founder_last_read_at;
    const n = ((data ?? []) as { thread_id: number; created_at: string }[]).filter(
      (m) => m.thread_id === t.id && (!readAt || Date.parse(m.created_at) > Date.parse(readAt)),
    ).length;
    out.set(t.id, n);
  }
  return out;
}

export async function markRead(threadId: number, side: "investor" | "founder"): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("chat_threads")
    .update({ [side === "investor" ? "investor_last_read_at" : "founder_last_read_at"]: new Date().toISOString() })
    .eq("id", threadId);
}

export const MAX_MESSAGE = 4000;

export interface StoredAttachment {
  path: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Checks and stores a chat attachment in the private bucket. Returns null for
 * "no file", an error for anything refused. The path is the thread id plus a
 * random id, never the uploaded name.
 */
export async function storeAttachment(
  threadId: number,
  file: FormDataEntryValue | null,
): Promise<{ ok: true; file: StoredAttachment | null } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size === 0) return { ok: true, file: null };
  if (file.size > CHAT_MAX_BYTES) return { ok: false, error: "That file is over 3 MB. Please send a smaller one." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffAttachment(bytes, file.name);
  if (!kind) return { ok: false, error: "Send an image, PDF, Excel, Word, PowerPoint or CSV file (no macros)." };
  const path = `${threadId}/${crypto.randomUUID()}.${kind.ext}`;
  const admin = createAdminClient();
  const up = await admin.storage.from(CHAT_BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false });
  if (up.error) return { ok: false, error: "Couldn't upload the file. Please try again." };
  return { ok: true, file: { path, name: cleanAttachmentName(file.name, kind.ext), type: kind.mime, size: bytes.length } };
}

export async function postMessage(
  thread: ChatThread,
  role: "investor" | "founder",
  userId: string,
  body: string,
  attachment: StoredAttachment | null = null,
): Promise<ChatMessage> {
  const admin = createAdminClient();
  const ins = await admin
    .from("chat_messages")
    .insert({
      thread_id: thread.id,
      sender_role: role,
      sender_user_id: userId,
      body,
      attachment_path: attachment?.path ?? null,
      attachment_name: attachment?.name ?? null,
      attachment_type: attachment?.type ?? null,
      attachment_size: attachment?.size ?? null,
    })
    .select("*")
    .single();
  if (ins.error) {
    if (attachment) await admin.storage.from(CHAT_BUCKET).remove([attachment.path]);
    throw new Error(`Could not send: ${ins.error.code || ins.error.message}`);
  }
  const now = (ins.data as ChatMessage).created_at ?? new Date().toISOString();
  await admin
    .from("chat_threads")
    .update({ last_message_at: now, [role === "investor" ? "investor_last_read_at" : "founder_last_read_at"]: now })
    .eq("id", thread.id);
  return ins.data as ChatMessage;
}

// ---------------------------------------------------------------- meeting notices

const SAME_CALL_MS = 30 * 60 * 1000;

/** "Tue, 18 Nov 2026 · 4:30 pm IST" */
export function istLabel(iso: string): string {
  const d = new Date(iso);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const date = `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`;
  const time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(d).toLowerCase();
  return `${date} · ${time} IST`;
}

/** Pure: which meetings still need a notice in this thread (one per call, matched by time). */
export function noticesNeeded<M extends { scheduled_at: string | null }>(meetings: M[], existing: { meeting_at: string | null }[]): M[] {
  return meetings.filter(
    (m) =>
      !!m.scheduled_at &&
      !existing.some((e) => e.meeting_at && Math.abs(Date.parse(e.meeting_at) - Date.parse(m.scheduled_at!)) < SAME_CALL_MS),
  );
}

/**
 * Posts a Sidana "meeting booked" message (date, time, Join link) into the
 * pair's thread, once per call. Used when an investor books from the portal and
 * when a chat page opens for a meeting the calendar brought in, so the first
 * thing both sides see is when to meet and how to join.
 */
export async function postMeetingNotices(
  investorId: number,
  startupId: number,
  meetings: { scheduled_at: string | null; meet_link: string | null }[],
): Promise<void> {
  const upcoming = meetings.filter((m) => m.scheduled_at && Date.parse(m.scheduled_at) > Date.now() - SAME_CALL_MS);
  if (!upcoming.length) return;
  const thread = await getOrCreateThread(investorId, startupId);
  const admin = createAdminClient();
  const { data } = ok(
    await admin.from("chat_messages").select("meeting_at").eq("thread_id", thread.id).eq("sender_role", "system"),
    "chat_messages",
  );
  const todo = noticesNeeded(upcoming, (data ?? []) as { meeting_at: string | null }[]);
  for (const m of todo) {
    const link = m.meet_link && /^https?:\/\//i.test(m.meet_link.trim()) ? m.meet_link.trim() : null;
    const ins = await admin.from("chat_messages").insert({
      thread_id: thread.id,
      sender_role: "system",
      sender_user_id: null,
      body: `Meeting booked for ${istLabel(m.scheduled_at!)}.${link ? ` Join: ${link}` : " The join link will be on the calendar invite."}`,
      meeting_at: m.scheduled_at,
      meet_link: link,
    });
    if (ins.error) console.error("meeting notice insert failed:", ins.error.code || ins.error.message);
  }
  if (todo.length) {
    await admin.from("chat_threads").update({ last_message_at: new Date().toISOString() }).eq("id", thread.id);
  }
}

/** The pair's meetings (calendar + portal), for notices on chat pages. */
export async function ensureMeetingNotices(investorId: number, startupId: number): Promise<void> {
  const meetings = (await getInvestorMeetings(investorId)).filter((m) => m.startup_id === startupId);
  await postMeetingNotices(investorId, startupId, meetings);
}
