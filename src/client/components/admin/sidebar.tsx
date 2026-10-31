"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  Users,
  HandCoins,
  CalendarClock,
  FileText,
  BarChart3,
  Settings,
  UserCircle,
  Handshake,
  ClipboardList,
  FileBarChart,
  Mail,
  Megaphone,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { NavItem, NavIcon } from "@/client/components/layout/nav";
import { SignOutButton } from "@/client/components/layout/signout-button";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  startup: Building2,
  financials: Wallet,
  investors: Users,
  funding: HandCoins,
  meetings: CalendarClock,
  documents: FileText,
  users: ClipboardList,
  reports: BarChart3,
  settings: Settings,
  profile: UserCircle,
  matches: Handshake,
  weekly: FileBarChart,
  mail: Mail,
  announce: Megaphone,
};

export function isNavActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/admin") return false;
  return pathname.startsWith(href + "/");
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

export function AdminSidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  return (
    <aside className="relative z-30 mb-4 ml-4 hidden w-[68px] shrink-0 flex-col items-center rounded-[22px] bg-navy-950 py-3 text-navy-100 md:flex">
      <nav className="flex flex-col items-center gap-1.5">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const loading = navigatingTo === item.href;
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                if (!active) setNavigatingTo(item.href);
              }}
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-xl",
                "transition-all duration-150 active:scale-95",
                active
                  ? "bg-white text-navy-950 shadow-md shadow-black/30"
                  : "text-navy-300 hover:bg-white/10 hover:text-white",
                loading && !active && "bg-white/10 text-white",
              )}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              )}
              <Tooltip>{item.label}</Tooltip>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <SignOutButton variant="sidebar" />
    </aside>
  );
}

/** Horizontal pill nav for small screens, where the icon rail is hidden. */
export function AdminMobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="scroll-thin flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden">
      {items.map((item) => {
        const active = isNavActive(pathname, item.href);
        const Icon = ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-navy-950 text-white"
                : "bg-navy-50 text-navy-600 hover:bg-navy-100",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
