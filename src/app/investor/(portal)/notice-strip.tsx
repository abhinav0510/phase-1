"use client";

import Link from "next/link";
import { useTransition } from "react";
import { BellRing, X } from "lucide-react";
import { markNotificationRead } from "./deal-actions";

export interface Notice {
  id: number;
  title: string;
  body: string;
  startupId: number | null;
}

/** Notices for the investor (a revisit trigger was met), shown above every portal page until dismissed. */
export function NoticeStrip({ notices }: { notices: Notice[] }) {
  const [pending, start] = useTransition();
  if (!notices.length) return null;
  return (
    <div className="mb-4 space-y-2" role="region" aria-label="Notifications">
      {notices.map((n) => (
        <div key={n.id} className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-leaf-50 to-white px-4 py-3 ring-1 ring-leaf-200">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold text-tide">{n.title}</p>
            <p className="text-navy-600">{n.body}</p>
            {n.startupId ? (
              <Link href={`/investor/startup/${n.startupId}`} className="mt-1 inline-block text-sm font-semibold text-ocean-700 underline">
                Take another look
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            disabled={pending}
            onClick={() => start(() => markNotificationRead(n.id))}
            className="rounded-full p-1 text-navy-500 hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
