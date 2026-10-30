import Image from "next/image";
import Link from "next/link";
import { Settings } from "lucide-react";
import type { NavItem } from "@/components/layout/nav";
import { AnnouncementCenter, type AnnouncementItem } from "@/components/announcements/announcement-center";
import { UserMenu } from "@/components/admin/user-menu";
import { FounderNav, FounderMobileNav } from "./nav";
import { PageFade } from "./motion";

// Profile & settings live in the user menu / gear so the pill bar stays short.
const MENU_ONLY = new Set(["/profile", "/settings"]);

export function FounderShell({
  nav,
  startupName,
  loginId,
  logoUrl,
  announcements,
  children,
}: {
  nav: NavItem[];
  startupName: string;
  loginId: number;
  logoUrl?: string | null;
  announcements?: { items: AnnouncementItem[]; unreadIds: number[] };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas text-tide">
      <header className="sticky top-0 z-40 border-b border-navy-100/60 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-[72px] max-w-[1560px] items-center gap-4 px-4 md:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <Image src="/images/logo-icon.png" alt="" width={34} height={34} priority />
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-bold tracking-tight text-tide">Sidana Ventures</span>
              <span className="block text-[10px] font-medium text-navy-500">Founder Portal</span>
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 justify-center">
            <FounderNav items={nav.filter((i) => !MENU_ONLY.has(i.href))} />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {announcements ? (
              <AnnouncementCenter
                items={announcements.items}
                unreadIds={announcements.unreadIds}
                buttonClassName="h-10 w-10 border border-navy-100 bg-white"
              />
            ) : null}
            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-100 bg-white text-navy-500 transition hover:bg-navy-50 hover:text-tide"
            >
              <Settings className="h-[18px] w-[18px]" />
            </Link>
            <UserMenu
              userName={startupName}
              userEmail={`Login ID ${loginId}`}
              avatarSrc={logoUrl}
              links={[
                { href: "/profile", label: "My profile" },
                { href: "/settings", label: "Settings" },
              ]}
            />
          </div>
        </div>
        <FounderMobileNav items={nav} />
      </header>

      <main className="mx-auto max-w-[1560px] px-4 pb-16 pt-5 md:px-6">
        <PageFade>{children}</PageFade>
      </main>
    </div>
  );
}
