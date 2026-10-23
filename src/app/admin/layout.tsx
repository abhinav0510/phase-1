import { requireAdmin } from "@/lib/auth";
import { Shell } from "@/components/layout/shell";
import { ADMIN_NAV } from "@/components/layout/nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  return (
    <Shell
      nav={ADMIN_NAV}
      tag="Operations"
      title="Admin Panel"
      userName={session.appUser?.full_name ?? null}
      userEmail={session.email}
    >
      {children}
    </Shell>
  );
}
