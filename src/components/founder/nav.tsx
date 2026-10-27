"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/layout/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";

export function isFounderNavActive(pathname: string, href: string) {
  const path = href.split(/[?#]/)[0];
  if (pathname === path) return true;
  if (path === "/dashboard") return false;
  return pathname.startsWith(path + "/");
}

const spring = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } as const;

/** Dark pill tab bar; the active pill slides between tabs. */
export function FounderNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Portal sections"
      className="hidden items-center gap-0.5 rounded-full bg-obsidian p-1 shadow-lg shadow-obsidian/25 md:flex"
    >
      {items.map((item) => {
        const active = isFounderNavActive(pathname, item.href);
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-9 items-center rounded-full px-3 text-xs font-medium transition-colors duration-200",
              active ? "text-white" : "text-white/55 hover:text-white",
            )}
          >
            {active ? (
              <motion.span
                layoutId="founder-nav-active"
                transition={spring}
                className="absolute inset-0 rounded-full bg-iris shadow-md shadow-iris/40"
              />
            ) : null}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.4 : 2} />
              <span className="hidden xl:inline">{item.label}</span>
            </span>
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-obsidian px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100 xl:hidden">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function FounderMobileNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="scroll-thin flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden">
      {items.map((item) => {
        const active = isFounderNavActive(pathname, item.href);
        const Icon = NAV_ICONS[item.icon];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
              active ? "bg-iris text-white" : "bg-white text-navy-600 ring-1 ring-navy-100",
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
