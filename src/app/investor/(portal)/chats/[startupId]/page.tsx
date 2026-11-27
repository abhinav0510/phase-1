import { notFound } from "next/navigation";
import { requireInvestor } from "@/server/auth/session";
import { InvestorChatPage } from "../chat-page";

export const dynamic = "force-dynamic";

/** One investor–founder conversation (clause 2.8). 404 unless the pair may chat. */
export default async function InvestorChat({ params }: { params: Promise<{ startupId: string }> }) {
  const { investorId } = await requireInvestor();
  const startupId = Number((await params).startupId);
  if (!Number.isInteger(startupId) || startupId <= 0) notFound();
  return <InvestorChatPage investorId={investorId} startupId={startupId} />;
}
