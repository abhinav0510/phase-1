"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { buttonClass } from "@/client/components/founder/ui";
import { uploadFinancials } from "../actions";

export const TEMPLATE_HREF = "/templates/sidana-financials-template.xlsx";
const MAX_BYTES = 3 * 1024 * 1024; // matches the server cap

/** Download the template, upload it filled in, and see what was saved or what to fix. */
export function FinancialsUpload({ ready, summary }: { ready: boolean; summary: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ ok: true; text: string } | { ok: false; errors: string[] } | null>(null);
  const [pending, startTransition] = useTransition();

  function pick(file: File | undefined) {
    setResult(null);
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) return setResult({ ok: false, errors: ["Upload the template as an Excel file (.xlsx)."] });
    if (file.size > MAX_BYTES) return setResult({ ok: false, errors: ["That file is over 3 MB. Please upload a smaller one."] });
    const fd = new FormData();
    fd.append("financials", file);
    startTransition(async () => {
      const r = await uploadFinancials(fd);
      if (input.current) input.current.value = "";
      if (r.ok) {
        const parts = [r.months ? `${r.months} month${r.months === 1 ? "" : "s"}` : null, r.years ? `${r.years} year${r.years === 1 ? "" : "s"}` : null].filter(Boolean);
        setResult({ ok: true, text: `Saved ${parts.join(" and ")} of figures. The charts below are updated.` });
        router.refresh();
      } else {
        setResult({ ok: false, errors: r.errors });
      }
    });
  }

  return (
    <div id="financials-upload" className="rounded-[20px] border border-navy-100/70 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-leaf-50 text-leaf-700">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-tide">Your monthly and yearly figures</h2>
            <p className="mt-0.5 max-w-2xl text-sm text-navy-500">
              Download the template, fill in monthly revenue, MRR and expenses, past years and projections in ₹ lakh,
              then upload it to draw your charts. Uploading again replaces your earlier figures.
            </p>
            {summary ? <p className="mt-1 text-xs text-navy-400">{summary}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={TEMPLATE_HREF} download className={buttonClass("ghost", "sm")}>
            <Download className="h-4 w-4" /> Download template
          </a>
          <input
            ref={input}
            id="financials-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            aria-label="Upload your filled-in financials template"
            disabled={pending || !ready}
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <button type="button" onClick={() => input.current?.click()} disabled={pending || !ready} className={buttonClass("primary", "sm")}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {pending ? "Checking…" : "Upload figures"}
          </button>
        </div>
      </div>
      {!ready ? <p className="mt-3 text-xs text-navy-400">Financial uploads aren&apos;t switched on yet.</p> : null}
      {result?.ok ? (
        <p role="status" className="mt-3 text-sm text-emerald-700">{result.text}</p>
      ) : result ? (
        <div role="status" className={cn("mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700")}>
          <p className="font-semibold">Nothing was saved. Please fix these and upload again:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
