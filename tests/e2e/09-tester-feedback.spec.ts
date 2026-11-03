import { asFounder, asTeam, expect, ID, test } from "./helpers";

// Things testers asked to remove or relabel, so they don't come back unnoticed.
test.describe("tester feedback", () => {
  test.beforeEach(async ({ page }) => asFounder(page, ID.alpha));

  test("the dashboard greeting has no date", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
  });

  test("the dashboard has no weekly activity chart", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Upcoming meetings")).toBeVisible();
    await expect(page.getByText("Weekly activity")).toHaveCount(0);
  });

  test("recent activity names the week a report covers", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("Recent activity")).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/\d+ reached · \d+ meetings/);
  });

  test("investors show their details, not match labels", async ({ page }) => {
    await page.goto("/funding");
    const main = page.locator("main");
    await expect(main.getByText("Cheque size").first()).toBeVisible();
    await expect(main.getByText("Geography").first()).toBeVisible();
    await expect(main.getByText("Sectors they invest in").first()).toBeVisible();
    await expect(main.getByText("Stages they back").first()).toBeVisible();
    for (const removed of ["Strong fit", "Stage fit", "Cheque fit", "Match type"]) {
      await expect(main.getByText(removed)).toHaveCount(0);
    }
  });

  test("weekly reports don't compare with last week", async ({ page }) => {
    await page.goto("/weekly-reports");
    await expect(page.getByText("Investors reached").first()).toBeVisible();
    for (const removed of ["vs last week", "First report", "No change"]) {
      await expect(page.locator("main").getByText(removed)).toHaveCount(0);
    }
  });

  test("financials keep the revenue note but drop the indicators section", async ({ page }) => {
    await page.goto("/financials");
    await expect(page.getByText("Annual revenue (ARR)").first()).toBeVisible();
    await expect(page.getByText("Demo run-rate note")).toBeVisible();
    for (const removed of ["Financial indicators", "Ask source", "Allocation source", "See note below"]) {
      await expect(page.locator("main").getByText(removed)).toHaveCount(0);
    }
  });
});

// Testers warned that a red, flat or zero trend upsets founders, so only gains get an arrow.
test.describe("trend arrows appear only for good news", () => {
  const noFalls = async (page: any) => {
    await expect(page.locator("main svg.lucide-arrow-down-right, main svg.lucide-minus")).toHaveCount(0);
  };

  test("a startup with progress sees its gains", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/funding");
    await expect(page.getByText("of matches contacted")).toBeVisible();
    await expect(page.getByText("67%")).toBeVisible();
    await expect(page.locator("main [data-gain]").first()).toBeVisible();
    await noFalls(page);
    await page.goto("/meetings");
    await expect(page.getByText("of all meetings")).toBeVisible();
    await noFalls(page);
  });

  test("a startup with nothing yet sees no zero trends", async ({ page }) => {
    await asFounder(page, ID.delta);
    for (const path of ["/dashboard", "/funding", "/meetings"]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      for (const zero of ["0%", "0 reached out", "0 upcoming", "0 held", "of matches contacted", "of all meetings"]) {
        await expect(page.locator("main").getByText(zero, { exact: false })).toHaveCount(0);
      }
      await expect(page.locator("main [data-gain]")).toHaveCount(0);
      await noFalls(page);
    }
  });
});

// Zeta's ask, allocation, revenue, round and notes, and one investor's cheque, are in dollars.
test.describe("dollar amounts show in rupees at 100 rupees to the dollar", () => {
  const noDollars = (page: any) => expect(page.locator("main")).not.toContainText(/US\$|USD|\$\s*\d/);

  test("for founders", async ({ page }) => {
    await asFounder(page, ID.zeta);

    await page.goto("/dashboard");
    await expect(page.getByText("₹15 Cr").first()).toBeVisible();
    await expect(page.getByText("₹5 Cr").first()).toBeVisible();
    await noDollars(page);

    await page.goto("/financials");
    await expect(page.getByText("₹15 Cr").first()).toBeVisible();
    await expect(page.getByText("ARR ₹2.5 Cr").first()).toBeVisible();
    await expect(page.getByText("₹20 Cr")).toBeVisible();
    await noDollars(page);

    await page.goto("/funding");
    await expect(page.getByText("₹10–20 Cr").first()).toBeVisible();
    await expect(page.locator("main")).not.toContainText("8.5");
    await noDollars(page);

    await page.goto("/business-details");
    await expect(page.getByText("Raising alongside a ₹20 Cr note")).toBeVisible();
    await noDollars(page);
  });

  test("for the team", async ({ page }) => {
    await asTeam(page);

    await page.goto("/admin/startups");
    await expect(page.getByText("₹15 Cr").first()).toBeVisible();
    await noDollars(page);

    await page.goto(`/admin/startups/${ID.zeta}`);
    await expect(page.getByText("₹15 Cr").first()).toBeVisible();
    await expect(page.getByText("ARR ₹2.5 Cr")).toBeVisible();
    await expect(page.getByText("Raising alongside a ₹20 Cr note")).toBeVisible();
    await noDollars(page);

    await page.goto("/admin/investors");
    await expect(page.getByText("₹10–20 Cr")).toBeVisible();
    await noDollars(page);
  });
});
