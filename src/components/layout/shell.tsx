import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";
import type { NavItem } from "./nav";
import {
  AnnouncementCenter,
  type AnnouncementItem,
} from "@/components/announcements/announcement-center";

export function Shell({
  nav,
  tag,
  title,
  subtitle,
  userName,
  userEmail,
  announcements,
  children,
}: {
  nav: NavItem[];
  tag: string;
  title: string;
  subtitle?: string;
  userName: string | null;
  userEmail: string | null;
  announcements?: { items: AnnouncementItem[]; unreadIds: number[] };
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
          actions={
            announcements ? (
              <AnnouncementCenter
                items={announcements.items}
                unreadIds={announcements.unreadIds}
              />
            ) : null
          }
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
