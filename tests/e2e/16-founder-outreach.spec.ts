import { asFounder, asTeam, expect, ID, MOCK, test } from "./helpers";
import { PASSWORD, USER } from "../mock/seed.mjs";

// Founders see the same deals shared as the team: both read the PIPELINE mirror and count
// one deal per investor firm (tests/mock/seed.mjs pipeline_deals):
//   Alpha: Demo Capital (two rows, met on the calendar) and Passed Partners (passed) = 2
//   Gamma: Lok Capital (meeting requested) = 1, and Gamma has no rows in the old matches table
//   Delta: Peak XV (passed) and 12 Flags VC = 2 (Inflection Point is not shared)

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${MOCK}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: "test-service-role-key", Authorization: "Bearer test-service-role-key", "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
const kpi = (page: any, key: string) => page.locator(`[data-kpi="${key}"]`);
const adminShared = async (page: any, id: number) => {
  await page.goto(`/admin/startups/${id}`);
  const text = await page.locator("#deal-shares").innerText();
  return Number(/Shared with (\d+) investor/.exec(text)?.[1] ?? NaN);
};

test.describe("founder outreach comes from the PIPELINE tab", () => {
  for (const [name, id, shared, passed] of [
    ["Alpha", ID.alpha, 2, 1],
    ["Gamma", ID.gamma, 1, 0],
    ["Delta", ID.delta, 2, 1],
  ] as const) {
    test(`${name}: the founder's Investors Outreached and Passed equal the admin startup page`, async ({ page, browser }) => {
      // An earlier spec may have changed this founder's password or put them back on the one-time one.
      await fetch(`${MOCK}/auth/v1/admin/users/${USER[name.toLowerCase() as "alpha" | "gamma" | "delta"]}`, {
        method: "PUT",
        headers: { apikey: "test-service-role-key", Authorization: "Bearer test-service-role-key", "Content-Type": "application/json" },
        body: JSON.stringify({ password: PASSWORD, app_metadata: { must_reset: false } }),
      });
      const team = await browser.newPage();
      await asTeam(team);
      expect(await adminShared(team, id)).toBe(shared);
      await expect(team.locator("#deal-shares [data-deal-totals]")).toContainText(`Passed${passed}`);
      await team.close();

      await asFounder(page, id);
      await page.goto("/dashboard");
      await expect(kpi(page, "outreached")).toHaveText(new RegExp(`^Investors Outreached\\s*${shared}(?!\\d)`));
      await expect(kpi(page, "passed")).toHaveText(new RegExp(`^Passed\\s*${passed}(?!\\d)`));
      await expect(page.locator("main")).toContainText("Investors outreached");
    });
  }

  test("each investor shows once, with a founder-safe status and no team notes", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/dashboard");
    const main = page.locator("main");
    await expect(main.getByText("Demo Capital", { exact: true }).first()).toBeVisible();
    await expect(main).not.toContainText("Partner A");
    await expect(main).not.toContainText("Partner B");
    await expect(main).toContainText("Passed Partners");
    // The sheet's own wording ("Interested / Reviewing") and owner never reach the founder.
    await expect(main).not.toContainText("Interested / Reviewing");
    await expect(main).not.toContainText("Aditya");
  });

  test("a deal shared just now shows up for the founder", async ({ page }) => {
    test.setTimeout(150_000);
    const today = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
    await rest("pipeline_deals", {
      method: "POST",
      body: JSON.stringify({
        deal_id: "D09001", row_no: 9001, startup: "Demo Theta Sheets", owner: "Aditya", investor: "Brand New Capital", investor_domains: [],
        deal_shared: "Yes", date_shared: today, synced_at: new Date().toISOString(),
      }),
    });
    try {
      await asFounder(page, ID.theta);
      // Founder pages cache for at most a minute.
      await expect
        .poll(async () => {
          await page.goto("/dashboard");
          return page.locator('[data-kpi="outreached"]').innerText();
        }, { timeout: 90_000, intervals: [2_000, 5_000, 10_000] })
        .toMatch(/^Investors Outreached\s*1(?!\d)/);
      await expect(page.locator("main")).toContainText("Brand New Capital");
    } finally {
      await rest("pipeline_deals?deal_id=eq.D09001", { method: "DELETE" });
    }
  });

  test("the Overview page counts the same outreach", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/overview");
    await expect(page.locator("main")).toContainText("Investors outreached");
    await expect(page.locator("main")).toContainText("How investors responded");
    await expect(page.locator("main")).toContainText("1 replied (50%)");
  });
});
