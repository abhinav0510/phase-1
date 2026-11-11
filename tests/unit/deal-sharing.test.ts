import { describe, expect, it } from "vitest";
import {
  buildPairs,
  categorizedPairs,
  dailySeries,
  firmOf,
  nz,
  periodPairs,
  resolvePeriod,
  totalsFor,
  type PipelineRow,
} from "@/shared/lib/deal-sharing";
import { referenceReport } from "./fixtures/daily-report-reference.mjs";

const HEAD = ["deal_id", "startup", "owner", "investor", "deal_shared", "date_shared", "last_contact", "next_action", "investor_response", "deal_status", "meeting_scheduled"];
const NOW = Date.parse("2026-11-11T06:30:00Z"); // 12:00 IST, Wednesday 11 Nov 2026

// A deterministic jumble of what the PIPELINE tab really holds.
const STARTUPS = ["LearningPad", "Sugar's Daddy", "Orbo AI (Orbo)", "CLIKD", "Bon Cuisine", "Spintly"];
const INVESTORS = ["Accel", "Accel - Kowshik", "12 Flags VC", "Blinc Invest - Harsh Mehta", "Peak XV", "Lok Capital (Pune)", "Inflection Point"];
const RESPONSES = ["", "", "", "Pass", "Passed - too early", "Interested / Reviewing", "Documents Requested", "Questions", "Positive / Meeting", "Meeting requested", "Referral / Forwarded", "Other — needs review", "Bounced", "asked for a call next week", "Not active", "liked the deck"];
const STATUSES = ["", "", "Not relevant", "Passed", "Reviewing", "Referred", "Awaiting docs"];
const DATES = ["2026-09-02", "2026-10-30", "2026-11-01", "2026-11-03", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-11 10:05", "", "2026-11-12"];
const SHARED = ["Yes", "Yes", "Yes", "Yes", "yes", "No", ""];

function fixture(n: number, seed = 7): string[][] {
  let x = seed;
  const pick = <T,>(a: T[]) => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return a[x % a.length];
  };
  const rows: string[][] = [HEAD];
  for (let i = 0; i < n; i++) {
    rows.push([
      `D${String(i + 1).padStart(5, "0")}`,
      pick(STARTUPS),
      pick(["Aditya", "Chaman", "Akansha", "Shradha"]),
      pick(INVESTORS),
      pick(SHARED),
      pick(DATES),
      pick(["", "2026-11-05", "2026-11-11"]),
      pick(["", "", "Book meeting with founder", "Await investor revert"]),
      pick(RESPONSES),
      pick(STATUSES),
      pick(["", "", "", "Yes - 14 Nov", "No"]),
    ]);
  }
  return rows;
}

const toRows = (P: string[][]): PipelineRow[] =>
  P.slice(1).map((r, i) => {
    const o = Object.fromEntries(HEAD.map((h, j) => [h, r[j]])) as Record<string, string>;
    return { ...o, deal_id: o.deal_id, row_no: i + 2 } as unknown as PipelineRow;
  });

describe("deal sharing matches the DAILY-REPORT workflow exactly", () => {
  for (const [n, seed] of [[40, 1], [300, 7], [1200, 99]] as const) {
    it(`gives the report's totals and every pair's category (${n} rows)`, () => {
      const P = fixture(n, seed);
      const ref = referenceReport(P, NOW);
      const rows = toRows(P);
      const pairs = categorizedPairs(rows, []);

      // Same pairs, same first-share dates, same categories.
      expect(pairs.map((p) => [p.key, p.date, p.category]).sort()).toEqual(ref.pairs.map((p) => [p.key, p.date, p.cat]).sort());

      const month = totalsFor(pairs, rows, resolvePeriod({ period: "month" }, NOW));
      expect(month.shares).toBe(ref.T.shares);
      expect(month.responses).toBe(ref.T.responses);
      expect(month.passed).toBe(ref.T.passes);
      const today = totalsFor(pairs, rows, resolvePeriod({}, NOW));
      expect(today.rowShares).toBe(ref.T.sharesToday);
    });
  }
});

