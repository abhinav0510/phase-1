// How many deals were shared, with whom, and how investors answered — counted exactly the
// way the team's DAILY-REPORT workflow counts the Pilot sheet's PIPELINE tab, so the admin
// panel and the 6 PM report never disagree. Plain functions (no I/O), unit-tested against
// a copy of the report's own code (tests/unit/deal-sharing.test.ts).
//
// Definitions (from DAILY-REPORT's Build node):
// - A row counts only when deal_shared is exactly "Yes" and it has a startup and an investor.
// - Rows are grouped into PAIRS: one startup + one investor firm ("Firm - Person" counts
//   as the firm). A pair's date is its EARLIEST date_shared; its response, status and
//   meeting flag are the LAST non-empty values down the sheet.
// - "Deals shared" in a period = pairs whose date falls in it (the report's month figure).
// - "Shared on a day" in the report's Today table = raw rows with that date_shared, not
//   grouped; both numbers are given so they can be shown side by side.
// - Each pair gets one category, first match wins, see categorize().

export type DealCategory = "meeting" | "tobook" | "passed" | "referred" | "interested" | "other" | "bounced" | "none";

/** The PIPELINE columns the panel needs, as mirrored into Supabase pipeline_deals. */
export interface PipelineRow {
  deal_id: string;
  row_no: number;
  startup: string | null;
  owner: string | null;
  investor: string | null;
  investor_domains?: string[] | null;
  deal_shared: string | null;
  date_shared: string | null;
  last_contact?: string | null;
  next_action?: string | null;
  investor_response?: string | null;
  deal_status?: string | null;
  meeting_scheduled?: string | null;
  match_type?: string | null;
  channel?: string | null;
}

/** A meeting from the calendars (Supabase meetings), to mark a pair as met. */
export interface PairMeeting {
  startup_name: string | null;
  investor_name: string | null;
  scheduled_at: string | null;
}

export interface DealPair {
  key: string;
  startup: string;
  investor: string;
  owner: string;
  /** Earliest date_shared (YYYY-MM-DD as written in the sheet). */
  date: string;
  /** Latest of date_shared / last_contact. */
  last: string;
  response: string;
  status: string;
  nextAction: string;
  category: DealCategory;
  /** Sheet rows behind this pair, oldest first. */
  dealIds: string[];
  /** Number of rows with deal_shared = Yes (more than one = shared again). */
  rows: number;
  matchType: string;
  channel: string;
  /** Last non-empty meeting_scheduled. */
  meetingFlag: string;
}

const s = (v: unknown) => String(v == null ? "" : v).trim();

/** The report's name key: lower case, no apostrophes, no "(…)", letters and digits only. */
export const nz = (x: unknown) =>
  s(x)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");

/** "Firm - Person" -> "Firm", as the report keys investors. */
export const firmOf = (investor: string) => investor.split(/\s+-\s+/)[0];

export const pairKey = (startup: string, investor: string) => `${nz(startup)}|${nz(firmOf(investor))}`;

const ISO_DAY = /^\d{4}-\d\d-\d\d$/;

/** Group shared rows into pairs, exactly like DAILY-REPORT (rows in sheet order). */
export function buildPairs(rows: PipelineRow[]): DealPair[] {
  const sorted = [...rows].sort((a, b) => a.row_no - b.row_no);
  const pairs = new Map<string, DealPair>();
  for (const r of sorted) {
    if (s(r.deal_shared) !== "Yes") continue;
    const su = s(r.startup);
    const inv = s(r.investor);
    if (!su || !inv) continue;
    const key = pairKey(su, inv);
    const date = s(r.date_shared);
    const x =
      pairs.get(key) ??
      ({
        key,
        startup: su,
        investor: inv,
        owner: s(r.owner),
        date,
        last: "",
        response: "",
        status: "",
        nextAction: "",
        category: "none",
        dealIds: [],
        rows: 0,
        matchType: s(r.match_type),
        channel: s(r.channel),
        meetingFlag: "",
      } satisfies DealPair);
    for (const c of [r.date_shared, r.last_contact]) {
      const v = s(c).slice(0, 10);
      if (ISO_DAY.test(v) && v > x.last) x.last = v;
    }
    if (s(r.investor_response)) x.response = s(r.investor_response);
    if (s(r.deal_status)) x.status = s(r.deal_status);
    if (s(r.meeting_scheduled)) x.meetingFlag = s(r.meeting_scheduled);
    if (s(r.next_action)) x.nextAction = s(r.next_action);
    if (date && (!x.date || date < x.date)) x.date = date;
    x.dealIds.push(r.deal_id);
    x.rows += 1;
    pairs.set(key, x);
  }
  return [...pairs.values()];
}

