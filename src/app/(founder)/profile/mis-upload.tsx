"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Loader2, Trash2, UploadCloud } from "lucide-react";
import { cn, formatDate } from "@/shared/lib/utils";
import { buttonClass } from "@/client/components/founder/ui";
import { removeMis, uploadMis } from "./mis-actions";

const MAX_BYTES = 3 * 1024 * 1024; // matches the server cap
const ACCEPT = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export interface MisItem {
  id: number;
  file_name: string;
  size_bytes: number;
  created_at: string;
}

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Upload button and list for the founder's MIS spreadsheets. Saves at once, separately from the form. */
export function MisUpload({ files: initialFiles, ready }: { files: MisItem[]; ready: boolean }) {
  // The list is kept here so an upload never redraws the profile form around it.
  const [files, setFiles] = useState<MisItem[]>(initialFiles);
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  // Until React has taken over the server HTML, picking a file would go nowhere.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const off = pending || !ready || !mounted;

  function pick(file: File | undefined) {
    setMsg(null);
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) return setMsg({ ok: false, text: "Upload an Excel file (.xlsx or .xls)." });
    if (file.size > MAX_BYTES) return setMsg({ ok: false, text: "That file is over 3 MB. Please upload a smaller one." });
    const fd = new FormData();
    fd.append("mis", file);
    startTransition(async () => {
      const r = await uploadMis(fd);
      if (input.current) input.current.value = "";
      setMsg(r.ok ? { ok: true, text: "Uploaded. The Sidana team can see it now." } : { ok: false, text: r.error });
      if (r.ok) setFiles((list) => [r.file, ...list.filter((f) => f.id !== r.file.id)]);
    });
  }

  function remove(id: number) {
    setMsg(null);
    startTransition(async () => {
      const r = await removeMis(id);
      setMsg(r.ok ? { ok: true, text: "File removed." } : { ok: false, text: r.error });
      if (r.ok) setFiles((list) => list.filter((f) => f.id !== id));
    });
  }

  return (
    <div id="mis">
      <p className="mb-1.5 text-sm font-medium text-tide">Upload your MIS</p>
      <input
        ref={input}
        id="pf-mis"
        type="file"
        accept={ACCEPT}
        className="sr-only"
        aria-label="Upload your MIS (Excel file)"
        disabled={off}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={off}
        className={cn(buttonClass("ghost", "md"), "w-full sm:w-auto")}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {pending ? "Uploading…" : "Upload MIS"}
      </button>
      <p className="mt-1 text-xs text-navy-400">
        {ready ? "Your monthly MIS as an Excel file (.xlsx or .xls), up to 3 MB. It goes straight to the Sidana team." : "MIS uploads aren't switched on yet."}
      </p>
      {msg ? (
        <p role="status" className={cn("mt-1 text-xs", msg.ok ? "text-emerald-700" : "text-red-600")}>
          {msg.text}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label="Uploaded MIS files">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white px-3 py-2">
              <FileSpreadsheet className="h-4 w-4 shrink-0 text-leaf-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-tide">{f.file_name}</p>
                <p className="text-xs text-navy-400">
                  {formatDate(f.created_at)} · {size(f.size_bytes)}
                </p>
              </div>
              <a href={`/api/mis/${f.id}`} className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-50 hover:text-tide" aria-label={`Download ${f.file_name}`}>
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => remove(f.id)}
                disabled={pending}
                className="rounded-lg p-1.5 text-navy-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remove ${f.file_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
