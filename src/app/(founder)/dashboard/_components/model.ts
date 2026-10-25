import type { Match, Meeting, WeeklyReport } from "@/lib/types/db";
import type { DonutSlice, WeekPoint } from "./charts";
import { SERIES } from "./palette";

// Pure view-model helpers for the founder dashboard. Everything here is derived
// from the founder's own rows (already scoped by startupId in lib/data/founder).

type MatchRow = Match & {
  investor: { id: number; name: string | null; type: string | null } | null;
};

export const MATCH_STATE_META: Record<
  string,
  { label: string; color: string; order: number }
> = {
  sent: { label: "Reached out", color: SERIES.navy, order: 0 },
  queued: { label: "In queue", color: SERIES.gold, order: 1 },
  tracker_only: { label: "Tracker only", color: SERIES.teal, order: 2 },
  paused: { label: "Paused", color: SERIES.coral, order: 3 },
  not_queued: { label: "Not queued", color: SERIES.violet, order: 4 },
};

export function matchStateSlices(matches: MatchRow[]): DonutSlice[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const k = m.state ?? "not_queued";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Object.entries(MATCH_STATE_META)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([key, meta]) => ({
      key,
      label: meta.label,
      value: counts.get(key) ?? 0,
      color: meta.color,
    }));
}

const TYPE_LABEL: Record<string, string> = {
  angel: "Angels",
  angel_network: "Angel networks",
  syndicate: "Syndicates",
  micro_vc: "Micro VCs",
  seed_fund: "Seed funds",
  institutional_vc: "Institutional VCs",
  family_office: "Family offices",
  other: "Other",
};

export function investorMix(matches: MatchRow[]): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const k = m.investor?.type ?? "other";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([k, v]) => ({ label: TYPE_LABEL[k] ?? k.replace(/_/g, " "), value: v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

export interface PipelineStage {
  key: string;
  label: string;
  count: number;
  names: string[];
}

export function pipelineStages(
  matches: MatchRow[],
  meetings: Meeting[],
): PipelineStage[] {
  const names = (rows: MatchRow[]) =>
    rows.map((m) => m.investor?.name).filter((n): n is string => !!n);
  const meetingNames = (rows: Meeting[]) =>
    rows.map((m) => m.investor_name).filter((n): n is string => !!n);
  const scheduled = meetings.filter((m) => !!m.scheduled_at);
  const held = meetings.filter((m) => m.held === true);
  return [
    { key: "matched", label: "Matched", count: matches.length, names: names(matches) },
    {
      key: "queued",
      label: "In queue",
      count: matches.filter((m) => m.state === "queued").length,
      names: names(matches.filter((m) => m.state === "queued")),
    },
    {
      key: "sent",
      label: "Reached out",
      count: matches.filter((m) => m.state === "sent").length,
      names: names(matches.filter((m) => m.state === "sent")),
    },
    { key: "meetings", label: "Meetings", count: scheduled.length, names: meetingNames(scheduled) },
    { key: "held", label: "Held", count: held.length, names: meetingNames(held) },
  ];
}

export function weekPoints(reports: WeeklyReport[], n = 8): WeekPoint[] {
  return reports
    .slice(0, n)
    .reverse()
    .map((r) => ({
      week: new Date(r.week_start).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
      reached: r.reached ?? 0,
      followups: r.followups ?? 0,
      meetings: r.meetings ?? 0,
    }));
}

export type ActivityKind = "match" | "meeting" | "held" | "report";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: Date;
}

export function activityFeed(
  matches: MatchRow[],
  meetings: Meeting[],
  reports: WeeklyReport[],
  limit = 5,
  now = new Date(),
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const m of matches) {
    if (!m.created_at) continue;
    events.push({
      id: `m${m.id}`,
      kind: "match",
      title: m.investor?.name ?? "Investor",
      detail: m.state === "sent" ? "Reached out" : "Matched",
      at: new Date(m.created_at),
    });
  }
  for (const mt of meetings) {
    const when = mt.scheduled_at ?? mt.created_at;
    if (!when) continue;
    events.push({
      id: `mt${mt.id}`,
      kind: mt.held ? "held" : "meeting",
      title: mt.investor_name ?? (mt.source ? `via ${mt.source}` : "Investor"),
      detail: mt.held
        ? "Meeting held"
        : new Date(when) < now
          ? "Meeting"
          : "Meeting scheduled",
      at: new Date(when),
    });
  }
  for (const r of reports) {
    const when = r.created_at ?? r.week_end ?? r.week_start;
    events.push({
      id: `r${r.id}`,
      kind: "report",
      title: "Weekly report",
      detail: `${r.reached} reached · ${r.meetings} meetings`,
      at: new Date(when),
    });
  }
  return events
    .filter((e) => !Number.isNaN(e.at.getTime()))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

/** "2 hrs ago", "in 3 days", "just now". */
export function relativeTime(d: Date, now = new Date()): string {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const future = diff > 0;
  const min = Math.round(abs / 60000);
  const hr = Math.round(abs / 3600000);
  const day = Math.round(abs / 86400000);
  let s: string;
  if (min < 1) return "just now";
  if (min < 60) s = `${min} min`;
  else if (hr < 24) s = `${hr} hr${hr === 1 ? "" : "s"}`;
  else if (day < 30) s = `${day} day${day === 1 ? "" : "s"}`;
  else {
    const mo = Math.round(day / 30);
    s = `${mo} mo`;
  }
  return future ? `in ${s}` : `${s} ago`;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
