import { describe, expect, it } from "vitest";
import { sniffImage, LOGO_MAX_BYTES } from "@/lib/branding";
import { formatCr, formatDate, formatDateTime, formatLakh, initials } from "@/lib/utils";
import { founderEmailForStartup, loginIdToStartupId } from "@/lib/provisioning";

describe("sniffImage", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);
  it("recognises PNG, JPEG and WebP by their bytes", () => {
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.ext).toBe("png");
    expect(sniffImage(bytes(0xff, 0xd8, 0xff))?.ext).toBe("jpg");
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffImage(webp)?.ext).toBe("webp");
  });
  it("rejects anything else, whatever the file is called", () => {
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<html></html>"))).toBeNull();
    expect(sniffImage(new Uint8Array(0))).toBeNull();
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull();
  });
  it("caps logos at 2 MB", () => {
    expect(LOGO_MAX_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("number and date formats", () => {
  it("formats lakhs, switching to crore at 100 L", () => {
    expect(formatLakh(50)).toBe("₹50.00 L");
    expect(formatLakh(250)).toBe("₹2.50 Cr");
    expect(formatLakh(0)).toBe("₹0.00 L");
    expect(formatLakh(null)).toBe("—");
    expect(formatLakh(NaN)).toBe("—");
  });
  it("formats crores", () => {
    expect(formatCr(25)).toBe("₹25.00 Cr");
    expect(formatCr(null)).toBe("—");
  });
  it("keeps large crore amounts correct", () => {
    // 100 Cr must never display as 1,000 Cr.
    expect(formatCr(100)).toBe("₹100.00 Cr");
    expect(formatCr(1500)).toBe("₹1500.00 Cr");
  });
  it("shows a dash for missing dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDate("2026-09-04")).toContain("2026");
  });
  it("builds initials", () => {
    expect(initials("Bon Cuisine")).toBe("BC");
    expect(initials(null)).toBeTruthy();
  });
});

describe("founder login ids", () => {
  it("maps ids and S-prefixed ids to a startup", () => {
    expect(loginIdToStartupId("42")).toBe(42);
    expect(loginIdToStartupId(" s42 ")).toBe(42);
  });
  it("rejects anything that is not a positive whole number", () => {
    for (const bad of ["0", "-1", "1.5", "abc", "", "42; drop table"]) expect(loginIdToStartupId(bad), bad).toBeNull();
  });
  it("uses the private founder domain", () => {
    expect(founderEmailForStartup(42)).toBe("s42@founders.sidana.local");
  });
});
