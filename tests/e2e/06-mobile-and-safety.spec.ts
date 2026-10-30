import { asFounder, asTeam, expect, ID, netGuardLog, test } from "./helpers";

const noSideScroll = async (page: any, label: string) => {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, `${label} scrolls sideways on a phone`).toBeLessThanOrEqual(width + 1);
};

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ["/", "/login", "/teamonly", "/forgot-password"]) {
    test(`${path} fits`, async ({ page }) => {
      await page.goto(path);
      await noSideScroll(page, path);
    });
  }

  for (const path of ["/dashboard", "/business-details", "/complete-profile", "/pitch-deck", "/financials", "/funding", "/meetings", "/weekly-reports", "/profile", "/settings"]) {
    test(`founder ${path} fits`, async ({ page }) => {
      await asFounder(page, ID.alpha);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await noSideScroll(page, path);
    });
  }

  test("founders can move between pages with the phone nav", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.locator('nav a[href="/funding"]:visible').first().click();
    await expect(page).toHaveURL(/\/funding/);
    await page.locator('nav a[href="/meetings"]:visible').first().click();
    await expect(page).toHaveURL(/\/meetings/);
  });

  for (const path of ["/admin", "/admin/startups", `/admin/startups/${ID.alpha}`, "/admin/investors", "/admin/matches", "/admin/meetings", "/admin/documents", "/admin/reports", "/admin/users", "/admin/notifications", "/admin/announcements", "/admin/profiles", "/admin/settings"]) {
    test(`admin ${path} fits`, async ({ page }) => {
      await asTeam(page);
      await page.goto(path);
      await noSideScroll(page, path);
    });
  }

  test("the team can move between pages with the phone nav", async ({ page }) => {
    await asTeam(page);
    await page.locator('nav a[href="/admin/startups"]:visible').first().click();
    await expect(page).toHaveURL(/\/admin\/startups/);
  });
});

test.describe("test safety", () => {
  test("the app never tried to reach a real service during this run", async () => {
    const log = netGuardLog();
    expect(log).not.toMatch(/supabase\.co|n8n\.cloud|googleapis\.com\/gmail/);
    expect(log, "unexpected outside connection attempts").toBe("");
  });
});
