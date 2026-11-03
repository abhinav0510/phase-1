import { describe, expect, it } from "vitest";
import { allocationDisplay, askDisplay, formatRupees, fundingDisplay, hasDollars, INR_PER_USD, toRupees } from "@/shared/lib/currency";

describe("the rate", () => {
  it("is 1 dollar to 100 rupees", () => {
    expect(INR_PER_USD).toBe(100);
    expect(toRupees("$1")).toBe("₹100");
    expect(toRupees("$1,000")).toBe("₹1 L");
  });
});

describe("formatRupees", () => {
  it("uses the unit that reads best", () => {
    expect(formatRupees(500)).toBe("₹500");
    expect(formatRupees(50_000)).toBe("₹50,000");
    expect(formatRupees(500_000)).toBe("₹5 L");
    expect(formatRupees(10_000_000)).toBe("₹1 Cr");
    expect(formatRupees(42_500_000)).toBe("₹4.25 Cr");
  });
});

// Every value here is a form found in the Pilot sheet.
describe("toRupees", () => {
  it.each([
    ["US$425K", "₹4.25 Cr"],
    ["US$8M", "₹80 Cr"],
    ["US$500K", "₹5 Cr"],
    ["US$1-2M", "₹10–20 Cr"],
    ["US$20-50K", "₹20–50 L"],
    ["US$250K-3M", "₹2.5–30 Cr"],
    ["US$100K-1M", "₹1–10 Cr"],
    ["US$0.85-1.2M", "₹8.5–12 Cr"],
    ["$1M to $50M", "₹10–500 Cr"],
    ["$10M–$50M", "₹100–500 Cr"],
    ["$3 - $5M", "₹30–50 Cr"],
    ["$500K to $2M", "₹5–20 Cr"],
    ["$50k-$100k", "₹50 L–₹1 Cr"],
    ["USD 100K-500K", "₹1–5 Cr"],
    ["US$8 to 10 million", "₹80–100 Cr"],
    ["US$1.5M", "₹15 Cr"],
    ["US$5M seed", "₹50 Cr seed"],
    ["500K USD", "₹5 Cr"],
    ["ARR US$250K", "ARR ₹2.5 Cr"],
    ["ARR US$508,000 (founder, 25 Sep 2026)", "ARR ₹5.08 Cr (founder, 25 Sep 2026)"],
    ["$350K ARR", "₹3.5 Cr ARR"],
    ["$1M–15M+", "₹10–150 Cr+"],
    ["US$100M+", "₹1,000 Cr+"],
  ])("%s becomes %s", (input, output) => {
    expect(toRupees(input)).toBe(output);
  });

  it("converts every amount in a sentence", () => {
    expect(toRupees("US$ 500k-1 m seed. $250 K to $2 M and early revenue")).toBe("₹5–10 Cr seed. ₹2.5–20 Cr and early revenue");
    expect(toRupees("FY25 ARR US$256K; projected FY26-27 ARR US$1.6M")).toBe("FY25 ARR ₹2.56 Cr; projected FY26-27 ARR ₹16 Cr");
    expect(toRupees("V1 US$1-3M; V2 US$4-10M")).toBe("V1 ₹10–30 Cr; V2 ₹40–100 Cr");
    expect(toRupees("Combined MRR $84.1K ($20.9K SaaS + $63.2K managed)")).toBe("Combined MRR ₹84.1 L (₹20.9 L SaaS + ₹63.2 L managed)");
  });

  it("drops a rupee figure given as the equivalent of a dollar one", () => {
    expect(toRupees("US$1-2M (INR 8.5-17 Cr)")).toBe("₹10–20 Cr");
    expect(toRupees("$1-2M (8-20Cr)")).toBe("₹10–20 Cr");
    expect(toRupees("US$0.5-1M (about INR 4.25-8.5 Cr)")).toBe("₹5–10 Cr");
    expect(toRupees("Up to USD 1.5M (~INR 12.5 Cr)")).toBe("Up to ₹15 Cr");
    expect(toRupees("US$3-5M typical (~INR 25-43 Cr) at Pre-Series A")).toBe("₹30–50 Cr typical at Pre-Series A");
    expect(toRupees("US$150K / INR 1 Cr")).toBe("₹1.5 Cr");
    expect(toRupees("US$300-750K first cheque (INR 2.6-6.6 Cr), reserves to US$2M")).toBe("₹3–7.5 Cr first cheque, reserves to ₹20 Cr");
  });

  it("uses the dollar figure at 100 even when the market-rate rupee figure is named first", () => {
    expect(toRupees("Up to INR 15 Cr (US$2M)")).toBe("Up to ₹20 Cr");
    expect(toRupees("INR 4.25-85 Cr (US$500K to 10M)")).toBe("₹5–100 Cr");
    expect(toRupees("INR 2.5 Cr / US$300K")).toBe("₹3 Cr");
    expect(toRupees("ARR INR 82 Cr (US$8.92M) per approved memo")).toBe("ARR ₹89.2 Cr per approved memo");
    expect(toRupees("INR 0.65-1.1 Cr (USD 75-125K, per Dr. Rohit 22 Sep)")).toBe("₹75 L–₹1.25 Cr (per Dr. Rohit 22 Sep)");
  });

  it("converts a dollar figure that means something else, such as a fund's size", () => {
    expect(toRupees("INR 10 Cr (US$50M fund)")).toBe("INR 10 Cr (₹500 Cr fund)");
  });

  it("leaves text with no dollars alone", () => {
    for (const text of ["INR 5 Cr", "Undisclosed", "2M - 10M", "EUR 2-5M", "INR 15-25 Cr sweet spot", "50"]) {
      expect(toRupees(text)).toBe(text);
    }
    expect(toRupees(null)).toBeNull();
    expect(toRupees(undefined)).toBeUndefined();
    expect(toRupees("")).toBe("");
  });

  it("leaves no dollar sign behind in any form from the sheet", () => {
    for (const text of ["50Lakhs - $250k - $500k.", "$100K - $500K - $1M", "Accelerator US$135K for 6-8%", "funds of US$0.6-3Bn; single assets US$100M+", "$2.3B+ by 2028", "US$13T global"]) {
      expect(toRupees(text)).not.toMatch(/\$|USD/);
    }
  });
});

