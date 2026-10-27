"use client";

import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/layout/nav";
import { isNavActive } from "./sidebar";

/** Current section's nav label, so the header reads like a page heading. */
export function PageTitle({ nav, fallback }: { nav: NavItem[]; fallback: string }) {
  const pathname = usePathname();
  const match = nav
    .filter((i) => isNavActive(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return <>{match?.label ?? fallback}</>;
}
