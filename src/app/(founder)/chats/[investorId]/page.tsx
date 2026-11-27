import { notFound } from "next/navigation";
import { requireFounder } from "@/server/auth/session";
import { FounderChatPage } from "../chat-page";

export const dynamic = "force-dynamic";

/** One founder–investor conversation (clause 2.8). 404 unless the pair may chat. */
export default async function FounderChat({ params }: { params: Promise<{ investorId: string }> }) {
  const { startupId } = await requireFounder();
  const investorId = Number((await params).investorId);
  if (!Number.isInteger(investorId) || investorId <= 0) notFound();
  return <FounderChatPage startupId={startupId} investorId={investorId} />;
}
