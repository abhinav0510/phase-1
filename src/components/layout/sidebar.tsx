"use client";

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

export function Sidebar({
  items,
  tag,
}: {
  items: NavItem[];
  tag: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-navy-900 text-navy-100 md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white font-bold text-navy-900">
          S
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">Sidana</p>
          <p className="text-[10px] uppercase tracking-wider text-navy-300">
            {tag}
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
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
      <div className="border-t border-white/10 px-5 py-3 text-[10px] text-navy-400">
        Phase 1 · {new Date().getFullYear()}
      </div>
    </aside>
  );
}
