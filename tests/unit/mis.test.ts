import { describe, expect, it } from "vitest";
import { MIS_MAX_BYTES, cleanFileName, sniffSpreadsheet } from "@/server/validators/mis";

const zip = (...names: string[]) =>
  new Uint8Array(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), ...names.map((n) => Buffer.from(`\0\0${n}\0\0`))]));

describe("sniffSpreadsheet", () => {
  it("recognises .xlsx and .xls by their bytes", () => {
    expect(sniffSpreadsheet(zip("[Content_Types].xml", "xl/workbook.xml"))?.ext).toBe("xlsx");
    expect(sniffSpreadsheet(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]))?.ext).toBe("xls");
  });
  it("refuses macro workbooks, other zips and anything else", () => {
    expect(sniffSpreadsheet(zip("xl/workbook.xml", "xl/vbaProject.bin"))).toBeNull();
    expect(sniffSpreadsheet(zip("word/document.xml"))).toBeNull();
    expect(sniffSpreadsheet(new Uint8Array(Buffer.from("name,amount\nA,1")))).toBeNull();
    expect(sniffSpreadsheet(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(sniffSpreadsheet(new Uint8Array())).toBeNull();
  });
  it("caps files at 3 MB", () => {
    expect(MIS_MAX_BYTES).toBe(3 * 1024 * 1024);
  });
});

describe("cleanFileName", () => {
  it("keeps a readable name with the real extension", () => {
    expect(cleanFileName("MIS Oct 2026.xlsx", "xlsx")).toBe("MIS Oct 2026.xlsx");
    expect(cleanFileName("report.xls", "xlsx")).toBe("report.xlsx");
  });
  it("drops folders, quotes and control characters", () => {
    expect(cleanFileName("../../etc/MIS\".xlsx", "xlsx")).toBe("MIS.xlsx");
    expect(cleanFileName("C:\\Users\\a\\mis\u0007.xls", "xls")).toBe("mis.xls");
    expect(cleanFileName("", "xls")).toBe("MIS.xls");
    expect(cleanFileName(`${"a".repeat(300)}.xlsx`, "xlsx")).toHaveLength(105);
  });
});
