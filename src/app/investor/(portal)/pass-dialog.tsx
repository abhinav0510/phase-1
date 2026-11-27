"use client";

import { useMemo, useState, useTransition } from "react";
import { BellPlus, Loader2, Lock, ThumbsDown, X } from "lucide-react";
import { buttonClass, inputClass } from "@/client/components/founder/ui";
import { cn } from "@/shared/lib/utils";
import { formatMetric, PASS_REASONS, suggestThesisChange, TRIGGER_METRICS } from "@/shared/lib/deal-signals";
import type { PassReason, TriggerMetric } from "@/shared/types/db";
import { passDeal } from "./deal-actions";

export interface PassTarget {
  startupId: number;
  startupName: string;
  /** The startup's agents' codes, for the "stop showing me…" suggestion. */
  sectorCodes: string[];
  stageCode: string | null;
  revenueL: number | null;
  /** Current values, so the investor can pick a sensible target. */
  metrics: Record<TriggerMetric, number | null>;
}

/** "Pass" button that opens the pass dialog. */
export function PassButton({ target, size = "sm", className }: { target: PassTarget; size?: "sm" | "md"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn(buttonClass("ghost", size), className)}>
        <ThumbsDown className="h-3.5 w-3.5" /> Pass
      </button>
      {done ? (
        <p role="status" className="rounded-xl bg-leaf-50 px-3 py-2 text-xs text-leaf-700">
          {done}
        </p>
      ) : null}
      {open ? (
        <PassDialog
          target={target}
          onClose={() => setOpen(false)}
          onDone={(m) => {
            setOpen(false);
            setDone(m);
          }}
        />
      ) : null}
    </>
  );
}

function PassDialog({ target, onClose, onDone }: { target: PassTarget; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = useState<PassReason | null>(null);
  const [text, setText] = useState("");
  const [applyThesis, setApplyThesis] = useState(true);
  const [watch, setWatch] = useState(false);
  const [metric, setMetric] = useState<TriggerMetric>("mrr_l");
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const suggestion = useMemo(
    () => (reason ? suggestThesisChange(reason, { sectorCodes: target.sectorCodes, stageCode: target.stageCode, revenue_inr_l: target.revenueL }) : null),
    [reason, target],
  );
  const [minRevenue, setMinRevenue] = useState<string>("");
  const now = target.metrics[metric];
  const metricInfo = TRIGGER_METRICS.find((m) => m.key === metric)!;

  const submit = () => {
    if (!reason) return setError("Pick a reason for passing.");
    if (reason === "other" && !text.trim()) return setError("Tell us a little about why you're passing.");
    const t = Number(threshold);
    if (watch && !(t > 0)) return setError("Enter the target you'd like to be told about.");
    setError(null);
    start(async () => {
      const res = await passDeal(target.startupId, {
        reason,
        text: text.trim(),
        applyThesis: !!suggestion && applyThesis,
        minRevenueL: suggestion?.key === "min_revenue" && minRevenue ? Number(minRevenue) : null,
        trigger: watch ? { metric, threshold: t } : null,
      });
      if (res.ok) onDone(res.message);
      else setError(res.error);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-tide/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="pass-title" className="w-full max-w-lg rounded-[20px] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="pass-title" className="text-lg font-semibold text-tide">
              Pass on {target.startupName}
            </h2>
            <p className="mt-0.5 text-sm text-navy-500">Your reason helps Sidana send you better deals.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-navy-500 hover:bg-navy-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="mb-2 text-xs font-semibold text-navy-700">Why are you passing?</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup">
            {PASS_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                role="radio"
                aria-checked={reason === r.key}
                onClick={() => setReason(r.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition",
                  reason === r.key ? "bg-ocean-600 text-white ring-ocean-600" : "bg-white text-navy-700 ring-navy-200 hover:bg-navy-50",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block text-xs font-semibold text-navy-700">
          Anything to add? {reason === "other" ? "" : <span className="font-normal text-navy-400">(optional)</span>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder="e.g. We'd want to see two more quarters of revenue first."
            className={cn(inputClass, "mt-1 resize-none")}
          />
        </label>

        {suggestion ? (
          <div className="mt-4 rounded-2xl bg-ocean-50/70 p-3">
            <label className="flex items-start gap-2 text-sm text-tide">
              <input type="checkbox" checked={applyThesis} onChange={(e) => setApplyThesis(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ocean-600" />
              <span>
                <b>Update my thesis:</b> {suggestion.label}
                <span className="block text-xs text-navy-500">You can undo this any time from your thesis.</span>
              </span>
            </label>
            {suggestion.key === "min_revenue" && applyThesis ? (
              <label className="mt-2 flex items-center gap-2 pl-6 text-xs text-navy-600">
                Minimum ARR (₹ lakh)
                <input
                  type="number"
                  min={1}
                  value={minRevenue}
                  placeholder={String(suggestion.value)}
                  onChange={(e) => setMinRevenue(e.target.value)}
                  className={cn(inputClass, "w-28 py-1.5")}
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-navy-100 p-3">
          <label className="flex items-start gap-2 text-sm text-tide">
            <input type="checkbox" checked={watch} onChange={(e) => setWatch(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ocean-600" />
            <span>
              <b className="inline-flex items-center gap-1">
                <BellPlus className="h-3.5 w-3.5" /> Tell me if things change
              </b>
              <span className="block text-xs text-navy-500">We&apos;ll notify you when {target.startupName} reaches a target you set.</span>
            </span>
          </label>
          {watch ? (
            <div className="mt-3 grid grid-cols-1 gap-2 pl-6 sm:grid-cols-[1fr_140px]">
              <select value={metric} onChange={(e) => setMetric(e.target.value as TriggerMetric)} className={inputClass} aria-label="Target">
                {TRIGGER_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={metricInfo.unit}
                aria-label={`Target in ${metricInfo.unit}`}
                className={inputClass}
              />
              <p className="text-xs text-navy-500 sm:col-span-2">
                {metricInfo.help} {now != null ? `Now: ${formatMetric(metric, now)}.` : "No figures uploaded for this yet."}
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl bg-navy-50 px-3 py-2 text-xs text-navy-600">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Private: your reason and any trigger are seen only by you and Sidana&apos;s team. The founder is never told.
        </p>

        {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("ghost", "sm")}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={pending || !reason} className={buttonClass("dark", "sm")}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
            Pass on this deal
          </button>
        </div>
      </div>
    </div>
  );
}
