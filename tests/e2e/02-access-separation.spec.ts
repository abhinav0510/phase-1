import { asFounder, asTeam, BETA_SECRET, expect, ID, INVESTOR_CONTACTS, pageSource, test } from "./helpers";

const FOUNDER_PAGES = ["/dashboard", "/business-details", "/complete-profile", "/pitch-deck", "/financials", "/funding", "/meetings", "/weekly-reports", "/profile", "/settings"];

test.describe("roles", () => {
  test("a founder is kept out of every admin page", async ({ page }) => {
    await asFounder(page, ID.alpha);
    for (const path of ["/admin", "/admin/startups", `/admin/startups/${ID.beta}`, "/admin/investors", "/admin/users", "/admin/profiles", "/admin/notifications", "/admin/announcements"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/dashboard/);
    }
  });
  test("a team account is sent from the founder portal to the admin panel", async ({ page }) => {
    await asTeam(page);
    for (const path of ["/dashboard", "/funding", "/meetings"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin/);
    }
  });
});

test.describe("one startup can't see another's data", () => {
  for (const path of FOUNDER_PAGES) {
    test(`${path} has nothing from another startup, on screen or in the page data`, async ({ page }) => {
      await asFounder(page, ID.alpha);
      const html = await pageSource(page, path);
      expect(html).not.toContain(BETA_SECRET);
      expect(html).not.toContain("Demo Beta Labs");
      expect(html).not.toContain("Beta Only Ventures");
      expect(html).not.toContain("INR 99 Cr");
    });
  }

  test("the other founder sees their own data", async ({ page }) => {
    await asFounder(page, ID.beta);
    await page.goto("/funding");
    await expect(page.getByText("Beta Only Ventures").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Demo Capital");
    await expect(page.locator("body")).not.toContainText("Demo Alpha Foods");
  });

  test("changing the startup id in a URL doesn't show another startup", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto(`/dashboard?startup=${ID.beta}&startupId=${ID.beta}`);
    await expect(page.getByRole("heading", { name: /Demo Alpha Foods/ })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(BETA_SECRET);
  });
});

test.describe("investor contact details", () => {
  for (const path of FOUNDER_PAGES) {
    test(`${path} never carries an investor's email, phone, LinkedIn or contact name`, async ({ page }) => {
      await asFounder(page, ID.alpha);
      const html = await pageSource(page, path);
      for (const secret of INVESTOR_CONTACTS) expect(html, secret).not.toContain(secret);
      expect(html).not.toContain("internal desk note");
    });
  }
});

test.describe("internal fields", () => {
  test("founders never see the bucket or HOT10", async ({ page }) => {
    await asFounder(page, ID.alpha);
    for (const path of ["/dashboard", "/business-details", "/financials"]) {
      await page.goto(path);
      await expect(page.locator("body"), path).not.toContainText("HOT10");
    }
  });
  test("paused investors are hidden from founders", async ({ page }) => {
    await asFounder(page, ID.alpha);
    for (const path of ["/dashboard", "/funding"]) {
      const html = await pageSource(page, path);
      expect(html, path).not.toContain("Paused Fund Internal");
    }
  });
});
