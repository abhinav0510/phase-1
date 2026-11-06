"use client";

import { CalendarCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KpiCard } from "@/client/components/founder/ui";
import { Avatar } from "@/client/components/founder/ui";

const EASE = [0.22, 1, 0.36, 1] as const;

export function InterestedInvestorsCard({ count, names }: { count: number; names: string[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <>
      <button type="button" onClick={() => count > 0 && setOpen(true)} className="w-full text-left">
        <KpiCard
          label="Interested investors"
          value={count}
          icon={<CalendarCheck className="h-4 w-4" />}
          hint={count ? "Different investors you've had a meeting with" : "No meetings yet"}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="interested-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-50 flex items-end justify-center bg-tide/30 p-4 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="interested-dialog-title"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="w-full max-w-sm overflow-hidden rounded-[24px] bg-white shadow-2xl"
            >
              <div className="relative bg-gradient-to-br from-ocean-100 to-leaf-100 px-6 pb-5 pt-6">
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-tide/60 transition hover:bg-white/70 hover:text-tide"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="pr-8">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-tide/60">Meetings booked</p>
                  <h2 id="interested-dialog-title" className="mt-1 text-xl font-bold tracking-tight text-tide">
                    Interested investors
                  </h2>
                  <p className="mt-1 text-xs text-tide/55">
                    {count} investor{count === 1 ? "" : "s"} you&apos;ve had at least one meeting with
                  </p>
                </div>
              </div>

              <ul className="scroll-thin max-h-[50vh] divide-y divide-navy-50 overflow-y-auto px-2 py-2">
                {names.map((name) => (
                  <li key={name} className="flex items-center gap-3 rounded-2xl px-4 py-3">
                    <Avatar name={name} size="sm" />
                    <span className="min-w-0 truncate text-sm font-semibold text-tide">{name}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
