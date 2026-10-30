import { describe, expect, it } from "vitest";
import { chequeLabel, listOf, prettyLabel, profileView } from "@/components/founder/investor-format";

describe("prettyLabel", () => {
  it("tidies shouty labels and keeps acronyms", () => {
    expect(prettyLabel("D2C BEAUTY PERSONAL CARE")).toBe("D2C Beauty Personal Care");
    expect(prettyLabel("AI")).toBe("AI");
    expect(prettyLabel("SAAS")).toBe("SaaS");
    expect(prettyLabel("FOOD AND BEVERAGE")).toBe("Food and Beverage");
  });
  it("replaces underscores and leaves mixed case alone", () => {
    expect(prettyLabel("pre_series_a")).toBe("pre series a");
    expect(prettyLabel("FoodTech")).toBe("FoodTech");
    expect(prettyLabel("   ")).toBe("");
  });
});

describe("listOf", () => {
  it("accepts arrays and delimited strings, removing duplicates and blanks", () => {
    expect(listOf(["SAAS", "SAAS", "FoodTech"])).toEqual(["SaaS", "FoodTech"]);
    expect(listOf("AI, FoodTech; ; AI|D2C")).toEqual(["AI", "FoodTech", "D2C"]);
    expect(listOf(null)).toEqual([]);
    expect(listOf(5)).toEqual([]);
  });
});

describe("chequeLabel", () => {
  it("formats a range, a single value and open ends", () => {
    expect(chequeLabel({ cheque_min_cr: 2, cheque_max_cr: 10, cheque_as_written: null })).toBe("₹2–10 Cr");
    expect(chequeLabel({ cheque_min_cr: 5, cheque_max_cr: 5, cheque_as_written: null })).toBe("₹5 Cr");
    expect(chequeLabel({ cheque_min_cr: 2, cheque_max_cr: null, cheque_as_written: null })).toBe("₹2 Cr+");
    expect(chequeLabel({ cheque_min_cr: null, cheque_max_cr: 8, cheque_as_written: null })).toBe("Up to ₹8 Cr");
    expect(chequeLabel({ cheque_min_cr: 1.5, cheque_max_cr: 2.25, cheque_as_written: null })).toBe("₹1.5–2.25 Cr");
  });
  it("falls back to the written text, then a dash", () => {
    expect(chequeLabel({ cheque_min_cr: null, cheque_max_cr: null, cheque_as_written: " INR 3 Cr " })).toBe("INR 3 Cr");
    expect(chequeLabel(null)).toBe("—");
  });
});

describe("profileView", () => {
  it("never exposes contact details", () => {
    const view = profileView(
      {
        id: 1, name: "X", type: "vc", sectors: ["SAAS"], stage_pref: ["SEED"], cheque_min_cr: 1, cheque_max_cr: 2, cheque_as_written: null, geography: "India",
        email: "secret@x.test", contact_person: "Secret", linkedin_url: "https://linkedin.com/in/secret",
      } as never,
      "Venture capital",
    );
    expect(JSON.stringify(view)).not.toMatch(/secret/i);
    expect(view.sectors).toEqual(["SaaS"]);
    expect(view.cheque).toBe("₹1–2 Cr");
  });
  it("handles a missing investor", () => {
    const v = profileView(null, null);
    expect(v.cheque).toBe("—");
    expect(v.sectors).toEqual([]);
  });
});
