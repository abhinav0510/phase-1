import { describe, expect, it } from "vitest";
import { founderCodes, parseRaise, raiseCr, resolveStartup, uploadsArrL } from "@/shared/lib/startup-facts";
import { founderWriteback } from "@/server/data/founder-writeback";

const record = {
  revenue_inr_l: 120,
  ask_as_written: "INR 1 Cr",
  ask_amount: 1,
  ask_currency: "INR",
  ask_current_cr: 1,
  sector: "TravelTech | AI Travel Discovery",
  subsector: null,
  stage: "Pre-monetisation / MVP Live",
};
const months = [
  { month: "2026-09", revenue_inr_l: 10, mrr_inr_l: 9 },
  { month: "2026-10", revenue_inr_l: 12, mrr_inr_l: null },
];

describe("founder data is final (26 Nov)", () => {
  it("reads raises the way founders type them", () => {
    expect(parseRaise("INR 5 Cr")).toEqual({ currency: "INR", amount: 5 });
    expect(parseRaise("₹80 L")).toEqual({ currency: "INR", amount: 0.8 });
    expect(parseRaise("1.5 crore")).toEqual({ currency: "INR", amount: 1.5 });
    expect(parseRaise("US$1.5M")).toEqual({ currency: "USD", amount: 1.5 });
    expect(parseRaise("$500K")).toEqual({ currency: "USD", amount: 0.5 });
    expect(parseRaise("open")).toBeNull();
    expect(raiseCr({ currency: "USD", amount: 1.5 })).toBe(15);
  });

  it("works out ARR from uploads like the founder's Financials page", () => {
    expect(uploadsArrL(months)).toEqual({ value: 144, from: "Oct 2026 revenue of ₹12 L × 12" });
    expect(uploadsArrL([])).toBeNull();
  });

  it("uses uploads, then the founder's answer, then Sidana's record, for revenue", () => {
    expect(resolveStartup(record, { answers: { revenue_inr_l: "300" }, months }).revenue_inr_l).toBe(144);
    const typed = resolveStartup(record, { answers: { revenue_inr_l: "300" }, months: [] });
    expect(typed.revenue_inr_l).toBe(300);
    expect(typed.facts.arr.source).toBe("founder");
    const none = resolveStartup(record, null);
    expect(none.revenue_inr_l).toBe(120);
    expect(none.facts.arr.source).toBe("sidana");
  });

  it("takes the founder's raise, sector and stage over the record, and keeps the record when they're empty", () => {
    const r = resolveStartup(record, { answers: { raise_amount: "INR 1.5 Cr", sector: "AI / Applied AI", stage_code: "Seed" }, months: [] });
    expect(r).toMatchObject({ ask_as_written: "INR 1.5 Cr", ask_current_cr: 1.5, sector: "AI / Applied AI", stage: "Seed" });
    expect(r.facts).toMatchObject({ raise: "founder", sector: "founder", stage: "founder", stageCode: "SEED" });
    expect(resolveStartup(record, { answers: {}, months: [] })).toMatchObject({ ask_as_written: "INR 1 Cr", stage: "Pre-monetisation / MVP Live" });
  });

  it("matches on the founder's sector picks, else the agents' codes", () => {
    expect(founderCodes({ sector_code: "Payments", sector_code_2: "SME lending" }).sectorCodes).toEqual(["FINTECH_PAYMENTS", "FINTECH_SME_LENDING"]);
    const agents = { sectorCodes: ["TRAVEL_HOSPITALITY"], stageCode: "SEED" };
    expect(resolveStartup(record, null, agents).facts.sectorCodes).toEqual(["TRAVEL_HOSPITALITY"]);
    expect(resolveStartup(record, { answers: { sector_code: "Consumer apps" }, months: [] }, agents).facts.sectorCodes).toEqual(["CONSUMER_TECH_APP"]);
  });

  it("writes back only what the founder gave", () => {
    const r = resolveStartup(record, { answers: { raise_amount: "INR 1.5 Cr", stage_code: "Seed", sector_code: "Consumer apps" }, months }, undefined);
    expect(founderWriteback(r, true)).toEqual({
      startups: { stage: "Seed", raise_inr_cr: "INR 1.5 Cr", revenue: expect.stringContaining("uploaded figures") },
      profile: { stage_code: "SEED", sector_codes: ["CONSUMER_TECH_APP"], raise_cr: 1.5, arr_cr: 1.44 },
    });
    expect(founderWriteback(resolveStartup(record, null), false)).toEqual({ startups: {}, profile: {} });
  });
});
