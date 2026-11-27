import { requireInvestor } from "@/server/auth/session";
import { InvestorChatPage } from "./chat-page";

export const dynamic = "force-dynamic";

/** Investor chats list (clause 2.8). */
export default async function InvestorChats() {
  const { investorId } = await requireInvestor();
  return <InvestorChatPage investorId={investorId} startupId={null} />;
}
