"use client";

import { useEffect, useState } from "react";
import { Bell, Megaphone, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { dismissAnnouncements } from "@/app/actions/announcements";
import type { AnnouncementKind } from "@/lib/types/db";
import { KIND_META } from "./kinds";

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  kind: AnnouncementKind;
  publish_at: string;
}

/**
 * Bell (with unread count) + popup for in-app announcements. Unread items pop
 * up once after the dashboard loads, newest first; "Got it" records a dismissal
 * for this user so the popup never repeats. Everything stays readable from the
 * bell until the announcement expires or is deactivated.
 */
export function AnnouncementCenter({
  items,
  unreadIds,
  buttonClassName,
}: {
  items: AnnouncementItem[];
  unreadIds: number[];
  buttonClassName?: string;
}) {
  const [unread, setUnread] = useState<Set<number>>(() => new Set(unreadIds));
  // The popup pages through `queue`; `idx` is the one on screen.
  const [queue, setQueue] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Open after mount (not during SSR) so the popup never causes a hydration
  // mismatch and appears once the dashboard has rendered.
  useEffect(() => {
    if (!unreadIds.length) return;
    const t = setTimeout(() => {
      setQueue(unreadIds);
      setIdx(0);
    }, 400);
    return () => clearTimeout(t);
  }, [unreadIds]);

  const byId = new Map(items.map((i) => [i.id, i]));
  const viewing = queue.length ? queue[idx] : null;
  const current = viewing !== null ? byId.get(viewing) : undefined;
  const isLast = idx >= queue.length - 1;

  function markRead(ids: number[]) {
    const fresh = ids.filter((id) => unread.has(id));
    if (!fresh.length) return;
    setUnread((prev) => {
      const next = new Set(prev);
      fresh.forEach((id) => next.delete(id));
      return next;
    });
    void dismissAnnouncements(fresh);
  }

  function closePopup() {
    setQueue([]);
    setIdx(0);
  }

  /** "Next" / "Got it": mark this one seen, then advance or close. */
  function gotIt() {
    if (viewing === null) return;
    markRead([viewing]);
    if (isLast) closePopup();
    else setIdx(idx + 1);
  }

  /** Close button: mark only the one on screen as seen; the rest stay unread in the bell. */
  function closeCurrent() {
    if (viewing !== null) markRead([viewing]);
    closePopup();
  }

  function dismissAll() {
    markRead(queue.slice(idx));
    closePopup();
  }

  function openFromMenu(id: number) {
    setMenuOpen(false);
    setQueue([id]);
    setIdx(0);
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-full text-navy-500 transition hover:bg-navy-50 hover:text-navy-800",
            buttonClassName,
          )}
          aria-label={`Announcements${unread.size ? `, ${unread.size} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unread.size ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread.size}
            </span>
          ) : null}
        </button>

        {menuOpen ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
                <p className="text-sm font-semibold text-navy-900">Announcements</p>
                {unread.size ? (
                  <button
                    type="button"
                    onClick={() => markRead(Array.from(unread))}
                    className="text-xs font-medium text-navy-600 hover:underline"
                  >
                    Mark all read
                  </button>
                ) : null}
              </div>
              {items.length ? (
                <ul className="scroll-thin max-h-96 divide-y divide-navy-50 overflow-y-auto">
                  {items.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => openFromMenu(a.id)}
                        className="flex w-full gap-3 px-4 py-3 text-left hover:bg-navy-50/60"
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            unread.has(a.id) ? "bg-red-500" : "bg-transparent"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-navy-800">{a.title}</span>
                          <span className="mt-0.5 block text-xs text-navy-400">
                            {KIND_META[a.kind].label} · {formatDate(a.publish_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-navy-400">No announcements.</p>
              )}
            </div>
          </>
        ) : null}
      </div>

      {current ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-title"
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 bg-navy-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-navy-200" />
                <span className="text-xs font-semibold uppercase tracking-wider text-navy-200">
                  What&apos;s new at Sidana
                </span>
              </div>
              <button
                type="button"
                onClick={closeCurrent}
                className="text-navy-300 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center gap-2">
                <Badge tone={KIND_META[current.kind].tone}>{KIND_META[current.kind].label}</Badge>
                <span className="text-xs text-navy-400">{formatDate(current.publish_at)}</span>
              </div>
              <h2 id="announcement-title" className="mt-3 text-lg font-semibold text-navy-900">
                {current.title}
              </h2>
              <p className="scroll-thin mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-navy-700">
                {current.body}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-navy-100 px-6 py-4">
              <span className="text-xs text-navy-400">
                {queue.length > 1 ? `${idx + 1} of ${queue.length}` : ""}
              </span>
              <div className="flex gap-3">
                {queue.length > 1 && !isLast ? (
                  <button
                    type="button"
                    onClick={dismissAll}
                    className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
                  >
                    Dismiss all
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={gotIt}
                  autoFocus
                  className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  {isLast ? "Got it" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
