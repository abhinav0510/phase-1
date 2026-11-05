import { describe, expect, it } from "vitest";
import {
  FIELD_BY_KEY,
  PAST_YEARS,
  PROFILE_FIELDS,
  SECTIONS,
  arrDisplay,
  displayValue,
  isFilled,
  mrrDisplay,
  profileProgress,
  recordValue,
} from "@/shared/lib/profile-fields";
import type { Startup } from "@/shared/types/db";

describe("profile fields", () => {
  it("no longer asks founders for stage or traction", () => {
    expect(PROFILE_FIELDS.map((f) => f.key)).not.toEqual(expect.arrayContaining(["stage"]));
    expect(PROFILE_FIELDS.map((f) => f.key)).not.toContain("traction_highlights");
    expect(PROFILE_FIELDS.map((f) => f.key)).not.toContain("burn_inr_l");
    expect(PROFILE_FIELDS.map((f) => f.key)).not.toContain("runway_months");
    expect(PROFILE_FIELDS.map((f) => f.key)).not.toContain("investor_types");
    expect(PROFILE_FIELDS.map((f) => f.key)).not.toContain("investors_to_skip");
    expect(SECTIONS.map((s) => s.title)).not.toContain("Investor preferences");
    expect(SECTIONS.map((s) => s.title)).not.toContain("Stage & traction");
  });
  it("has unique keys and every field in a known section", () => {
    const keys = PROFILE_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    const sections = new Set(SECTIONS.map((s) => s.key));
    for (const f of PROFILE_FIELDS) expect(sections.has(f.section)).toBe(true);
  });
  it("gives every select and multi field some options", () => {
    for (const f of PROFILE_FIELDS.filter((x) => x.type === "select" || x.type === "multi")) {
      expect(f.options?.length, f.key).toBeGreaterThan(0);
    }
  });
  it("asks for annual revenue as ARR and requires it", () => {
    const f = FIELD_BY_KEY.revenue_inr_l;
    expect(f.label).toContain("ARR");
    expect(f.help).toMatch(/not a monthly/i);
    expect(f.required).toBe(true);
    expect(f.section).toBe("financials");
  });
  it("asks for the last completed year only, with no projections", () => {
    expect(PAST_YEARS).toHaveLength(1);
    expect(FIELD_BY_KEY[PAST_YEARS[0].key]).toBeDefined();
    expect(PAST_YEARS[0].label).toMatch(/^FY \d{4}-\d{2}$/);
    const keys = PROFILE_FIELDS.map((f) => f.key);
    expect(keys.filter((k) => k.startsWith("revenue_projected_fy"))).toHaveLength(0);
    expect(keys).not.toContain("projection_basis");
    expect(keys).not.toContain("financial_model_link");
  });
  it("has a heading above each financial group", () => {
    const headings = PROFILE_FIELDS.filter((f) => f.section === "financials" && f.heading).map((f) => f.heading);
    expect(headings).toEqual(["Current annual revenue", "Previous year's record"]);
  });
});

describe("isFilled / displayValue", () => {
  it("treats 0 as answered, blanks as not", () => {
    expect(isFilled("0")).toBe(true);
    expect(isFilled(0)).toBe(true);
    expect(isFilled("")).toBe(false);
    expect(isFilled("   ")).toBe(false);
    expect(isFilled(null)).toBe(false);
    expect(isFilled(undefined)).toBe(false);
    expect(isFilled([])).toBe(false);
    expect(isFilled(["", " "])).toBe(false);
    expect(isFilled(["a"])).toBe(true);
  });
  it("joins lists and blanks out nothing", () => {
    expect(displayValue(["a", "", "b"])).toBe("a, b");
    expect(displayValue(null)).toBe("");
    expect(displayValue("x")).toBe("x");
  });
});

describe("profileProgress", () => {
  const startup = { sector: "FinTech", stage: "Seed", revenue_inr_l: 0 } as unknown as Startup;

  it("is 0% with nothing at all", () => {
    const p = profileProgress(null, null);
    expect(p.pct).toBe(0);
    expect(p.done).toBe(0);
    expect(p.total).toBe(PROFILE_FIELDS.length);
    expect(p.missing).toHaveLength(PROFILE_FIELDS.length);
  });
  it("counts values on record, including a revenue of 0", () => {
    const p = profileProgress(startup, null);
    // Sector and revenue; stage is no longer asked, so it doesn't count.
    expect(p.done).toBe(2);
    expect(recordValue(FIELD_BY_KEY.revenue_inr_l, startup)).toBe("0");
    expect(p.missing.map((f) => f.key)).not.toContain("revenue_inr_l");
  });
  it("counts founder answers", () => {
    const answers = { one_liner: "Hello", [PAST_YEARS[0].key]: "10" };
    const p = profileProgress(null, answers);
    expect(p.done).toBe(2);
    expect(p.bySection.financials.done).toBe(1);
  });
  it("lists matching fields first among what is missing", () => {
    const { missing } = profileProgress(null, null);
    const firstOther = missing.findIndex((f) => !f.matching);
    expect(missing.slice(firstOther).some((f) => f.matching)).toBe(false);
  });
  it("reaches 100% when everything is answered", () => {
    const all = Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, "x"]));
    expect(profileProgress(null, all).pct).toBe(100);
  });
  it("section totals add up", () => {
    const p = profileProgress(null, null);
    const sum = Object.values(p.bySection).reduce((n, s) => n + s.total, 0);
    expect(sum).toBe(p.total);
  });
});

