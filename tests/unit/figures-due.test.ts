import { describe, expect, it } from "vitest";
import { figuresDue, fyName, longMonth } from "@/shared/lib/figures-due";
import { parseMonthEntry } from "@/server/validators/financials-upload";

// Midday IST on a given date, so the time zone never decides the result.
const on = (iso: string) => new Date(`${iso}T06:30:00Z`);
const months = (...m: string[]) => m.map((month) => ({ month }));
const actual = (fy_start: number) => ({ fy_start, kind: "actual" });

describe("figuresDue", () => {
  it("asks nothing of a founder who has never uploaded", () => {
    expect(figuresDue([], [], on("2026-11-05"))).toEqual({ month: null, fy: null });
  });
  it("asks for last month from the 2nd, not on the 1st", () => {
    const m = months("2026-08", "2026-09");
    expect(figuresDue(m, [], on("2026-11-01")).month).toBe(null);
    expect(figuresDue(months("2026-08"), [], on("2026-11-01")).month).toBe("2026-09");
    expect(figuresDue(m, [], on("2026-11-02")).month).toBe("2026-10");
  });
  it("is quiet once last month is in", () => {
    expect(figuresDue(months("2026-09", "2026-10"), [], on("2026-11-20")).month).toBe(null);
  });
  it("asks for the oldest missing month first, and never for months before the first upload", () => {
    expect(figuresDue(months("2026-07"), [], on("2026-11-05")).month).toBe("2026-08");
    expect(figuresDue(months("2026-07", "2026-09"), [], on("2026-11-05")).month).toBe("2026-10");
  });
  it("crosses the year end", () => {
    expect(figuresDue(months("2026-11"), [], on("2027-01-02")).month).toBe("2026-12");
  });
  it("only reaches back 12 months when uploads are very old", () => {
    expect(figuresDue(months("2024-01"), [], on("2026-11-05")).month).toBe("2025-11");
  });
  it("asks for a closed year's total from 2 April, only for founders with yearly figures", () => {
    expect(figuresDue(months("2027-02"), [actual(2025)], on("2027-04-01")).fy).toBe(null);
    expect(figuresDue(months("2027-02"), [actual(2025)], on("2027-04-02")).fy).toBe(2026);
    expect(figuresDue(months("2027-02"), [actual(2025), actual(2026)], on("2027-04-02")).fy).toBe(null);
    expect(figuresDue(months("2027-02"), [], on("2027-04-02")).fy).toBe(null);
    // A projection for that year is not an actual.
    expect(figuresDue([], [actual(2025), { fy_start: 2026, kind: "projected" }], on("2027-05-10")).fy).toBe(2026);
  });
  it("names months and years for the prompt", () => {
    expect(longMonth("2026-10")).toBe("October 2026");
    expect(fyName(2025)).toBe("FY 2025-26");
  });
});

describe("parseMonthEntry", () => {
  const now = on("2026-11-05");
  it("takes one month with any of its amounts", () => {
    expect(parseMonthEntry({ month: "2026-10", revenue: "25.2", mrr: "", expenses: "1,200" }, now)).toEqual({
      ok: true,
      month: { month: "2026-10", revenue_inr_l: 25.2, mrr_inr_l: null, expenses_inr_l: 1200 },
      year: null,
    });
  });
  it("refuses an unfinished month, blanks and words", () => {
    expect(parseMonthEntry({ month: "2026-11", revenue: "5" }, now).ok).toBe(false);
    expect(parseMonthEntry({ month: "2026-10" }, now)).toEqual({ ok: false, errors: ["Add at least one amount for the month."] });
    const bad = parseMonthEntry({ month: "2026-10", revenue: "lots", mrr: "-3" }, now);
    expect(bad.ok ? [] : bad.errors[0]).toMatch(/Revenue, MRR must be a number/);
  });
  it("takes a closed year's total, and refuses the open year", () => {
    expect(parseMonthEntry({ fy: "2025", fyRevenue: "180" }, now)).toEqual({
      ok: true,
      month: null,
      year: { fy_start: 2025, kind: "actual", revenue_inr_l: 180 },
    });
    expect(parseMonthEntry({ fy: "2026", fyRevenue: "180" }, now).ok).toBe(false);
  });
  it("needs something to save", () => {
    expect(parseMonthEntry({}, now).ok).toBe(false);
  });
});
