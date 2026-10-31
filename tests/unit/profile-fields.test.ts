import { describe, expect, it } from "vitest";
import {
  FIELD_BY_KEY,
  PAST_YEARS,
  PROFILE_FIELDS,
  PROJECTED_YEARS,
  SECTIONS,
  displayValue,
  isFilled,
  profileProgress,
  recordValue,
} from "@/shared/lib/profile-fields";
import type { Startup } from "@/shared/types/db";

describe("profile fields", () => {
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
  it("asks for three past years and three projected years", () => {
    expect(PAST_YEARS).toHaveLength(3);
    expect(PROJECTED_YEARS).toHaveLength(3);
    for (const y of [...PAST_YEARS, ...PROJECTED_YEARS]) {
      expect(FIELD_BY_KEY[y.key], y.key).toBeDefined();
      expect(y.label).toMatch(/^FY \d{4}-\d{2}$/);
    }
  });
  it("runs the years in order, with no gap between past and projected", () => {
    const start = (l: string) => Number(l.slice(3, 7));
    const all = [...PAST_YEARS, ...PROJECTED_YEARS].map((y) => start(y.label));
    all.forEach((y, i) => {
      if (i) expect(y).toBe(all[i - 1] + 1);
    });
  });
  it("keeps actual and projected answers under separate keys", () => {
    const keys = [...PAST_YEARS, ...PROJECTED_YEARS].map((y) => y.key);
    expect(new Set(keys).size).toBe(6);
  });
  it("has a heading above each financial group", () => {
    const headings = PROFILE_FIELDS.filter((f) => f.section === "financials" && f.heading).map((f) => f.heading);
    expect(headings).toEqual(["Current annual revenue", "Previous years' records", "Projections"]);
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
    expect(p.done).toBeGreaterThanOrEqual(3);
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
