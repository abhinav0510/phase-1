import { requireFounder } from "@/lib/auth";
import { Shell } from "@/components/layout/shell";
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
    <Shell
      nav={FOUNDER_NAV}
      tag="Founder"
      title={startup?.name ?? "My Startup"}
      subtitle="Sidana Founder Portal"
      userName={startup?.name ?? "My Startup"}
      userEmail={`Login ID ${session.startupId}`}
      announcements={announcements}
    >
      {children}
    </Shell>
  );
}