describe("pairs", () => {
  const rows = toRows([
    HEAD,
    ["D1", "Sugar's Daddy", "Aditya", "Accel - Kowshik", "Yes", "2026-11-03", "", "", "", "", ""],
    ["D2", "Sugars Daddy", "Aditya", "Accel", "Yes", "2026-11-01", "2026-11-09", "", "Interested / Reviewing", "", ""],
    ["D3", "Sugar's Daddy", "Aditya", "Accel - Kowshik", "Yes", "2026-11-05", "", "", "", "", ""],
    ["D4", "Sugar's Daddy", "Aditya", "Peak XV", "yes", "2026-11-05", "", "", "", "", ""],
    ["D5", "", "Aditya", "Peak XV", "Yes", "2026-11-05", "", "", "", "", ""],
  ]);
  const [pair] = buildPairs(rows);
  it("groups a startup and an investor firm, whoever at the firm it went to", () => {
    expect(buildPairs(rows)).toHaveLength(1);
    expect(pair).toMatchObject({ date: "2026-11-01", last: "2026-11-09", response: "Interested / Reviewing", rows: 3, dealIds: ["D1", "D2", "D3"] });
  });
  it("ignores rows not marked exactly Yes, or with no startup", () => {
    expect(buildPairs(rows).flatMap((p) => p.dealIds)).not.toContain("D4");
    expect(buildPairs(rows).flatMap((p) => p.dealIds)).not.toContain("D5");
  });
  it("keys names like the report", () => {
    expect(nz("Sugar’s Daddy (Pune)")).toBe("sugarsdaddy");
    expect(firmOf("Blinc Invest - Harsh Mehta")).toBe("Blinc Invest");
  });
  it("counts a calendar meeting for the pair as a meeting", () => {
    const [p] = categorizedPairs(rows, [{ startup_name: "Sugar's Daddy", investor_name: "Accel", scheduled_at: "2026-11-12T05:00:00Z" }]);
    expect(p.category).toBe("meeting");
    const [q] = categorizedPairs(rows, [{ startup_name: "Other Co", investor_name: "Accel", scheduled_at: "2026-11-12T05:00:00Z" }]);
    expect(q.category).toBe("interested");
  });
});

describe("periods (IST)", () => {
  it("today, this week (from Monday) and this month", () => {
    expect(resolvePeriod({}, NOW)).toMatchObject({ kind: "today", from: "2026-11-11", to: "2026-11-11" });
    expect(resolvePeriod({ period: "week" }, NOW)).toMatchObject({ from: "2026-11-09", to: "2026-11-11" });
    expect(resolvePeriod({ period: "month" }, NOW)).toMatchObject({ from: "2026-11-01", to: "2026-11-11" });
  });
  it("a chosen past day or month", () => {
    expect(resolvePeriod({ period: "day", date: "2026-09-14" }, NOW)).toMatchObject({ kind: "day", from: "2026-09-14", to: "2026-09-14", label: "14 September 2026" });
    expect(resolvePeriod({ period: "pickmonth", month: "2026-09" }, NOW)).toMatchObject({ from: "2026-09-01", to: "2026-09-30", label: "September 2026" });
    expect(resolvePeriod({ period: "pickmonth", month: "2026-02" }, NOW)).toMatchObject({ to: "2026-02-28" });
    expect(resolvePeriod({ period: "pickmonth", month: "2026-11" }, NOW)).toMatchObject({ to: "2026-11-11" });
  });
  it("falls back to today for a future or impossible date", () => {
    for (const date of ["2026-11-12", "2026-02-30", "14/09/2026", "x"]) expect(resolvePeriod({ period: "day", date }, NOW).kind).toBe("today");
    expect(resolvePeriod({ period: "pickmonth", month: "2026-12" }, NOW).kind).toBe("today");
  });
  it("a Sunday's week starts the Monday before; 00:30 IST is already the next day", () => {
    const sunday = Date.parse("2026-11-15T12:00:00Z");
    expect(resolvePeriod({ period: "week" }, sunday)).toMatchObject({ from: "2026-11-09", to: "2026-11-15" });
    expect(resolvePeriod({}, Date.parse("2026-11-11T19:00:00Z")).from).toBe("2026-11-12");
  });
});

describe("totals and the daily chart", () => {
  const rows = toRows(fixture(300, 7));
  const pairs = categorizedPairs(rows, []);
  const month = resolvePeriod({ period: "month" }, NOW);
  it("the daily bars add up to the period's deals shared", () => {
    const series = dailySeries(pairs, month);
    expect(series).toHaveLength(11);
    expect(series.reduce((a, d) => a + d.shares, 0)).toBe(totalsFor(pairs, rows, month).shares);
  });
  it("the table lists exactly the counted pairs, newest first", () => {
    const list = periodPairs(pairs, month);
    expect(list).toHaveLength(totalsFor(pairs, rows, month).shares);
    expect([...list].map((p) => p.date)).toEqual([...list].map((p) => p.date).sort().reverse());
  });
  it("response figures add up", () => {
    const t = totalsFor(pairs, rows, month);
    expect(t.responses + t.noReply + periodPairs(pairs, month).filter((p) => p.category === "bounced").length).toBe(t.shares);
    expect(t.interested + t.passed + t.meetings).toBeLessThanOrEqual(t.responses);
  });
});
