import { asFounder, asTeam, expect, failTable, ID, MOCK, test } from "./helpers";

// The PIPELINE rows in tests/mock/seed.mjs, counted the daily report's way:
// today: Alpha × Demo Capital (two rows, one firm; met on the calendar), Alpha × Passed Partners, Beta × Queue Ventures
//        = 3 deals shared from 5 shared rows (Beta × Peak XV was first shared on 2 Sep; D00008 isn't shared).
// 14 Sep 2026: Delta × Peak XV (passed) and Delta × 12 Flags VC (no reply).
// September 2026: those two plus Beta × Peak XV on 2 Sep = 3.

async function settle(page: any) {
  await page.waitForLoadState("networkidle");
  const popup = page.getByRole("button", { name: /^(Got it|Next)$/ }).first();
  if (await popup.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) {
    await page.getByRole("button", { name: "Dismiss all" }).or(popup).first().click();
  }
}
const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${MOCK}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: "test-service-role-key", Authorization: "Bearer test-service-role-key", "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
const tiles = (page: any) => page.locator("[data-totals]");
const TILE: Record<string, string> = { "Deals shared": "shares", Responses: "responses", "Interested / meeting": "interested", Passed: "passed" };
const tile = (page: any, label: string) => page.locator(`[data-tile="${TILE[label]}"]`);

