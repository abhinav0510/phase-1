import { getSessionUser, hasPortalAccess, isAdmin } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { chatAllowed } from "@/server/data/chat";
import { CHAT_BUCKET } from "@/server/validators/chat-attachment";
import type { ChatMessage, ChatThread } from "@/shared/types/db";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Not found", { status: 404 });

/**
 * A chat attachment, streamed from the private bucket. Allowed for Sidana admins,
 * and for the investor or founder of that thread while their chat is open
 * (the same rule as reading the messages). Images open inline; every other
 * file downloads.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NOT_FOUND();
  const session = await getSessionUser();
  const user = session?.appUser;
  if (!session || !user || user.active === false) return NOT_FOUND();

  const admin = createAdminClient();
  const { data: msg } = await admin.from("chat_messages").select("*").eq("id", id).maybeSingle();
  const m = msg as ChatMessage | null;
  if (!m?.attachment_path) return NOT_FOUND();
  const { data: thr } = await admin.from("chat_threads").select("*").eq("id", m.thread_id).maybeSingle();
  const t = thr as ChatThread | null;
  if (!t) return NOT_FOUND();

  let allowed = isAdmin(user.role) && !session.mustReset;
  if (!allowed && user.role === "investor" && user.investor_id === t.investor_id) {
    allowed = (await hasPortalAccess(t.investor_id)) && (await chatAllowed(t.investor_id, t.startup_id));
  }
  if (!allowed && user.role === "founder" && user.startup_id === t.startup_id && !session.mustReset) {
    allowed = await chatAllowed(t.investor_id, t.startup_id);
  }
  if (!allowed) return NOT_FOUND();

  const { data, error } = await admin.storage.from(CHAT_BUCKET).download(m.attachment_path);
  if (error || !data) return NOT_FOUND();
  const type = m.attachment_type ?? "application/octet-stream";
  const inline = type.startsWith("image/") && new URL(req.url).searchParams.get("download") !== "1";
  const name = m.attachment_name ?? "attachment";
  return new Response(data, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
