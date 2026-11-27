"use server";

import { revalidatePath } from "next/cache";
import { requireFounder } from "@/server/auth/session";
import { chatAllowed, getOrCreateThread, MAX_MESSAGE, postMessage, storeAttachment } from "@/server/data/chat";
import { getOwnStartup } from "@/server/data/founder";
import { logActivity } from "@/server/data/activity";

/**
 * Founder → investor reply (clause 2.8). The startup comes from the founder's
 * session, so a founder can only ever write in their own startup's threads.
 */
export async function sendToInvestor(investorId: number, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const { startupId, authId } = await requireFounder();
  const text = String(formData.get("body") ?? "").trim();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!text && !hasFile) return { ok: false, error: "Write a message or attach a file first." };
  if (text.length > MAX_MESSAGE) return { ok: false, error: `Keep it under ${MAX_MESSAGE.toLocaleString("en-IN")} characters.` };
  if (!Number.isInteger(investorId) || !(await chatAllowed(investorId, startupId))) {
    return { ok: false, error: "This chat isn't open." };
  }
  const thread = await getOrCreateThread(investorId, startupId);
  const stored = await storeAttachment(thread.id, file);
  if (!stored.ok) return stored;
  await postMessage(thread, "founder", authId, text, stored.file);
  const startup = await getOwnStartup(startupId);
  await logActivity({
    portal: "founder",
    action: "chat_message",
    actorUserId: authId,
    actorLabel: startup?.name ?? `Startup ${startupId}`,
    investorId,
    startupId,
    meta: hasFile ? { attachment: true } : {},
  });
  revalidatePath(`/chats/${investorId}`);
  return { ok: true };
}