test.describe("deal sharing", () => {
  test("the dashboard card shows today's deals shared and opens the page", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin");
    await settle(page);
    const card = page.locator("[data-deals-today]");
    await expect(card).toContainText("Deals shared today");
    await expect(card).toContainText(/^3/);
    await expect(card).toContainText(/\d+ this week · \d+ this month/);
    await expect(card).toHaveAttribute("href", "/admin/deal-sharing");
    await page.goto("/admin/deal-sharing");
    await expect(page.locator("main")).toContainText("Deal sharing");
    // The page and the card agree.
    await expect(tile(page, "Deals shared")).toContainText(/^3Deals shared/);
  });

  test("today lists each deal once, with the investor's response, and explains repeat rows", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/deal-sharing");
    await expect(page.locator("[data-sync-status]")).toContainText("Synced from the PIPELINE tab");
    await expect(page.locator("[data-sync-status]")).toContainText("10 sheet rows");
    await expect(tile(page, "Deals shared")).toContainText("5 sheet rows (some shared again)");
    await expect(tile(page, "Responses")).toContainText(/^2Responses/);
    await expect(tile(page, "Passed")).toContainText(/^1Passed/);

    const table = page.locator("[data-shares-table]");
    await expect(table.locator("tbody tr")).toHaveCount(3);
    const row = (text: string) => table.locator("tbody tr", { hasText: text });
    // The sheet says interested, but the calendar has a meeting with Demo Capital, and like
    // the daily report a calendar meeting wins.
    await expect(row("Demo Capital - Partner A")).toContainText("Meeting");
    await expect(row("Demo Capital - Partner A")).toContainText("Interested / Reviewing");
    await expect(row("Demo Capital - Partner A")).toContainText("Shared 2 times (D00001, D00004)");
    await expect(row("Passed Partners")).toContainText("Passed");
    await expect(row("Queue Ventures")).toContainText("No reply yet");
    await expect(table).not.toContainText("Inflection Point");
    await expect(table).not.toContainText("Peak XV");
    // A startup links to its page.
    await expect(row("Queue Ventures").getByRole("link", { name: "Demo Beta Labs" })).toHaveAttribute("href", `/admin/startups/${ID.beta}`);
  });

  test("the table filters by response and by search", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/deal-sharing");
    await settle(page);
    const table = page.locator("[data-shares-table]");
    await table.getByRole("button", { name: /^Passed/ }).click();
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table.locator("[data-shown-count]")).toHaveText("Showing 1 of 3");
    await table.getByRole("button", { name: /^All/ }).click();
    await table.getByLabel("Search deals").fill("queue");
    await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table.locator("tbody")).toContainText("Demo Beta Labs");
  });

  test("any past day can be picked", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/deal-sharing");
    await settle(page);
    await page.getByLabel("Pick a day").fill("2026-09-14");
    await page.getByRole("button", { name: "Show day" }).click();
    await expect(page).toHaveURL(/period=day&date=2026-09-14/);
    await expect(page.locator("main")).toContainText("Deals shared on 14 September 2026");
    await expect(tile(page, "Deals shared")).toContainText(/^2Deals shared/);
    const table = page.locator("[data-shares-table]");
    await expect(table.locator("tbody tr")).toHaveCount(2);
    await expect(table.locator("tbody tr", { hasText: "Peak XV" })).toContainText("Passed");
    await expect(table.locator("tbody tr", { hasText: "12 Flags VC" })).toContainText("No reply yet");
  });

  test("any past month can be picked, with a day-by-day chart that opens a day", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/deal-sharing");
    await settle(page);
    await page.getByLabel("Pick a month").fill("2026-09");
    await page.getByRole("button", { name: "Show month" }).click();
    await expect(page).toHaveURL(/period=pickmonth&month=2026-09/);
    await expect(page.locator("[data-totals]")).toContainText("September 2026");
    await expect(tile(page, "Deals shared")).toContainText(/^3Deals shared/);
    await expect(page.locator("[data-daily-chart] .recharts-wrapper")).toBeVisible();
    await expect(page.locator("[data-shares-table] tbody tr")).toHaveCount(3);
    // Each day of the chart links to that day.
    const day = page.locator('[data-daily-chart] a[href="/admin/deal-sharing?period=day&date=2026-09-14"]');
    await expect(day).toHaveText("14 Sep: 2");
    await page.goto((await day.getAttribute("href"))!);
    await expect(page.locator("[data-shares-table] tbody tr")).toHaveCount(2);
  });

  test("this week and this month add up from their days", async ({ page }) => {
    await asTeam(page);
    for (const period of ["week", "month"]) {
      await page.goto(`/admin/deal-sharing?period=${period}`);
      const bars = await page.locator("[data-daily-chart] li a").allTextContents();
      const sum = bars.reduce((a, t) => a + Number(t.split(": ")[1]), 0);
      await expect(tile(page, "Deals shared")).toContainText(new RegExp(`^${sum}Deals shared`));
      await expect(page.locator("[data-shares-table] tbody tr")).toHaveCount(sum);
    }
  });

  test("a future or impossible date shows today instead", async ({ page }) => {
    await asTeam(page);
    for (const q of ["period=day&date=2999-01-01", "period=day&date=2026-02-30", "period=pickmonth&month=2999-01"]) {
      await page.goto(`/admin/deal-sharing?${q}`);
      await expect(page.locator("[data-totals]")).toContainText(/^Today, /);
    }
  });

  test("says so when the latest sync failed or is late, and never shows zeros on a failed read", async ({ page }) => {
    await asTeam(page);
    await rest("pipeline_sync_runs", {
      method: "POST",
      body: JSON.stringify({ id: 99, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), rows_read: 0, rows_written: 0, rows_removed: 0, ok: false, error: "Could not read the PIPELINE tab" }),
    });
    await page.goto("/admin/deal-sharing");
    await expect(page.locator("[data-sync-status]")).toContainText("The latest sync failed: Could not read the PIPELINE tab");
    // The figures still come from the last good sync.
    await expect(tile(page, "Deals shared")).toContainText(/^3Deals shared/);
    await rest("pipeline_sync_runs?id=eq.99", { method: "DELETE" });

    await failTable("pipeline_deals", true);
    try {
      await page.goto("/admin/deal-sharing");
      await expect(page.locator("[data-sync-state]")).toContainText("Couldn't read the PIPELINE mirror");
      await expect(page.locator("[data-totals]")).toHaveCount(0);
      await page.goto("/admin");
      await expect(page.locator("[data-deals-today]")).toContainText("—");
    } finally {
      await failTable("pipeline_deals", false);
    }
  });

  test("founders can't open it", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/admin/deal-sharing");
    await expect(page).not.toHaveURL(/\/admin\/deal-sharing/);
  });
});
