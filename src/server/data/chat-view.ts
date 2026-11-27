import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import { ok } from "@/server/data/founder/_internal";
import { getMessages, getThreadsFor, unreadCounts } from "./chat";
import type { ChatMessage } from "@/shared/types/db";

/**
 * Builds what a chat page shows for one side. `allowed` is the list of
 * counterpart ids that may chat right now; only those appear, so a pair whose
 * chat closed (interest withdrawn) disappears from both lists.
 */

export interface ChatSummary {
  otherId: number;
  name: string;
  preview: string;
  unread: number;
}

export async function chatSummaries(side: "investor" | "founder", selfId: number, allowed: number[]): Promise<ChatSummary[]> {
  if (!allowed.length) return [];
  const admin = createAdminClient();
  const threads = await getThreadsFor(side, selfId);
  const unread = await unreadCounts(side, threads);
  const otherOf = (t: { investor_id: number; startup_id: number }) => (side === "investor" ? t.startup_id : t.investor_id);
  const table = side === "investor" ? "startups" : "investors";
  const { data } = ok(await admin.from(table).select("id,name").in("id", allowed), table);
  const names = new Map(((data ?? []) as { id: number; name: string | null }[]).map((r) => [r.id, r.name ?? ""]));

  const lastBody = new Map<number, string>();
  const ids = threads.filter((t) => allowed.includes(otherOf(t))).map((t) => t.id);
  if (ids.length) {
    const { data: msgs } = ok(
      await admin.from("chat_messages").select("thread_id, body, attachment_name, created_at").in("thread_id", ids).order("created_at", { ascending: false }).limit(500),
      "chat_messages",
    );
    for (const m of (msgs ?? []) as Pick<ChatMessage, "thread_id" | "body" | "attachment_name">[]) {
      if (!lastBody.has(m.thread_id)) lastBody.set(m.thread_id, m.body || (m.attachment_name ? `Attachment: ${m.attachment_name}` : ""));
    }
  }

  const rows = allowed.map((otherId) => {
    const t = threads.find((x) => otherOf(x) === otherId);
    return {
      otherId,
      name: names.get(otherId) || (side === "investor" ? "Startup" : "Investor"),
      preview: t ? lastBody.get(t.id)?.slice(0, 80) ?? "No messages yet" : "No messages yet",
      unread: t ? unread.get(t.id) ?? 0 : 0,
      last: t?.last_message_at ? Date.parse(t.last_message_at) : 0,
    };
  });
  return rows.sort((a, b) => b.last - a.last || a.name.localeCompare(b.name)).map(({ last: _l, ...r }) => r);
}

export async function threadMessages(threadId: number | null): Promise<ChatMessage[]> {
  return threadId ? getMessages(threadId) : [];
}

/** First founder name from the founder's saved profile ("Asha Rao (CEO), …" → "Asha Rao"). */
export async function founderDisplayName(startupId: number): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = ok(await admin.from("startup_profiles").select("answers").eq("startup_id", startupId).maybeSingle(), "startup_profiles");
  const raw = (data as { answers: Record<string, unknown> | null } | null)?.answers?.founders;
  const first = typeof raw === "string" ? raw.split(/[,;\n]/)[0]?.replace(/\(.*?\)/g, "").trim() : "";
  return first || null;
}
