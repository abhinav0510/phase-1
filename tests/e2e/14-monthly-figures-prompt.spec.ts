import { asFounder, expect, ID, MOCK, state, test } from "./helpers";

// After a first upload, founders are asked each month for last month's figures.
const ist = new Date(Date.now() + 5.5 * 3600 * 1000);
const monthsAgo = (n: number) => {
  const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const long = (m: string) => `${NAMES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`;
// Last month is due from the 2nd; on the 1st the month before it is the newest due.
const newestDue = ist.getUTCDate() >= 2 ? monthsAgo(1) : monthsAgo(2);

async function insert(table: string, rows: object[]) {
  const res = await fetch(`${MOCK}/rest/v1/${table}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: "test-service-role-key", authorization: "Bearer test-service-role-key" },
    body: JSON.stringify(rows),
  });
  expect(res.status).toBe(201);
}
const ownMonths = async (id: number) => (await state("startup_financial_months")).filter((m) => m.startup_id === id);

test.describe("monthly figures prompt", () => {
  test("asks for the next month, can wait a day, and saves only that month", async ({ page }) => {
    const recordBefore = JSON.stringify((await state("startups")).find((s) => s.id === ID.delta));
    // Delta uploaded once, three months ago.
    await insert("startup_financial_months", [{ startup_id: ID.delta, month: monthsAgo(3), revenue_inr_l: 20, mrr_inr_l: 18, expenses_inr_l: 15 }]);
    await asFounder(page, ID.delta);
    const dialog = page.getByRole("dialog", { name: /Add your .* figures/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(`Add your ${long(monthsAgo(2))} figures`);

    // Remind me later: gone for today, on every page.
    await dialog.getByRole("button", { name: "Remind me later" }).first().click();
    await expect(dialog).toHaveCount(0);
    await page.goto("/current-round");
    await expect(page.getByRole("heading", { level: 1, name: "Current round" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: /figures/ })).toHaveCount(0);

    // Tomorrow it is back (simulated by clearing the snooze).
    await page.evaluate(() => localStorage.removeItem("sv:figures-later"));
    await page.goto("/financials");
    await expect(dialog).toBeVisible();

    // Words are refused and nothing is saved.
    await dialog.getByLabel(/^Revenue/).fill("lots");
    await dialog.getByRole("button", { name: "Save figures" }).click();
    await expect(dialog.getByRole("alert")).toContainText("must be a number in ₹ lakh");
    expect(await ownMonths(ID.delta)).toHaveLength(1);

    // Saving adds that one month, keeps the earlier one, and the page reloads with the new figures.
    await dialog.getByLabel(/^Revenue/).fill("30");
    await dialog.getByLabel(/^MRR/).fill("27.5");
    await dialog.getByRole("button", { name: "Save figures" }).click();
    await expect(page.locator("#financials-upload")).toContainText(`Saved your ${long(monthsAgo(2))} figures`);
    await expect.poll(async () => (await ownMonths(ID.delta)).map((m) => m.month).sort()).toEqual([monthsAgo(3), monthsAgo(2)].sort());
    const saved = (await ownMonths(ID.delta)).find((m) => m.month === monthsAgo(2));
    expect([saved.revenue_inr_l, saved.mrr_inr_l, saved.expenses_inr_l]).toEqual([30, 27.5, null]);
    await expect(page.getByText("₹27.50 L").first()).toBeVisible();

    // Then it moves on to the next month that is due, if any.
    if (newestDue === monthsAgo(1)) await expect(page.getByRole("dialog", { name: `Add your ${long(monthsAgo(1))} figures` })).toBeVisible();
    else await expect(page.getByRole("dialog", { name: /figures/ })).toHaveCount(0);
    // The founder's input never touches the startup record.
    expect(JSON.stringify((await state("startups")).find((s) => s.id === ID.delta))).toBe(recordBefore);
  });

  test("a founder who has never uploaded is not asked", async ({ page }) => {
    await asFounder(page, ID.eta);
    await page.goto("/financials");
    await expect(page.getByRole("heading", { level: 1, name: "Financials" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: /figures/ })).toHaveCount(0);
  });
});
