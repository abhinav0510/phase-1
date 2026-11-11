"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/client/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/client/components/admin/ui/table";
import { CATEGORY_LABEL, type DealCategory } from "@/shared/lib/deal-sharing";
import { cn, formatDate } from "@/shared/lib/utils";

export interface ShareRow {
  key: string;
  date: string;
  startup: string;
  startupId: number | null;
  investor: string;
  owner: string;
  category: DealCategory;
  response: string;
  status: string;
  rows: number;
  dealIds: string[];
}

const TONE: Record<DealCategory, "green" | "blue" | "red" | "gray" | "amber" | "violet"> = {
  meeting: "green",
  tobook: "green",
  interested: "blue",
  passed: "red",
  referred: "violet",
  other: "amber",
  bounced: "gray",
  none: "gray",
};
const ORDER: DealCategory[] = ["meeting", "tobook", "interested", "passed", "referred", "other", "bounced", "none"];

/** Every deal shared in the period: who it went to and what they said, filterable. */
export function SharesTable({ rows, showDate }: { rows: ShareRow[]; showDate: boolean }) {
  const [status, setStatus] = useState<DealCategory | "all">("all");
  const [q, setQ] = useState("");
  const counts = useMemo(() => {
    const c = new Map<DealCategory, number>();
    for (const r of rows) c.set(r.category, (c.get(r.category) ?? 0) + 1);
    return c;
  }, [rows]);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (status === "all" || r.category === status) &&
      (!needle || r.startup.toLowerCase().includes(needle) || r.investor.toLowerCase().includes(needle) || r.owner.toLowerCase().includes(needle)),
  );

  if (rows.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title="No deals were shared in this period" />
      </div>
    );
  }
  return (
    <div data-shares-table>
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
        <button
          type="button"
          onClick={() => setStatus("all")}
          aria-pressed={status === "all"}
          className={chip(status === "all")}
        >
          All <span className="ml-1 text-navy-400">{rows.length}</span>
        </button>
        {ORDER.filter((c) => counts.get(c)).map((c) => (
          <button key={c} type="button" onClick={() => setStatus(status === c ? "all" : c)} aria-pressed={status === c} className={chip(status === c)}>
            {CATEGORY_LABEL[c]} <span className="ml-1 text-navy-400">{counts.get(c)}</span>
          </button>
        ))}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search startup, investor or owner"
          aria-label="Search deals"
          className="ml-auto w-full rounded-lg border border-navy-200 px-3 py-1.5 text-sm sm:w-64"
        />
      </div>
      <p className="px-5 pb-2 text-xs text-navy-500" data-shown-count>
        Showing {shown.length} of {rows.length}
      </p>
      <Table>
        <THead>
          <tr>
            {showDate ? <TH>Shared on</TH> : null}
            <TH>Startup</TH>
            <TH>Investor</TH>
            <TH>Owner</TH>
            <TH>Response</TH>
            <TH>What the sheet says</TH>
          </tr>
        </THead>
        <TBody>
          {shown.map((r) => (
            <TR key={r.key}>
              {showDate ? <TD className="whitespace-nowrap text-navy-500">{formatDate(r.date)}</TD> : null}
              <TD className="font-medium text-navy-800">
                {r.startupId ? (
                  <Link href={`/admin/startups/${r.startupId}`} className="hover:underline">
                    {r.startup}
                  </Link>
                ) : (
                  r.startup
                )}
              </TD>
              <TD className="text-navy-700">
                {r.investor}
                {r.rows > 1 ? <span className="block text-xs text-navy-400">Shared {r.rows} times ({r.dealIds.join(", ")})</span> : null}
              </TD>
              <TD className="text-navy-500">{r.owner || "—"}</TD>
              <TD>
                <Badge tone={TONE[r.category]}>{CATEGORY_LABEL[r.category]}</Badge>
              </TD>
              <TD className="max-w-sm whitespace-pre-wrap break-words text-xs text-navy-600">
                {[r.response, r.status].filter(Boolean).join(" · ") || "—"}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

const chip = (on: boolean) =>
  cn(
    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
    on ? "border-navy-800 bg-navy-900 text-white" : "border-navy-200 text-navy-700 hover:bg-navy-50",
  );
