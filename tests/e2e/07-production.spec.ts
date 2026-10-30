import { asFounder, expect, failTable, ID, test } from "./helpers";

test.describe("production behaviour", () => {
  test("the health check needs no sign-in", async ({ request }) => {
    const res = await request.get("/api/health", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe("ok");
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test("the deep health check reaches Supabase", async ({ request }) => {
    const res = await request.get("/api/health?deep=1", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect((await res.json()).supabase).toBe("ok");
  });

  for (const path of ["/", "/login"]) {
    test(`${path} sends the security headers`, async ({ request }) => {
      const headers = (await request.get(path)).headers();
      expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"]).toContain("frame-src https://drive.google.com");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  }

  test("robots.txt is public and doesn't reveal private pages", async ({ request }) => {
    const res = await request.get("/robots.txt", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/Disallow: \//);
    expect(body).not.toContain("teamonly");
  });

  test("a signed-in founder gets the not-found page for an unknown address", async ({ page }) => {
    await asFounder(page, ID.alpha);
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("a failed read shows an error, not an empty page, and retrying recovers", async ({ page }) => {
    await asFounder(page, ID.alpha);
    // Saving clears this startup's cache, so the next visit has to read the database.
    await page.goto("/complete-profile");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toBeVisible();

    await failTable("weekly_reports", true);
    try {
      await page.goto("/weekly-reports");
      await expect(page.getByRole("heading", { name: "We couldn't load this page" })).toBeVisible();
      await expect(page.getByText("No weekly reports yet")).toHaveCount(0);
    } finally {
      await failTable("weekly_reports", false);
    }

    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Weekly Reports" })).toBeVisible();
  });
});
