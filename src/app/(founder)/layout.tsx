import { requireFounder } from "@/lib/auth";
import { FounderShell } from "@/components/founder/shell";
import { FOUNDER_NAV } from "@/components/layout/nav";
import { getOwnBranding, getOwnStartup, logoUrlFor } from "@/lib/data/founder";
import { getAnnouncementsForUser } from "@/lib/data/notifications";

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
