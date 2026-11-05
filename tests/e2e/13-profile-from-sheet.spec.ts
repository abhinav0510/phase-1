import { PAST_YEARS } from "../../src/shared/lib/profile-fields";
import { asFounder, expect, ID, MOCK, test } from "./helpers";

// Uploaded figures fill the profile's Financials questions that are still empty. Rows are put
// straight into the fake database, so these checks don't depend on the upload button.
const LAST = PAST_YEARS[0];
const lastFyStart = Number(LAST.label.slice(3, 7));
const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
const monthsAgo = (n: number) => {
  const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

async function insert(table: string, rows: object[]) {
  const res = await fetch(`${MOCK}/rest/v1/${table}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: "test-service-role-key", authorization: "Bearer test-service-role-key" },
    body: JSON.stringify(rows),
  });
  expect(res.status).toBe(201);
}
async function remove(table: string, startupId: number) {
  const res = await fetch(`${MOCK}/rest/v1/${table}?startup_id=eq.${startupId}`, {
    method: "DELETE",
    headers: { apikey: "test-service-role-key", authorization: "Bearer test-service-role-key" },
  });
  expect(res.status).toBe(204);
}
/** Earlier spec files save profiles and upload figures for these founders; start each test clean. */
const fresh = (startupId: number) =>
  Promise.all(["startup_profiles", "startup_financial_months", "startup_financial_years"].map((t) => remove(t, startupId)));

const uploadedMonths = (startupId: number, mrr: number) =>
  insert("startup_financial_months", [
    { startup_id: startupId, month: monthsAgo(2), revenue_inr_l: 20, mrr_inr_l: mrr - 5, expenses_inr_l: 15 },
    { startup_id: startupId, month: monthsAgo(1), revenue_inr_l: 25, mrr_inr_l: mrr, expenses_inr_l: 16 },
  ]);
const uploadedLastYear = (startupId: number) =>
  insert("startup_financial_years", [{ startup_id: startupId, fy_start: lastFyStart, kind: "actual", revenue_inr_l: 210 }]);
const uploaded = (startupId: number, mrr: number) => Promise.all([uploadedMonths(startupId, mrr), uploadedLastYear(startupId)]);

test.describe("profile answers from uploaded figures", () => {
  test("empty Financials questions are filled from the sheet and marked for checking", async ({ page }) => {
    await fresh(ID.alpha);
    await uploaded(ID.alpha, 30);
    await asFounder(page, ID.alpha);
    await page.goto("/profile#section-financials");
    await expect(page.locator("#pf-revenue_inr_l")).toHaveValue("360");
    await expect(page.locator("#pf-revenue_basis")).toHaveValue("Annual recurring revenue (ARR)");
    await expect(page.locator(`#pf-${LAST.key}`)).toHaveValue("210");
    await expect(page.locator("[data-from-sheet]")).toHaveCount(3);
    await expect(page.getByText(/From your uploaded figures \(.* MRR of ₹30 L × 12\)/)).toBeVisible();
    // Editing an answer makes it the founder's own.
    await page.locator("#pf-revenue_inr_l").fill("400");
    await expect(page.locator("[data-from-sheet]")).toHaveCount(2);
    await expect(page.locator("[data-sheet-differs]")).toContainText("360");
  });

  test("an answer the founder typed is kept, with the sheet's figure offered beside it", async ({ page }) => {
    await remove("startup_financial_months", ID.epsilon);
    await remove("startup_financial_years", ID.epsilon);
    await uploaded(ID.epsilon, 10);
    await asFounder(page, ID.epsilon);
    await page.goto("/profile#section-financials");
    await expect(page.locator("#pf-revenue_inr_l")).toHaveValue("75");
    const differs = page.locator("[data-sheet-differs]").first();
    await expect(differs).toContainText("Your uploaded figures say 120");
    // How revenue is measured doesn't follow the sheet when the ARR didn't.
    await expect(page.locator("#pf-revenue_basis")).not.toHaveValue("Annual recurring revenue (ARR)");
    await differs.getByRole("button", { name: "Use this" }).click();
    await expect(page.locator("#pf-revenue_inr_l")).toHaveValue("120");
    // The same number written another way is not a difference.
    await page.locator("#pf-revenue_inr_l").fill("120.0");
    await expect(page.locator("[data-sheet-differs]")).toHaveCount(0);
  });

  test("Financials counts the sheet's ARR, and the reminder goes once both ticks are green", async ({ page }) => {
    // Theta has no ARR on record or in a saved answer, and no other spec uses it.
    await uploadedMonths(ID.theta, 5);
    await asFounder(page, ID.theta);
    await page.goto("/financials");
    await expect(page.getByText("Worked out from your uploaded figures. Check it on My Profile, then save.")).toBeVisible();
    await expect(page.getByText(/From your uploaded figures: .* MRR of ₹5 L × 12/)).toBeVisible();
    await expect(page.getByText("₹60.00 L", { exact: true })).toBeVisible();
    // Last year still missing: the reminder and its button stay.
    await expect(page.getByRole("link", { name: "Add your financials" })).toBeVisible();

    await uploadedLastYear(ID.theta);
    await page.reload();
    await expect(page.getByText("₹60.00 L", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Report your revenue annually, as ARR" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Add your financials" })).toHaveCount(0);
  });
});
