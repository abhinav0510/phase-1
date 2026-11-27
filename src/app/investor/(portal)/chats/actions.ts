"use server";

import { revalidatePath } from "next/cache";
import { requireInvestor } from "@/server/auth/session";
import { chatAllowed, getOrCreateThread, MAX_MESSAGE, postMessage, storeAttachment } from "@/server/data/chat";
import { getInvestorSelf } from "@/server/data/investor/thesis";
import { logActivity } from "@/server/data/activity";

/** Investor → founder message (clause 2.8). The visibility rule is checked here, not only in the page. */
export async function sendToFounder(startupId: number, formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const { investorId, authId, appUser } = await requireInvestor();
  const text = String(formData.get("body") ?? "").trim();
  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (!text && !hasFile) return { ok: false, error: "Write a message or attach a file first." };
  if (text.length > MAX_MESSAGE) return { ok: false, error: `Keep it under ${MAX_MESSAGE.toLocaleString("en-IN")} characters.` };
  if (!Number.isInteger(startupId) || !(await chatAllowed(investorId, startupId))) {
    return { ok: false, error: "This chat isn't open." };
  }
  const thread = await getOrCreateThread(investorId, startupId);
  const stored = await storeAttachment(thread.id, file);
  if (!stored.ok) return stored;
  await postMessage(thread, "investor", authId, text, stored.file);
  const self = await getInvestorSelf(investorId);
  await logActivity({
    portal: "investor",
    action: "chat_message",
    actorUserId: authId,
    actorLabel: [appUser?.full_name, self?.name].filter(Boolean).join(" · "),
    investorId,
    startupId,
    meta: hasFile ? { attachment: true } : {},
  });
  revalidatePath(`/investor/chats/${startupId}`);
  return { ok: true };
}
