import { readXlsxSheets } from "../../src/server/validators/xlsx-reader.mjs";
import { writeXlsx } from "../../scripts/lib/xlsx-writer.mjs";
import { asFounder, asTeam, expect, ID, pickFile, state, test } from "./helpers";

// Months and years relative to today, so the files stay valid as time passes.
const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
const monthsAgo = (n: number) => {
  const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const FY = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
const fy = (start: number) => `FY ${start}-${String(start + 1).slice(2)}`;
const MONTH_HEAD = ["Month (YYYY-MM)", "Revenue (₹ lakh)", "MRR (₹ lakh)", "Expenses (₹ lakh)"];

const file = (name: string, tabs: Record<string, (string | number | null)[][]>) => ({
  name,
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  buffer: writeXlsx(Object.entries(tabs).map(([tab, rows]) => ({ name: tab, rows }))),
});
const months = async () => (await state("startup_financial_months")).filter((m) => m.startup_id === ID.zeta);
const years = async () => (await state("startup_financial_years")).filter((y) => y.startup_id === ID.zeta);

test.describe("financials template", () => {
  test("signed-in founders can download the template, with its four tabs", async ({ page, request }) => {
    // Like every non-public path, it needs a signed-in user.
    expect((await request.get("/templates/sidana-financials-template.xlsx", { maxRedirects: 0 })).status()).toBeGreaterThanOrEqual(300);
    await asFounder(page, ID.zeta);
    const res = await page.request.get("/templates/sidana-financials-template.xlsx");
    expect(res.status()).toBe(200);
    const tabs = readXlsxSheets(Buffer.from(await res.body()));
    expect([...tabs.keys()]).toEqual(["How to fill", "Monthly", "Yearly", "Projections"]);
    expect(tabs.get("Monthly")![0]).toEqual(MONTH_HEAD);
  });

  test("a filled-in template draws the charts and the year table", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/financials");
    await expect(page.getByRole("link", { name: /Download template/ })).toHaveAttribute("href", "/templates/sidana-financials-template.xlsx");
    await pickFile(page, "#financials-file", 
      file("Zeta financials.xlsx", {
        Monthly: [MONTH_HEAD, [monthsAgo(3), 300, 280, 250], [monthsAgo(2), 320, 300, 255], [monthsAgo(1), 380, 363, 260]],
        Yearly: [["Financial year", "Revenue (₹ lakh)"], [fy(FY - 2), 1000], [fy(FY - 1), 2500]],
        Projections: [["Financial year", "Projected revenue (₹ lakh)"], [fy(FY), 4000]],
      }),
    );
    await expect(page.locator("#financials-upload")).toContainText("Saved 3 months and 3 years of figures");
    expect(await months()).toHaveLength(3);
    expect(await years()).toHaveLength(3);

    const mrr = page.locator("div", { hasText: /^Monthly revenue \(MRR\)/ }).filter({ has: page.locator("[data-gain]") }).first();
    await expect(page.getByText("₹3.63 Cr").first()).toBeVisible();
    await expect(mrr).toContainText("+21%");
    await expect(page.getByText("Monthly revenue vs expenses")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Projected" })).toHaveCount(1);
    await expect(page.getByRole("cell", { name: "Actual" })).toHaveCount(2);
    await expect(page.getByRole("cell", { name: "+150%" })).toBeVisible();
    // ARR is on record and last year is now in the upload: both ticks are green, so the reminder goes.
    await expect(page.getByRole("heading", { name: "Report your revenue annually, as ARR" })).toHaveCount(0);
    // The file is kept for the team beside the founder's MIS uploads.
    expect((await state("startup_mis_files")).some((f) => f.startup_id === ID.zeta && f.file_name === "Zeta financials.xlsx")).toBe(true);
  });

  test("a file with mistakes is explained and saves nothing", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/financials");
    const before = JSON.stringify([await months(), await years()]);
    await pickFile(page, "#financials-file", 
      file("bad.xlsx", { Monthly: [MONTH_HEAD, ["next quarter", 10, "", ""], [monthsAgo(1), "lots", "", ""]] }),
    );
    const box = page.locator("#financials-upload");
    await expect(box).toContainText("Nothing was saved");
    await expect(box).toContainText("row 2: write the month like 2026-04");
    await expect(box).toContainText("row 3: Revenue must be a number");
    expect(JSON.stringify([await months(), await years()])).toBe(before);
  });

  test("uploading again replaces the earlier figures, and a fall shows no arrow", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/financials");
    await pickFile(page, "#financials-file", 
      file("Zeta financials v2.xlsx", { Monthly: [MONTH_HEAD, [monthsAgo(2), 300, 300, 200], [monthsAgo(1), 280, 270, 210]] }),
    );
    await expect(page.locator("#financials-upload")).toContainText("Saved 2 months of figures");
    expect((await months()).map((m) => m.month).sort()).toEqual([monthsAgo(2), monthsAgo(1)]);
    expect(await years()).toHaveLength(0);
    await expect(page.getByText("₹2.70 Cr").first()).toBeVisible();
    await expect(page.locator("main [data-gain]")).toHaveCount(0);
  });

  test("the team sees the founder's figures", async ({ page }) => {
    await asTeam(page);
    await page.goto(`/admin/startups/${ID.zeta}`);
    await expect(page.getByText("Figures from the founder's template")).toBeVisible();
    await expect(page.getByRole("cell", { name: "₹2.70 Cr" })).toBeVisible();
  });

  test("another founder never sees them", async ({ page }) => {
    await asFounder(page, ID.eta);
    await page.goto("/financials");
    await expect(page.getByText("₹2.70 Cr")).toHaveCount(0);
    await expect(page.getByText("Monthly revenue vs expenses")).toHaveCount(0);
  });
});
