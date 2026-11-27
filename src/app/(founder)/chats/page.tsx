import { requireFounder } from "@/server/auth/session";
import { FounderChatPage } from "./chat-page";

export const dynamic = "force-dynamic";

/** Founder chats with investors (clause 2.8). New in Phase 2. */
export default async function FounderChats() {
  const { startupId } = await requireFounder();
  return <FounderChatPage startupId={startupId} investorId={null} />;
}