// Every value here is a form found in the Pilot sheet's revenue column.
describe("mrrDisplay", () => {
  it.each([
    ["US$10K MRR / US$120K ARR", "₹10 L"],
    ["Current MRR INR 4 Cr; FY26 ARR INR 12 Cr; FY27 closing ARR projected ~INR 48 Cr", "₹4 Cr"],
    ["ARR INR 70 lakh; INR 6L MRR growing 20% MoM", "₹6 L"],
    ["ARR INR 67.8 Cr (MRR INR 5.65 Cr, Jul 2026; gross revenue)", "₹5.65 Cr"],
    ["Combined MRR $84.1K ($20.9K SaaS + $63.2K managed); 30+ enterprise clients", "₹84.1 L"],
    ["Current revenue ~INR 1 Cr per month (~INR 12 Cr annualised, Sep 2026)", "~₹1 Cr"],
    ["Revenue ~INR 2.8 lakh in the last month, ~INR 33 lakh annualised (founder, 3 Sep 2026); monthly burn cut to INR 1.5 lakh", "~₹2.8 L"],
    ["INR 3.5-4 lakh over the past 6-7 months; monthly run-rate ~INR 50K for the last 3 months", "~₹50,000"],
    ["Revenue run-rate INR 4.8 Lakh (INR 40,000 a month, ~300 paid sessions)", "₹40,000"],
  ])("%s shows %s", (note, value) => {
    expect(mrrDisplay({ revenue_note: note })).toEqual({ value, source: "note" });
  });
  it("shows a dash when no monthly figure is stated, without working one out from ARR", () => {
    for (const note of ["ARR INR 2.5 Cr", "Revenue run-rate INR 1.20 Cr", "FY26 ARR INR 66.2 lakh", "Pre-revenue with validated LOIs", "40+ bookings/day", null]) {
      expect(mrrDisplay({ revenue_note: note })).toEqual({ value: "—", source: "none" });
    }
    expect(mrrDisplay(null)).toEqual({ value: "—", source: "none" });
  });
});

describe("arrDisplay", () => {
  const blank = { revenue_inr_l: null, revenue_note: null };
  it("prefers the number on record, keeping revenue text as its note", () => {
    expect(arrDisplay({ revenue_inr_l: 250, revenue_note: "ARR note" }, { revenue_inr_l: "75" })).toEqual({ value: "₹2.50 Cr", source: "record", note: "ARR note" });
  });
  it("shows the sheet's revenue text in rupees when there's no number", () => {
    expect(arrDisplay({ ...blank, revenue_note: " ARR US$1M " }, {})).toEqual({ value: "ARR ₹10 Cr", source: "note", note: null });
    expect(arrDisplay({ ...blank, revenue_note: "Revenue run-rate INR 40 lakh" }, {}).value).toBe("Revenue run-rate INR 40 lakh");
    expect(arrDisplay({ ...blank, revenue_note: "Pre-revenue with validated LOIs" }, {}).source).toBe("note");
  });
  it("never shows a market size or usage figure as revenue", () => {
    for (const text of ["Global education consulting market US$67.9B", "70%+ repeat usage across pilot institutions", "40+ bookings/day"]) {
      expect(arrDisplay({ ...blank, revenue_note: text }, {})).toEqual({ value: "—", source: "none", note: null });
      expect(arrDisplay({ revenue_inr_l: 250, revenue_note: text }, {}).note).toBeNull();
    }
  });
  it("falls back to the founder's own answer", () => {
    expect(arrDisplay(blank, { revenue_inr_l: "75" })).toEqual({ value: "₹75.00 L", source: "founder", note: null });
    expect(arrDisplay({ ...blank, revenue_note: "40+ bookings/day" }, { revenue_inr_l: "75" }).source).toBe("founder");
  });
  it("shows a dash when there's nothing, or the answer isn't a number", () => {
    expect(arrDisplay(blank, {})).toEqual({ value: "—", source: "none", note: null });
    expect(arrDisplay(null, { revenue_inr_l: "lots" })).toEqual({ value: "—", source: "none", note: null });
  });
});
