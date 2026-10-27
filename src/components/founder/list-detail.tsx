"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, CHIP_DOT, DarkPanel, type ChipTone } from "./ui";
import { PillTabs, type PillTab } from "./pill-tabs";

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string | null;
  chip?: { label: string; tone: ChipTone };
  value?: string;
  /** Tab key this item belongs to (items without a group show under every tab). */
  group?: string;
}

export interface DetailSpec {
  eyebrow?: string;
  heading: string;
  chip?: { label: string; tone: ChipTone };
  aside?: { label: string; value: string };
  person?: { name: string; role?: string };
  stats?: { label: string; value: string }[];
  lists?: { title: string; items: string[]; empty?: string }[];
  rows?: { label: string; value: string }[];
  action?: { label: string; href: string; external?: boolean };
  note?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const spring = { type: "spring", stiffness: 420, damping: 38 } as const;

/**
 * Dark panel with a selectable list on the left and an accent detail card on
 * the right. Selection and tab changes animate; everything is plain data so
 * server pages can hand it rows straight from Supabase.
 */
export function ListDetail({
  title,
  subtitle,
  tabs,
  defaultTab,
  items,
  details,
  emptyTitle,
  emptyMessage,
  listLabel,
}: {
  title: string;
  subtitle?: string;
  tabs?: PillTab[];
  defaultTab?: string;
  items: ListItem[];
  details: Record<string, DetailSpec>;
  emptyTitle: string;
  emptyMessage?: string;
  listLabel?: string;
}) {
  const [tab, setTab] = useState(defaultTab ?? tabs?.[0]?.key ?? "all");
  const filtered = useMemo(
    () => items.filter((i) => tab === "all" || !i.group || i.group === tab),
    [items, tab],
  );
  const [selectedId, setSelectedId] = useState<string | null>(filtered[0]?.id ?? null);
  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;
  const detail = selected ? details[selected.id] : null;

  const tabsWithCounts = tabs?.map((t) => ({
    ...t,
    count: t.count ?? items.filter((i) => t.key === "all" || !i.group || i.group === t.key).length,
  }));

  return (
    <DarkPanel>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {subtitle ? <p className="text-xs text-white/50">{subtitle}</p> : null}
        </div>
        {tabsWithCounts ? (
          <PillTabs
            dark
            tabs={tabsWithCounts}
            value={tab}
            onChange={(k) => {
              setTab(k);
              setSelectedId(null);
            }}
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0">
          {listLabel ? (
            <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-white/40">{listLabel}</p>
          ) : null}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-5 py-10 text-center">
              <p className="text-sm font-semibold text-white">{emptyTitle}</p>
              {emptyMessage ? <p className="mt-1 text-xs text-white/50">{emptyMessage}</p> : null}
            </div>
          ) : (
            <ul className="scroll-thin max-h-[540px] space-y-1 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {filtered.map((item, idx) => {
                  const active = selected?.id === item.id;
                  return (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: EASE, delay: Math.min(idx * 0.02, 0.2) }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        aria-pressed={active}
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                          active ? "text-white" : "text-white/80 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="list-detail-selected"
                            transition={spring}
                            className="absolute inset-0 rounded-2xl bg-iris shadow-lg shadow-iris/30"
                          />
                        ) : null}
                        <span className="relative z-10 flex w-full min-w-0 items-center gap-3">
                          <Avatar name={item.avatar ?? item.title} size="sm" tone={active ? "white" : undefined} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{item.title}</span>
                            {item.subtitle ? (
                              <span className={cn("block truncate text-[11px]", active ? "text-white/75" : "text-white/45")}>
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                          {item.chip ? (
                            <span
                              className={cn(
                                "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize sm:inline-flex",
                                active ? "bg-white/20 text-white" : "bg-white/10 text-white/80",
                              )}
                            >
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: active ? "#fff" : CHIP_DOT[item.chip.tone] }}
                              />
                              {item.chip.label}
                            </span>
                          ) : null}
                          {item.value ? (
                            <span className="shrink-0 text-sm font-bold tabular-nums">{item.value}</span>
                          ) : null}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>

        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            {detail && selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 14, scale: 0.99 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -10, scale: 0.99 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex h-full flex-col rounded-[20px] bg-iris p-5 text-white shadow-xl shadow-iris/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    {detail.eyebrow ? (
                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">{detail.eyebrow}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-2xl font-bold tracking-tight">{detail.heading}</h4>
                      {detail.chip ? (
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold capitalize">
                          {detail.chip.label}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {detail.aside ? (
                    <div className="text-right">
                      <p className="text-[11px] text-white/60">{detail.aside.label}</p>
                      <p className="text-lg font-semibold">{detail.aside.value}</p>
                    </div>
                  ) : null}
                  {detail.person ? (
                    <div className="flex items-center gap-2.5">
                      <Avatar name={detail.person.name} size="sm" tone="white" />
                      <div>
                        <p className="text-sm font-semibold leading-tight">{detail.person.name}</p>
                        {detail.person.role ? <p className="text-[11px] text-white/60">{detail.person.role}</p> : null}
                      </div>
                    </div>
                  ) : null}
                </div>

                {detail.stats?.length ? (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {detail.stats.map((s) => (
                      <div key={s.label} className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                        <p className="truncate text-lg font-bold">{s.value}</p>
                        <p className="text-[11px] text-white/70">{s.label}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {detail.lists?.map((l) => (
                  <div key={l.title} className="mt-5">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">{l.title}</p>
                    {l.items.length ? (
                      <ol className="mt-2 space-y-1.5 text-sm">
                        {l.items.map((x, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="w-4 shrink-0 tabular-nums text-white/40">{i + 1}.</span>
                            <span>{x}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-1 text-sm text-white/60">{l.empty ?? "Nothing this week."}</p>
                    )}
                  </div>
                ))}

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                  {detail.rows?.length ? (
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {detail.rows.map((r) => (
                        <div key={r.label}>
                          <p className="text-[11px] text-white/60">{r.label}</p>
                          <p className="text-base font-semibold">{r.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span />
                  )}
                  {detail.action ? (
                    detail.action.external ? (
                      <a
                        href={detail.action.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-obsidian shadow transition hover:bg-white/90 active:scale-[0.98]"
                      >
                        {detail.action.label}
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link
                        href={detail.action.href}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-obsidian shadow transition hover:bg-white/90 active:scale-[0.98]"
                      >
                        {detail.action.label}
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    )
                  ) : null}
                </div>
                {detail.note ? <p className="mt-3 text-xs text-white/70">{detail.note}</p> : null}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-[300px] items-center justify-center rounded-[20px] border border-dashed border-white/15 text-sm text-white/50"
              >
                Select an item to see its details
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DarkPanel>
  );
}
