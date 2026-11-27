import { requireInvestor } from "@/server/auth/session";
import { InvestorShell } from "@/client/components/investor/shell";
import { INVESTOR_NAV } from "@/client/components/layout/nav";
import { getInvestorSelf } from "@/server/data/investor/thesis";
import { getThreadsFor, unreadCounts } from "@/server/data/chat";
import { evaluateTriggers, getUnreadNotifications } from "@/server/data/investor/signals";
import { NoticeStrip } from "./notice-strip";

export default async function InvestorLayout({ children }: { children: React.ReactNode }) {
  // Protects this layout only; every page below calls requireInvestor() itself too.
  const session = await requireInvestor();
  // Revisit triggers whose target has been reached since the last visit.
  await evaluateTriggers({ investorId: session.investorId }).catch(() => 0);
  const [self, threads, notices] = await Promise.all([
    getInvestorSelf(session.investorId),
    getThreadsFor("investor", session.investorId),
    getUnreadNotifications(session.investorId).catch(() => []),
  ]);
  const unread = [...(await unreadCounts("investor", threads)).values()].reduce((a, b) => a + b, 0);
  return (
    <InvestorShell
      nav={INVESTOR_NAV}
      investorName={self?.name ?? "Investor"}
      contactName={session.appUser?.full_name ?? session.email}
      unreadChats={unread}
    >
      <NoticeStrip notices={notices.map((n) => ({ id: n.id, title: n.title, body: n.body, startupId: n.startup_id }))} />
      {children}
    </InvestorShell>
  );
}
