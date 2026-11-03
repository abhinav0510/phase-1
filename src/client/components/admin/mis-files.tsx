import { Download, FileSpreadsheet } from "lucide-react";
import { formatDateTime } from "@/shared/lib/utils";

export interface MisFileRow {
  id: number;
  file_name: string;
  size_bytes: number;
  created_at: string;
}

/** The founder's uploaded MIS spreadsheets, newest first, each downloadable. */
export function MisFiles({ files, ready }: { files: MisFileRow[]; ready: boolean }) {
  if (!ready) return <p className="text-sm text-navy-400">MIS uploads aren&apos;t switched on yet (MIGRATIONS/startup-mis.sql).</p>;
  if (files.length === 0) return <p className="text-sm text-navy-400">No MIS uploaded yet.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {files.map((f) => (
        <li key={f.id}>
          <a href={`/api/mis/${f.id}`} className="flex items-center gap-2 text-navy-700 hover:text-navy-900 hover:underline">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{f.file_name}</span>
            <span className="shrink-0 text-xs text-navy-400">{formatDateTime(f.created_at)}</span>
            <Download className="h-3.5 w-3.5 shrink-0 text-navy-400" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  );
}