describe("hasDollars", () => {
  it("spots a dollar amount", () => {
    expect(hasDollars("US$1M")).toBe(true);
    expect(hasDollars("USD 500K")).toBe(true);
    expect(hasDollars("500K USD")).toBe(true);
    expect(hasDollars("INR 5 Cr")).toBe(false);
    expect(hasDollars(null)).toBe(false);
  });
});

describe("display helpers", () => {
  const ask = { ask_as_written: null, ask_amount: null, ask_currency: null, ask_current_cr: null };
  it("shows the ask from its text first", () => {
    expect(askDisplay({ ...ask, ask_as_written: "US$2M", ask_amount: 2, ask_currency: "USD" })).toBe("₹20 Cr");
    expect(askDisplay({ ...ask, ask_as_written: "INR 5 Cr" })).toBe("INR 5 Cr");
  });
  it("converts a dollar ask held as a number, in millions", () => {
    expect(askDisplay({ ...ask, ask_amount: 1.5, ask_currency: "USD" })).toBe("₹15 Cr");
  });
  it("leaves a rupee ask held as a number in crore", () => {
    expect(askDisplay({ ...ask, ask_amount: 5, ask_currency: "INR" })).toBe("₹5.00 Cr");
    expect(askDisplay({ ...ask, ask_current_cr: 3 })).toBe("₹3.00 Cr");
    expect(askDisplay(null)).toBe("—");
  });
  it("converts the allocation", () => {
    expect(allocationDisplay({ allocation_left_as_written: "US$500K", allocation_left_amount: null })).toBe("₹5 Cr");
    expect(allocationDisplay({ allocation_left_as_written: null, allocation_left_amount: 2 })).toBe("₹2.00 Cr");
  });
  it("converts funding rounds, and hides a dollar number of unknown scale", () => {
    expect(fundingDisplay({ as_written: "US$2M", amount: 2, currency: "USD" })).toBe("₹20 Cr");
    expect(fundingDisplay({ as_written: null, amount: 1, currency: "INR" })).toBe("₹1.00 Cr");
    expect(fundingDisplay({ as_written: null, amount: 2, currency: "USD" })).toBe("—");
  });
});
