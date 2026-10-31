import { AdminSidebar, AdminMobileNav } from "./sidebar";
import { AdminTopBar } from "./topbar";
import { PageTransition } from "@/client/components/layout/page-transition";
import type { NavItem } from "@/client/components/layout/nav";
import {
  AnnouncementCenter,
  type AnnouncementItem,
} from "@/client/components/announcements/announcement-center";

/** Admin-only app frame (team access via /teamonly → /admin). The founder portal keeps the classic Shell. */
export function AdminShell({
  nav,
  tag,
  title,
  userName,
  userEmail,
  announcements,
  searchHref,
  settingsHref,
  children,
}: {
  nav: NavItem[];
  tag: string;
  title: string;
  userName: string | null;
  userEmail: string | null;
  announcements?: { items: AnnouncementItem[]; unreadIds: number[] };
  /** Page the top-bar search submits to (as `?q=`). Omit to hide search. */
  searchHref?: string;
  settingsHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-white">
      <AdminTopBar
        nav={nav}
        tag={tag}
        title={title}
        userName={userName}
        userEmail={userEmail}
        searchHref={searchHref}
        settingsHref={settingsHref}
        actions={
          announcements ? (
            <AnnouncementCenter
              items={announcements.items}
              unreadIds={announcements.unreadIds}
              buttonClassName="h-10 w-10 border border-navy-100 bg-white"
            />
          ) : null
        }
      />
      <AdminMobileNav items={nav} />
      <div className="flex min-h-0 flex-1">
        <AdminSidebar items={nav} />
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 md:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