/** True when a calendar meeting belongs to this pair (same startup, investor firm named). */
function meetingMatches(pair: DealPair, m: PairMeeting): boolean {
  if (nz(m.startup_name) !== nz(pair.startup)) return false;
  const ik = nz(firmOf(pair.investor));
  const mk = nz(m.investor_name);
  if (ik.length < 4 || mk.length < 4) return false;
  return mk.includes(ik) || ik.includes(mk);
}

/**
 * The report's category, first match wins. A meeting counts when the calendars have one
 * for the pair, or the sheet says so (response/status mention a meeting that isn't just
 * a request, or meeting_scheduled starts with "Yes").
 */
export function categorize(pair: DealPair, hasCalendarMeeting: boolean): DealCategory {
  const R = pair.response;
  const St = pair.status;
  const both = `${R} ${St}`;
  const sheetMeet = (/meeting/i.test(both) && !/request/i.test(both)) || /^yes/i.test(pair.meetingFlag);
  if (/^bounced/i.test(R)) return "bounced";
  if (hasCalendarMeeting || sheetMeet) return "meeting";
  if (/^meeting requested/i.test(R) || /^book meeting/i.test(pair.nextAction) || /(asked|wants|requested).{0,30}(meeting|call)|slots? (sent|shared|requested)/i.test(R))
    return "tobook";
  if (/^pass/i.test(R) || /^pass|not relevant/i.test(St)) return "passed";
  if (/refer|forward/i.test(R) || (!R && /refer/i.test(St))) return "referred";
  if (/not active|needs review/i.test(R)) return "other";
  if (/intrest|interest|question|asked|request|reviewing|under review|deck|document|form|excel|positive|call|evaluat/i.test(R) || (!R && /reviewing|question|docs/i.test(St)))
    return "interested";
  if (R) return "other";
  return "none";
}

/** Pairs with their categories, meetings matched from the calendars. */
export function categorizedPairs(rows: PipelineRow[], meetings: PairMeeting[]): DealPair[] {
  return buildPairs(rows).map((p) => {
    p.category = categorize(p, meetings.some((m) => meetingMatches(p, m)));
    return p;
  });
}

export const CATEGORY_LABEL: Record<DealCategory, string> = {
  meeting: "Meeting",
  tobook: "Meeting to book",
  interested: "Interested",
  passed: "Passed",
  referred: "Referred",
  other: "Other reply",
  bounced: "Bounced",
  none: "No reply yet",
};

/** "Responses" in the report: any category except none and bounced. */
export const isResponse = (c: DealCategory) => c !== "none" && c !== "bounced";

// ---------------------------------------------------------------- periods (IST days)

export type PeriodKind = "today" | "week" | "month" | "day" | "pickmonth";

export interface Period {
  kind: PeriodKind;
  /** Inclusive first and last IST day, YYYY-MM-DD. */
  from: string;
  to: string;
  label: string;
}

const IST_MS = 5.5 * 3600e3;
export const istToday = (nowMs: number) => new Date(nowMs + IST_MS).toISOString().slice(0, 10);

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const lastDayOfMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const longDay = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
export const longMonthOf = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

