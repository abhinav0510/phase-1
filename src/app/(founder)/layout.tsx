import { requireFounder } from "@/server/auth/session";
import { FounderShell } from "@/client/components/founder/shell";
import { FOUNDER_NAV } from "@/client/components/layout/nav";
import { getOwnBranding, getOwnStartup, logoUrlFor } from "@/server/data/founder";
import { getAnnouncementsForUser } from "@/server/data/notifications";

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireFounder();
  const [startup, branding, announcements] = await Promise.all([
    getOwnStartup(session.startupId),
    getOwnBranding(session.startupId),
    getAnnouncementsForUser(session.authId, "founders"),
  ]);
  return (
    <FounderShell
      nav={FOUNDER_NAV}
      startupName={startup?.name ?? "My Startup"}
      loginId={session.startupId}
      logoUrl={logoUrlFor(branding)}
      announcements={announcements}
    >
      {children}
    </FounderShell>
  );
}
