import { requireFounder } from "@/server/auth/session";
import { FounderShell } from "@/client/components/founder/shell";
import { FOUNDER_NAV } from "@/client/components/layout/nav";
import { getOwnBranding, getOwnStartup, logoUrlFor } from "@/server/data/founder";
import { getAnnouncementsForUser } from "@/server/data/notifications";
import { getFinancials } from "@/server/data/financials";
import { figuresDue, fyName, longMonth } from "@/shared/lib/figures-due";
import { MonthlyFiguresPrompt } from "./financials/_components/monthly-figures-prompt";

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireFounder();
  const [startup, branding, announcements, fin] = await Promise.all([
    getOwnStartup(session.startupId),
    getOwnBranding(session.startupId),
    getAnnouncementsForUser(session.authId, "founders"),
    getFinancials(session.startupId),
  ]);
  // Last month's figures (and a closed year's total) for founders who have uploaded before.
  // Not while an announcement is waiting, so two pop-ups never stack.
  const due = fin.ready ? figuresDue(fin.months, fin.years) : { month: null, fy: null };
  const showPrompt = (due.month || due.fy !== null) && !(announcements?.unreadIds?.length);
  return (
    <FounderShell
      nav={FOUNDER_NAV}
      startupName={startup?.name ?? "My Startup"}
      loginId={session.startupId}
      logoUrl={logoUrlFor(branding)}
      announcements={announcements}
    >
      {showPrompt ? (
        <MonthlyFiguresPrompt
          due={{
            month: due.month,
            monthLabel: due.month ? longMonth(due.month) : null,
            fy: due.fy,
            fyLabel: due.fy !== null ? fyName(due.fy) : null,
          }}
        />
      ) : null}
      {children}
    </FounderShell>
  );
}