/**
 * Resolve the page's period from its search params. Weeks run Monday to Sunday. A chosen day
 * or month in the future, or not a real date, falls back to today / this month.
 */
export function resolvePeriod(params: { period?: string; date?: string; month?: string }, nowMs: number): Period {
  const today = istToday(nowMs);
  const thisMonth = today.slice(0, 7);
  const validDay = (d?: string) => !!d && ISO_DAY.test(d) && addDays(d, 0) === d && d <= today;
  const validMonth = (m?: string) => !!m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) && m <= thisMonth;

  if (params.period === "day" || (params.date && !params.period)) {
    if (validDay(params.date)) return { kind: "day", from: params.date!, to: params.date!, label: longDay(params.date!) };
  }
  if (params.period === "pickmonth" || (params.month && !params.period)) {
    if (validMonth(params.month)) {
      const m = params.month!;
      return { kind: "pickmonth", from: `${m}-01`, to: m === thisMonth ? today : lastDayOfMonth(m), label: longMonthOf(m) };
    }
  }
  if (params.period === "week") {
    const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    const from = addDays(today, -dow);
    return { kind: "week", from, to: today, label: `This week (${longDay(from)} – ${longDay(today)})` };
  }
  if (params.period === "month") {
    return { kind: "month", from: `${thisMonth}-01`, to: today, label: longMonthOf(thisMonth) };
  }
  return { kind: "today", from: today, to: today, label: `Today, ${longDay(today)}` };
}

export const inPeriod = (day: string, p: Period) => ISO_DAY.test(day.slice(0, 10)) && day.slice(0, 10) >= p.from && day.slice(0, 10) <= p.to;

/** Every IST day of the period, oldest first. */
export function daysOf(p: Period): string[] {
  const out: string[] = [];
  for (let d = p.from; d <= p.to; d = addDays(d, 1)) out.push(d);
  return out;
}

// ---------------------------------------------------------------- totals

export interface PeriodTotals {
  /** Pairs first shared in the period: the report's "Deals shared". */
  shares: number;
  /** Raw PIPELINE rows with deal_shared = Yes dated in the period: the report's "Deals shared today" basis. */
  rowShares: number;
  startups: number;
  investors: number;
  responses: number;
  interested: number;
  meetings: number;
  passed: number;
  noReply: number;
}

export function periodPairs(pairs: DealPair[], p: Period): DealPair[] {
  return pairs.filter((x) => inPeriod(x.date, p)).sort((a, b) => (a.date === b.date ? a.startup.localeCompare(b.startup) : a.date < b.date ? 1 : -1));
}

export function rowSharesIn(rows: PipelineRow[], p: Period): number {
  return rows.filter((r) => s(r.deal_shared) === "Yes" && inPeriod(s(r.date_shared), p)).length;
}

export function totalsFor(pairs: DealPair[], rows: PipelineRow[], p: Period): PeriodTotals {
  const ps = periodPairs(pairs, p);
  const by = (c: DealCategory) => ps.filter((x) => x.category === c).length;
  return {
    shares: ps.length,
    rowShares: rowSharesIn(rows, p),
    startups: new Set(ps.map((x) => nz(x.startup))).size,
    investors: new Set(ps.map((x) => nz(firmOf(x.investor)))).size,
    responses: ps.filter((x) => isResponse(x.category)).length,
    interested: by("interested"),
    meetings: by("meeting") + by("tobook"),
    passed: by("passed"),
    noReply: by("none"),
  };
}

/** Pairs first shared on each day of the period, for the bar chart. */
export function dailySeries(pairs: DealPair[], p: Period): { day: string; shares: number }[] {
  const count = new Map<string, number>();
  for (const x of pairs) if (inPeriod(x.date, p)) count.set(x.date.slice(0, 10), (count.get(x.date.slice(0, 10)) ?? 0) + 1);
  return daysOf(p).map((day) => ({ day, shares: count.get(day) ?? 0 }));
}
