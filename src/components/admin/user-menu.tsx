"use client";

import Link from "next/link";
import { ChevronDown, Settings, UserCircle } from "lucide-react";
import { useState } from "react";
import { initials } from "@/lib/utils";
import { SignOutButton } from "@/components/layout/signout-button";

export function UserMenu({
  userName,
  userEmail,
  settingsHref,
  links,
}: {
  userName: string | null;
  userEmail: string | null;
  settingsHref?: string;
  /** Explicit menu links; overrides settingsHref. */
  links?: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const display = userName ?? userEmail ?? "User";
  const menu = links ?? (settingsHref ? [{ href: settingsHref, label: "Settings" }] : []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full border border-navy-100 bg-white py-1 pl-1 pr-2.5 transition hover:bg-navy-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-950 text-[11px] font-semibold text-white">
          {initials(display)}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-navy-800 sm:block">
          {display}
        </span>
        <ChevronDown className="h-4 w-4 text-navy-400" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-xl"
          >
            <div className="border-b border-navy-50 px-4 py-3">
              <p className="truncate text-sm font-semibold text-navy-900">{display}</p>
              {userEmail ? (
                <p className="truncate text-xs text-navy-400">{userEmail}</p>
              ) : null}
            </div>
            {menu.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-navy-700 hover:bg-navy-50"
              >
                {l.label.toLowerCase().includes("profile") ? (
                  <UserCircle className="h-4 w-4 text-navy-400" />
                ) : (
                  <Settings className="h-4 w-4 text-navy-400" />
                )}
                {l.label}
              </Link>
            ))}
            <SignOutButton variant="menu" />
          </div>
        </>
      ) : null}
    </div>
  );
}
