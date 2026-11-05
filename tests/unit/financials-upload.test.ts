import { describe, expect, it } from "vitest";
import { writeXlsx } from "../../scripts/lib/xlsx-writer.mjs";
import { parseFinancialsWorkbook, parseFy, parseMonth } from "@/server/validators/financials-upload";
import { latestMrr, monthlySeries, sheetAnswers, yearRows, yearSeries } from "@/app/(founder)/financials/_components/financials-model";

const NOW = new Date("2026-11-05T06:00:00Z"); // FY 2026-27, November 2026
const book = (tabs: Record<string, (string | number | null)[][]>) =>
  new Uint8Array(writeXlsx(Object.entries(tabs).map(([name, rows]) => ({ name, rows }))));
const MONTH_HEAD = ["Month (YYYY-MM)", "Revenue (₹ lakh)", "MRR (₹ lakh)", "Expenses (₹ lakh)"];

describe("parseMonth and parseFy", () => {
  it.each([["2026-04", "2026-04"], ["Apr 2026", "2026-04"], ["April 2026", "2026-04"], ["04/2026", "2026-04"], ["2026-4-01", "2026-04"], ["46113", "2026-04"]])(
    "reads the month %s",
    (raw, month) => expect(parseMonth(raw)).toBe(month),
  );
  it("rejects what isn't a month", () => {
    for (const raw of ["2026-13", "Q1 2026", "soon", ""]) expect(parseMonth(raw)).toBeNull();
  });
  it.each([["FY 2025-26", 2025], ["2025-26", 2025], ["FY25-26", 2025], ["2025-2026", 2025]])("reads the year %s", (raw, start) => {
    expect(parseFy(raw)).toBe(start);
  });
  it("rejects years that don't follow on", () => {
    expect(parseFy("FY 2025-27")).toBeNull();
    expect(parseFy("2025")).toBeNull();
  });
});

