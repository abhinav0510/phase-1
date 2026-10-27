import { requireFounder } from "@/lib/auth";
import { FounderShell } from "@/components/founder/shell";
import { FOUNDER_NAV } from "@/components/layout/nav";
import { getOwnStartup } from "@/lib/data/founder";
import { getAnnouncementsForUser } from "@/lib/data/notifications";

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireFounder();
  const [startup, announcements] = await Promise.all([
    getOwnStartup(session.startupId),
    getAnnouncementsForUser(session.authId, "founders"),
  ]);
  return (
    <FounderShell
      nav={FOUNDER_NAV}
      startupName={startup?.name ?? "My Startup"}
      loginId={session.startupId}
      announcements={announcements}
    >
      {children}
    </FounderShell>
  );
}
