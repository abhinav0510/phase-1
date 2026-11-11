import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import type { PeriodKind } from "@/shared/lib/deal-sharing";

const TABS: { kind: PeriodKind; label: string; href: string }[] = [
  { kind: "today", label: "Today", href: "/admin/deal-sharing" },
  { kind: "week", label: "This week", href: "/admin/deal-sharing?period=week" },
  { kind: "month", label: "This month", href: "/admin/deal-sharing?period=month" },
];

const input = (on: boolean) => cn("rounded-lg border px-2 py-1.5 text-sm text-navy-900", on ? "border-navy-500" : "border-navy-200");
const button = "rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white";

/**
 * Today / this week / this month, or any past day or month. Plain links and GET forms, so
 * the choice is in the URL (bookmarkable, shareable) and works before any script loads.
 */
export function PeriodPicker({ kind, day, month, today }: { kind: PeriodKind; day: string; month: string; today: string }) {
  return (
    <div className="flex flex-wrap items-end gap-3" data-period-picker>
      <nav aria-label="Period" className="inline-flex rounded-xl bg-navy-50 p-1">
        {TABS.map((t) => (
          <Link
            key={t.kind}
            href={t.href}
            aria-current={kind === t.kind ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              kind === t.kind ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <form action="/admin/deal-sharing" method="get" className="flex items-end gap-2">
        <input type="hidden" name="period" value="day" />
        <label className="text-xs text-navy-500">
          <span className="mb-1 block font-medium">Pick a day</span>
          <input type="date" name="date" required max={today} defaultValue={day} className={input(kind === "day")} />
        </label>
        <button type="submit" className={button}>
          Show day
        </button>
      </form>
      <form action="/admin/deal-sharing" method="get" className="flex items-end gap-2">
        <input type="hidden" name="period" value="pickmonth" />
        <label className="text-xs text-navy-500">
          <span className="mb-1 block font-medium">Pick a month</span>
          <input type="month" name="month" required max={today.slice(0, 7)} defaultValue={month} className={input(kind === "pickmonth")} />
        </label>
        <button type="submit" className={button}>
          Show month
        </button>
      </form>
    </div>
  );
}
