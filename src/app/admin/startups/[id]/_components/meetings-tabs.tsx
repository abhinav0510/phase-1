"use client";

import { useState } from "react";
import { Badge } from "@/client/components/ui/badge";
import { JoinLink } from "@/client/components/ui/join-link";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/client/components/admin/ui/table";
import { cn, formatDateTime } from "@/shared/lib/utils";

export interface MeetingRow {
  id: number;
  investor_name: string | null;
  scheduled_at: string | null;
  meet_link: string | null;
  fireflies_id: string | null;
}

/** Investor meetings split into what is coming up and what has already happened. */
export function MeetingsTabs({ upcoming, past }: { upcoming: MeetingRow[]; past: MeetingRow[] }) {
  const [tab, setTab] = useState<"upcoming" | "past">(upcoming.length || !past.length ? "upcoming" : "past");
  const rows = tab === "upcoming" ? upcoming : past;
  return (
    <div>
      <div role="tablist" aria-label="Meetings" className="mx-5 mb-2 inline-flex rounded-xl bg-navy-50 p-1">
        {(
          [
            ["upcoming", "Scheduled", upcoming.length],
            ["past", "Past", past.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              tab === key ? "bg-white text-navy-900 shadow-sm" : "text-navy-500 hover:text-navy-800",
            )}
          >
            {label} <span className="ml-1 text-navy-400">{n}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="p-5">
          <EmptyState title={tab === "upcoming" ? "No meetings coming up" : "No past meetings"} />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Investor</TH>
              <TH>When</TH>
              <TH>{tab === "upcoming" ? "Join" : "Status"}</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((m) => (
              <TR key={m.id}>
                <TD className="text-navy-700">{m.investor_name ?? "—"}</TD>
                <TD className="whitespace-nowrap text-navy-500">{formatDateTime(m.scheduled_at)}</TD>
                <TD>
                  {tab === "upcoming" ? (
                    <JoinLink href={m.meet_link} />
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Badge tone="green">Held</Badge>
                      {m.fireflies_id ? <Badge tone="violet">Transcript</Badge> : null}
                    </span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