describe("parseFinancialsWorkbook", () => {
  it("reads a filled-in template", () => {
    const r = parseFinancialsWorkbook(
      book({
        Monthly: [MONTH_HEAD, ["2026-08", 300, 280, 250], ["2026-09", "320", "", "260"], ["", "", "", ""]],
        Yearly: [["Financial year", "Revenue (₹ lakh)"], ["FY 2025-26", 4000]],
        Projections: [["Financial year", "Projected revenue (₹ lakh)"], ["FY 2026-27", 8000], ["FY 2027-28", "15,000"]],
      }),
      NOW,
    );
    expect(r).toEqual({
      ok: true,
      months: [
        { month: "2026-08", revenue_inr_l: 300, mrr_inr_l: 280, expenses_inr_l: 250 },
        { month: "2026-09", revenue_inr_l: 320, mrr_inr_l: null, expenses_inr_l: 260 },
      ],
      years: [
        { fy_start: 2025, kind: "actual", revenue_inr_l: 4000 },
        { fy_start: 2026, kind: "projected", revenue_inr_l: 8000 },
        { fy_start: 2027, kind: "projected", revenue_inr_l: 15000 },
      ],
    });
  });
  it("explains every problem, row by row, and saves nothing", () => {
    const r = parseFinancialsWorkbook(
      book({
        Monthly: [MONTH_HEAD, ["Q3", 1, 1, 1], ["2026-08", -5, "", ""], ["2026-08", 1, "", ""], ["2026-12", 1, "", ""], ["2026-07", "", "", ""]],
        Yearly: [["Financial year", "Revenue (₹ lakh)"], ["FY 2026-27", 10]],
        Projections: [["Financial year", "Projected revenue (₹ lakh)"], ["FY 2024-25", 10]],
      }),
      NOW,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual([
      "Monthly tab, row 2: write the month like 2026-04.",
      "Monthly tab, row 3: Revenue must be a number in ₹ lakh, like 12.5.",
      "Monthly tab, row 4: 2026-08 appears twice.",
      "Monthly tab, row 5: 2026-12 is in the future. Put expected revenue in the Projections tab.",
      "Monthly tab, row 6: add at least one amount for 2026-07.",
      "Yearly tab, row 2: FY 2026-27 isn't over yet. Put it in the Projections tab.",
      "Projections tab, row 2: FY 2024-25 is already over. Put it in the Yearly tab.",
    ]);
  });
  it("catches a month given twice and a renamed heading", () => {
    const twice = parseFinancialsWorkbook(book({ Monthly: [MONTH_HEAD, ["2026-08", 1, "", ""], ["Aug 2026", 2, "", ""]] }), NOW);
    expect(twice).toEqual({ ok: false, errors: ["Monthly tab, row 3: 2026-08 appears twice."] });
    const renamed = parseFinancialsWorkbook(book({ Monthly: [["When", "Revenue", "MRR", "Expenses"], ["2026-08", 1, "", ""]] }), NOW);
    expect(renamed.ok ? [] : renamed.errors[0]).toMatch(/missing the Month heading/);
  });
  it("needs the template's tabs and some figures", () => {
    expect(parseFinancialsWorkbook(book({ Sheet1: [["a"]] }), NOW)).toEqual({ ok: false, errors: [expect.stringMatching(/no "Monthly"/)] });
    expect(parseFinancialsWorkbook(book({ Monthly: [MONTH_HEAD] }), NOW)).toEqual({ ok: false, errors: [expect.stringMatching(/no figures/)] });
    expect(parseFinancialsWorkbook(new Uint8Array(Buffer.from("not a workbook")), NOW).ok).toBe(false);
  });
});

describe("what Financials shows", () => {
  const months = [
    { month: "2026-07", revenue_inr_l: 400, mrr_inr_l: 400, expenses_inr_l: 300 },
    { month: "2026-08", revenue_inr_l: 450, mrr_inr_l: 440, expenses_inr_l: 310 },
    { month: "2026-09", revenue_inr_l: 530, mrr_inr_l: 532, expenses_inr_l: 330 },
  ];
  it("takes the newest MRR and its change on the month before", () => {
    expect(latestMrr(months)).toEqual({ value: 532, month: "2026-09", growthPct: 21, previousMonth: "2026-08" });
    expect(latestMrr([months[0]])).toEqual({ value: 400, month: "2026-07", growthPct: null, previousMonth: null });
    expect(latestMrr([])).toBeNull();
  });
  it("charts the last months with figures", () => {
    expect(monthlySeries(months, 2)).toEqual([
      { label: "Aug 2026", revenue: 450, expenses: 310 },
      { label: "Sep 2026", revenue: 530, expenses: 330 },
    ]);
  });
  it("puts uploaded years first and adds the profile's last year only if missing", () => {
    const rows = yearRows(
      [{ fy_start: 2025, kind: "actual", revenue_inr_l: 4000 }, { fy_start: 2026, kind: "projected", revenue_inr_l: 8000 }],
      { fy_start: 2025, revenue: 1 },
    );
    expect(rows.map((r) => [r.label, r.kind, r.revenue, r.growthPct])).toEqual([
      ["FY 2025-26", "actual", 4000, null],
      ["FY 2026-27", "projected", 8000, 100],
    ]);
    expect(yearRows([], { fy_start: 2025, revenue: 180 })).toHaveLength(1);
  });
  it("starts the dashed projection line at the last actual year", () => {
    const rows = yearRows(
      [{ fy_start: 2024, kind: "actual", revenue_inr_l: 2000 }, { fy_start: 2025, kind: "actual", revenue_inr_l: 4000 }, { fy_start: 2026, kind: "projected", revenue_inr_l: 8000 }],
      null,
    );
    expect(yearSeries(rows)).toEqual([
      { label: "FY 24-25", actual: 2000, projected: null },
      { label: "FY 25-26", actual: 4000, projected: 4000 },
      { label: "FY 26-27", actual: null, projected: 8000 },
    ]);
  });
});

describe("sheetAnswers: profile answers from the uploaded figures", () => {
  const LAST = { key: "past_revenue_y1", label: "FY 2025-26" };
  const m = (month: string, revenue: number | null, mrr: number | null) => ({ month, revenue_inr_l: revenue, mrr_inr_l: mrr, expenses_inr_l: null });

  it("ARR is the newest month's MRR × 12, measured as ARR", () => {
    const out = sheetAnswers([m("2026-08", 300, 280), m("2026-10", 380, 30.5), m("2026-09", 320, 300)], [], LAST);
    expect(out.revenue_inr_l).toEqual({ value: "366", from: "Oct 2026 MRR of ₹30.5 L × 12" });
    expect(out.revenue_basis.value).toBe("Annual recurring revenue (ARR)");
  });
  it("falls back to that month's revenue × 12 when MRR is blank", () => {
    const out = sheetAnswers([m("2026-10", 40, null)], [], LAST);
    expect(out.revenue_inr_l.value).toBe("480");
    expect(out.revenue_basis.value).toBe("Monthly revenue × 12");
  });
  it("takes last year's revenue only from an actual row for that year", () => {
    const years = [
      { fy_start: 2025, kind: "projected" as const, revenue_inr_l: 999 },
      { fy_start: 2024, kind: "actual" as const, revenue_inr_l: 100 },
    ];
    expect(sheetAnswers([], years, LAST)[LAST.key]).toBeUndefined();
    const withActual = sheetAnswers([], [...years, { fy_start: 2025, kind: "actual", revenue_inr_l: 1234.567 }], LAST);
    expect(withActual[LAST.key]).toEqual({ value: "1234.57", from: "FY 2025-26 on your Yearly tab" });
  });
  it("gives nothing when nothing was uploaded", () => {
    expect(sheetAnswers([], [], LAST)).toEqual({});
  });
});
