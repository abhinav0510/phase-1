import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";
import { ADMIN_NAV } from "@/components/layout/nav";
import { getAnnouncementsForUser } from "@/lib/data/notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const announcements = await getAnnouncementsForUser(session.authId, "team");
  return (
    <AdminShell
      nav={ADMIN_NAV}
      tag="Operations"
      title="Admin Panel"
      userName={session.appUser?.full_name ?? null}
      userEmail={session.email}
      announcements={announcements}
      searchHref="/admin/startups"
      settingsHref="/admin/settings"
    >
      {children}
    </AdminShell>
  );
}
