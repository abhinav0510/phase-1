"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem, NavIcon } from "./nav";

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

/** Optional extras under the nav: a quick-links box and a contact card. */
export interface SidebarExtras {
  quickLinks?: NavItem[];
  contact?: { label: string; name: string; note?: string };
}

export function Sidebar({
  items,
  tag,
  extras,
}: {
  items: NavItem[];
  tag: string;
  extras?: SidebarExtras;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 text-navy-100 md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <Image src="/images/logo-icon.png" alt="" width={32} height={32} className="shrink-0" />
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Sidana Ventures</p>
          <p className="text-[10px] uppercase tracking-wider text-navy-300">
            {tag}
          </p>
        </div>
      </div>
      <nav className="space-y-1 px-3 py-4">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" &&
              item.href !== "/dashboard" &&
              pathname.startsWith(item.href));
          const Icon = ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-navy-200 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {extras?.quickLinks?.length ? (
        <div className="mx-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-white">Quick actions</p>
            <Zap className="h-3.5 w-3.5 text-gold" />
          </div>
          <ul className="space-y-0.5">
            {extras.quickLinks.map((q) => {
              const Icon = ICONS[q.icon];
              return (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-navy-200 transition hover:bg-white/5 hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {q.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex-1" />

      {extras?.contact ? (
        <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-navy-700 to-navy-800 p-4 text-white">
          <p className="text-[10px] uppercase tracking-wider text-navy-300">
            {extras.contact.label}
          </p>
          <p className="mt-1 text-sm font-semibold">{extras.contact.name}</p>
          {extras.contact.note ? (
            <p className="mt-1 text-[11px] leading-snug text-navy-200">
              {extras.contact.note}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-white/10 px-5 py-3 text-[10px] text-navy-400">
        Phase 1 · {new Date().getFullYear()}
      </div>
    </aside>
  );
}
