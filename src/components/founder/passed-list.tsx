"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Globe2, Wallet, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "./ui";
import type { ProfileView } from "./investor-format";

export interface PassedItem {
  key: string;
  name: string;
  date: string;
  reason: string;
  profile: ProfileView;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Passed investors; clicking a row opens that investor's profile and reason. */
export function PassedList({ items }: { items: PassedItem[] }) {
  const [open, setOpen] = useState<PassedItem | null>(null);
  const close = useCallback(() => setOpen(null), []);

  return (
    <>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              onClick={() => setOpen(it)}
              className="group flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-canvas"
            >
              <Avatar name={it.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-tide group-hover:text-ocean-600">{it.name}</p>
                  <span className="shrink-0 text-xs text-navy-400">{it.date}</span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-navy-600">{it.reason}</p>
                <p className="mt-1 text-[11px] text-navy-400">
                  {[it.profile.typeLabel, it.profile.cheque !== "—" ? it.profile.cheque : null]
                    .filter(Boolean)
                    .join(" · ") || "View investor profile"}
                </p>
              </div>
              <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-ocean-600" />
            </button>
          </li>
        ))}
      </ul>

      <InvestorDialog
        open={!!open}
        onClose={close}
        name={open?.name ?? ""}
        profile={open?.profile ?? null}
        statusLabel="Passed"
        reasonLabel="Why they passed"
        reason={open?.reason ?? null}
        date={open?.date ?? null}
      />
    </>
  );
}

export function InvestorDialog({
  open,
  onClose,
  name,
  profile,
  statusLabel,
  reasonLabel,
  reason,
  date,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  profile: ProfileView | null;
  statusLabel?: string;
  reasonLabel?: string;
  reason?: string | null;
  date?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && profile ? (
        <motion.div
          key="investor-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center bg-tide/30 p-4 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="investor-dialog-title"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl"
          >
            <div className="relative bg-gradient-to-br from-ocean-100 to-leaf-100 px-6 pb-6 pt-6 text-tide">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-tide/60 transition hover:bg-white/70 hover:text-tide"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-4 pr-8">
                <Avatar name={name} size="lg" />
                <div className="min-w-0">
                  {profile.typeLabel ? (
                    <p className="text-[11px] font-medium uppercase tracking-wider text-tide/60">{profile.typeLabel}</p>
                  ) : null}
                  <h2 id="investor-dialog-title" className="truncate text-xl font-bold tracking-tight">
                    {name}
                  </h2>
                  {statusLabel ? (
                    <span className="mt-1.5 inline-flex rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-ocean-800">
                      {statusLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="scroll-thin max-h-[65vh] space-y-5 overflow-y-auto px-6 py-6">
              <div className="grid grid-cols-2 gap-3">
                <Tile icon={<Wallet className="h-4 w-4" />} label="Cheque size" value={profile.cheque} />
                <Tile icon={<Globe2 className="h-4 w-4" />} label="Geography" value={profile.geography ?? "—"} />
              </div>

              <ChipGroup label="Sectors they invest in" items={profile.sectors} empty="Not specified" />
              <ChipGroup label="Stages they back" items={profile.stages} empty="Not specified" />

              {reason ? (
                <div className="rounded-2xl bg-canvas px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-navy-400">
                      {reasonLabel ?? "Their reply"}
                    </p>
                    {date ? <span className="text-[11px] text-navy-400">{date}</span> : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-tide">{reason}</p>
                </div>
              ) : null}

              <p className="text-[11px] text-navy-400">
                Contact with investors runs through your Sidana team, so contact details aren&apos;t shown here.
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-navy-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-tide">{value}</p>
    </div>
  );
}

function ChipGroup({ label, items, empty }: { label: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-navy-400">{label}</p>
      {items.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((x) => (
            <span key={x} className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-medium capitalize text-ocean-800">
              {x}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm text-navy-400">{empty}</p>
      )}
    </div>
  );
}
