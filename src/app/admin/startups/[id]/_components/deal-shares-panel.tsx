"use client";

import { useState } from "react";
import { Badge } from "@/client/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/client/components/admin/ui/table";
import { Donut, type DonutSlice } from "@/app/(founder)/dashboard/_components/charts";
import { SERIES } from "@/app/(founder)/dashboard/_components/palette";
import { DEAL_STATUS_LABEL, type DealShare, type DealStatus } from "@/shared/lib/deal-shares";
import { toRupees } from "@/shared/lib/currency";
import { cn, formatDate } from "@/shared/lib/utils";

const ORDER: DealStatus[] = ["invite", "interested", "pass", "no_reply"];
const COLOR: Record<DealStatus, string> = {
  invite: SERIES.leaf,
  interested: SERIES.navy,
  pass: SERIES.coral,
  no_reply: "#c3cad8",
};
const TONE: Record<DealStatus, "green" | "blue" | "red" | "gray"> = {
  invite: "green",
  interested: "blue",
  pass: "red",
  no_reply: "gray",
};

/**
 * Who the deal went to and how each investor answered: a donut of the replies, totals,
 * and the table, which the donut's legend filters to one status at a time.
 */
export function DealSharesPanel({ shares, failed }: { shares: DealShare[]; failed: boolean }) {
  const [filter, setFilter] = useState<DealStatus | null>(null);
  const count = (s: DealStatus) => shares.filter((d) => d.status === s).length;
  const slices: DonutSlice[] = ORDER.map((s) => ({ key: s, label: DEAL_STATUS_LABEL[s], value: count(s), color: COLOR[s] }));
  const shown = filter ? shares.filter((d) => d.status === filter) : shares;
  const positive = count("invite") + count("interested");

  if (shares.length === 0) {
    return (
      <div className="p-5">
        <EmptyState title={failed ? "Couldn't load the PIPELINE deals" : "This deal hasn't been shared with any investor yet"} />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 px-5 pb-5 pt-3 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex items-center gap-6">
          <Donut slices={slices} total={shares.length} centerLabel="deals shared" />
          <ul className="space-y-1.5" aria-label="Filter by reply">
            {slices.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setFilter(filter === s.key ? null : (s.key as DealStatus))}
                  aria-pressed={filter === s.key}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-navy-50",
                    filter === s.key && "bg-navy-50 font-semibold",
                    filter && filter !== s.key && "opacity-50",
                  )}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="text-navy-700">{s.label}</span>
                  <span className="ml-auto pl-4 font-semibold text-navy-900">{s.value}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-3 gap-3" data-deal-totals>
          <Stat label="Deals shared" value={shares.length} />
          <Stat label="Investors interested" value={positive} hint="Interested or asked to meet" tone="text-emerald-700" />
          <Stat label="Passed" value={count("pass")} tone="text-red-600" />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-navy-50 px-5 py-2 text-xs text-navy-500">
        <span>
          {filter ? `${shown.length} ${DEAL_STATUS_LABEL[filter].toLowerCase()}` : `All ${shares.length} investors`}
        </span>
        {filter ? (
          <button type="button" onClick={() => setFilter(null)} className="font-semibold text-navy-700 hover:underline">
            Show all
          </button>
        ) : (
          <span>Click a status to filter</span>
        )}
      </div>
      <Table>
        <THead>
          <tr>
            <TH>Investor</TH>
            <TH>Shared</TH>
            <TH>Status</TH>
            <TH>What the sheet says</TH>
            <TH>Meeting</TH>
          </tr>
        </THead>
        <TBody>
          {shown.map((d, i) => (
            <TR key={`${d.investorId ?? d.investorName}-${i}`}>
              <TD className="font-medium text-navy-800">{d.investorName}</TD>
              <TD className="whitespace-nowrap text-navy-500">
                {formatDate(d.firstSentAt)}
                {d.emails > 1 ? <span className="block text-xs text-navy-400">Shared {d.emails} times, last {formatDate(d.lastSentAt)}</span> : null}
              </TD>
              <TD>
                <Badge tone={TONE[d.status]}>{DEAL_STATUS_LABEL[d.status]}</Badge>
                {d.repliedAt && d.status !== "no_reply" ? <span className="mt-0.5 block text-xs text-navy-400">{formatDate(d.repliedAt)}</span> : null}
              </TD>
              <TD className="max-w-md whitespace-pre-wrap break-words text-navy-600">{d.gist ? toRupees(d.gist) : "—"}</TD>
              <TD className="whitespace-nowrap text-navy-500">
                {d.meetingAt ? `${d.meetingPast ? "Met" : "Scheduled"} ${formatDate(d.meetingAt)}` : "—"}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: number; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-navy-100/80 bg-navy-50/40 px-4 py-3">
      <p className="text-xs text-navy-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold text-navy-900", tone)}>{value}</p>
      {hint ? <p className="text-[11px] text-navy-400">{hint}</p> : null}
    </div>
  );
}
