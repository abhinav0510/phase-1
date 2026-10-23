import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import type { NavItem } from "./nav";

export function Shell({
  nav,
  tag,
  title,
  subtitle,
  userName,
  userEmail,
  children,
}: {
  nav: NavItem[];
  tag: string;
  title: string;
  subtitle?: string;
  userName: string | null;
  userEmail: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={nav} tag={tag} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          subtitle={subtitle}
          userName={userName}
          userEmail={userEmail}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
