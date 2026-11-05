"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarClock, Loader2, X } from "lucide-react";
import { buttonClass, inputClass } from "@/client/components/founder/ui";
import { reloadWithNotice } from "@/client/lib/notice-after-reload";
import { saveMonthlyFigures } from "../actions";

/** What is due, as worked out on the server (see shared/lib/figures-due.ts). */
export interface PromptDue {
  month: string | null;
  monthLabel: string | null;
  fy: number | null;
  fyLabel: string | null;
}

const SNOOZE_KEY = "sv:figures-later";
const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

function snoozed(key: string): boolean {
  try {
    return localStorage.getItem(SNOOZE_KEY) === `${key}|${today()}`;
  } catch {
    return false;
  }
}
function snooze(key: string) {
  try {
    localStorage.setItem(SNOOZE_KEY, `${key}|${today()}`);
  } catch {
    // Blocked storage: the prompt just comes back on the next page.
  }
}

/**
 * Asks a founder who has uploaded their figures before for last month's numbers (and a
 * closed year's total in April), so the charts stay current without a new template upload.
 * "Remind me later" hides it for the rest of the day.
 */
export function MonthlyFiguresPrompt({ due }: { due: PromptDue }) {
  const key = `${due.month ?? ""}:${due.fy ?? ""}`;
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const first = useRef<HTMLInputElement>(null);

  // Decided after mount: the snooze lives in this browser only.
  useEffect(() => {
    if ((due.month || due.fy) && !snoozed(key)) setOpen(true);
  }, [due.month, due.fy, key]);
  useEffect(() => {
    if (open) first.current?.focus();
  }, [open]);

  if (!open) return null;

  const later = () => {
    snooze(key);
    setOpen(false);
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await saveMonthlyFigures(fd);
      if (!r.ok) return setErrors(r.errors);
      const what = [due.monthLabel, fd.get("fyRevenue") ? due.fyLabel : null].filter(Boolean).join(" and ");
      // A full reload redraws the charts reliably (see notice-after-reload).
      reloadWithNotice("financials", `Saved your ${what} figures. The charts below are updated.`);
      await new Promise((done) => setTimeout(done, 10_000));
      setOpen(false);
    });
  };

  const amountInput = (name: string, label: string, ref?: React.Ref<HTMLInputElement>) => (
    <div>
      <label htmlFor={`mf-${name}`} className="mb-1.5 block text-sm font-medium text-tide">
        {label} <span className="font-normal text-navy-400">(₹ lakh)</span>
      </label>
      <input
        ref={ref}
        id={`mf-${name}`}
        name={name}
        type="text"
        inputMode="decimal"
        placeholder="e.g. 12.5"
        maxLength={20}
        className={inputClass}
        disabled={pending}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !pending) later();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="monthly-figures-title"
        id="monthly-figures"
        onSubmit={submit}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 bg-navy-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-navy-200" />
            <span className="text-xs font-semibold uppercase tracking-wider text-navy-200">Keep your charts current</span>
          </div>
          <button type="button" onClick={later} className="text-navy-300 hover:text-white" aria-label="Remind me later" disabled={pending}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <h2 id="monthly-figures-title" className="text-lg font-semibold text-navy-900">
              {due.month ? `Add your ${due.monthLabel} figures` : `Add your ${due.fyLabel} revenue`}
            </h2>
            <p className="mt-1 text-sm text-navy-500">
              Takes a minute. Only {due.month ? "this month" : "this year"} is saved; the figures you uploaded before stay as
              they are.
            </p>
          </div>
          {due.month ? (
            <>
              <input type="hidden" name="month" value={due.month} />
              <div className="grid gap-3 sm:grid-cols-3">
                {amountInput("revenue", "Revenue", first)}
                {amountInput("mrr", "MRR")}
                {amountInput("expenses", "Expenses")}
              </div>
            </>
          ) : null}
          {due.fy !== null ? (
            <div className={due.month ? "border-t border-navy-50 pt-4" : undefined}>
              <input type="hidden" name="fy" value={due.fy} />
              <label htmlFor="mf-fyRevenue" className="mb-1.5 block text-sm font-medium text-tide">
                {due.fyLabel} total revenue <span className="font-normal text-navy-400">(₹ lakh, actual)</span>
              </label>
              <input
                ref={due.month ? undefined : first}
                id="mf-fyRevenue"
                name="fyRevenue"
                type="text"
                inputMode="decimal"
                placeholder="e.g. 180"
                maxLength={20}
                className={inputClass}
                disabled={pending}
              />
              <p className="mt-1 text-xs text-navy-400">The year has closed, so this adds it to your Revenue by year chart.</p>
            </div>
          ) : null}
          {errors.length ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errors.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-navy-50 px-6 py-4">
          <button type="button" onClick={later} disabled={pending} className={buttonClass("ghost", "sm")}>
            Remind me later
          </button>
          <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? "Saving…" : "Save figures"}
          </button>
        </div>
      </form>
    </div>
  );
}
