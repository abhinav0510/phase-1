import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { mapSector, readXlsxRows, rowToAnswers } from "../../scripts/lib/profile-prefill.mjs";
import { FIELD_BY_KEY, prefillValue } from "@/shared/lib/profile-fields";

/** A minimal .xlsx: a zip holding one deflated worksheet. */
function xlsx(sheetXml: string): Buffer {
  const name = Buffer.from("xl/worksheets/sheet1.xml");
  const data = deflateRawSync(Buffer.from(sheetXml));
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(data.length, 18); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(data.length, 20); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 42);
  const body = Buffer.concat([local, name, data]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10); end.writeUInt32LE(46 + name.length, 12); end.writeUInt32LE(body.length, 16);
  return Buffer.concat([body, central, name, end]);
}
const cell = (ref: string, text: string) => `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;

describe("readXlsxRows", () => {
  it("reads inline text cells, keeping gaps as empty strings", () => {
    const sheet = `<worksheet><sheetData><row r="1">${cell("A1", "Company Name")}${cell("C1", "Sector")}</row><row r="2">${cell("A2", "Bon Cuisine")}${cell("C2", "B2B FoodTech &amp; more")}</row></sheetData></worksheet>`;
    expect(readXlsxRows(xlsx(sheet))).toEqual([["Company Name", "", "Sector"], ["Bon Cuisine", "", "B2B FoodTech & more"]]);
  });
  it("refuses a file that isn't a spreadsheet", () => {
    expect(() => readXlsxRows(Buffer.from("name,amount"))).toThrow(/xlsx/);
  });
});

describe("mapSector", () => {
  it.each([
    ["HRTech | AI Hiring OS", "HRTech"],
    ["B2B FoodTech | Corporate Cafeteria Management", "FoodTech"],
    ["FMCG | Healthy Snacking", "Consumer / D2C"],
    ["InsurTech | Post-Purchase Insurance Intelligence", "Fintech"],
    ["Logistics | Hyperlocal 3PL", "Logistics / Supply chain"],
    ["PropTech | Coworking", "PropTech / Real estate"],
  ])("%s becomes %s", (text, option) => {
    expect(mapSector(text)).toBe(option);
  });
  it("leaves a sector empty when none of the form's choices fit", () => {
    expect(mapSector("MarTech | SMB Growth Infrastructure")).toBeNull();
    expect(mapSector("AI_FOUNDATIONAL")).toBeNull();
    expect(mapSector("")).toBeNull();
  });
});

describe("rowToAnswers", () => {
  const header = ["Company Name", "One-line Pitch", "Sector", "Sub-sector / Niche", "Markets You Sell In", "Woman Co-founder?", "Full-time Team Size", "Website"];
  it("keeps only the cells that have data", () => {
    const r = rowToAnswers(header, ["LUSTR", " Lab-grown diamonds ", "Luxury Jewellery | Lab-Grown Diamonds", "", "", "", "", ""]);
    expect(r).toEqual({ name: "LUSTR", answers: { one_liner: "Lab-grown diamonds", sector: "Consumer / D2C" } });
  });
  it("never fills one column from another", () => {
    const r = rowToAnswers(header, ["X", "", "MarTech | SMB Growth Infrastructure", "", "", "", "", ""]);
    expect(r.answers).toEqual({});
  });
  it("reads lists, yes/no and numbers", () => {
    const r = rowToAnswers(header, ["X", "", "", "", "India, Global", "yes", "18", ""]);
    expect(r.answers).toEqual({ markets: ["India", "Global"], women_led: "Yes", team_size: "18" });
  });
});

describe("prefillValue", () => {
  it("accepts values the form would accept", () => {
    expect(prefillValue(FIELD_BY_KEY.sector, "Fintech")).toBe("Fintech");
    expect(prefillValue(FIELD_BY_KEY.website, "https://lustrdiamonds.com/")).toBe("https://lustrdiamonds.com/");
    expect(prefillValue(FIELD_BY_KEY.markets, ["India", "Mars"])).toEqual(["India"]);
  });
  it("drops values the form wouldn't accept, so they can't block saving", () => {
    expect(prefillValue(FIELD_BY_KEY.sector, "HRTech | AI Hiring OS")).toBeNull();
    expect(prefillValue(FIELD_BY_KEY.website, "lustrdiamonds")).toBeNull();
    expect(prefillValue(FIELD_BY_KEY.team_size, "about ten")).toBeNull();
    expect(prefillValue(FIELD_BY_KEY.one_liner, "x".repeat(201))).toBeNull();
    expect(prefillValue(FIELD_BY_KEY.one_liner, "  ")).toBeNull();
  });
});
