import { requireAdmin } from "@/server/auth/session";
import { AdminShell } from "@/client/components/admin/shell";
import { ADMIN_NAV } from "@/client/components/layout/nav";
import { getAnnouncementsForUser } from "@/server/data/notifications";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protects this layout only. Next.js renders a page alongside its layout, so every
  // admin page must call requireAdmin() itself before it loads any data.
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
