"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/shared/lib/utils";

export interface PillTab {
  key: string;
  label: string;
  count?: number;
}

const spring = { type: "spring", stiffness: 500, damping: 38 } as const;

export function PillTabs({
  tabs,
  value,
  onChange,
  dark,
}: {
  tabs: PillTab[];
  value: string;
  onChange: (key: string) => void;
  dark?: boolean;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      className={cn("scroll-thin inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1", dark ? "bg-white/10" : "bg-ocean-100/70")}
    >
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              "relative flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors",
              active ? "text-tide" : dark ? "text-white/65 hover:text-white" : "text-navy-500 hover:text-tide",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`pill-${id}`}
                transition={spring}
                className="absolute inset-0 rounded-full bg-white shadow-sm"
              />
            ) : null}
            <span className="relative">{t.label}</span>
            {typeof t.count === "number" ? (
              <span
                className={cn(
                  "relative rounded-full px-1.5 text-[10px] tabular-nums",
                  active ? "bg-ocean-600 text-white" : dark ? "bg-white/15 text-white/80" : "bg-white text-navy-600",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
