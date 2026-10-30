import { asFounder, asTeam, expect, ID, loginFounder, loginTeam, PASSWORD, restoreUser, test, webhooks } from "./helpers";

test.describe("public pages", () => {
  test("homepage loads with its sign-in link", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("Sidana");
    await expect(page.locator('a[href="/login"]').first()).toBeAttached();
  });

  test("homepage never links to the team login", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/teamonly"]')).toHaveCount(0);
  });

  for (const path of ["/login", "/teamonly", "/forgot-password"]) {
    test(`${path} loads without signing in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path));
      await expect(page.locator("form")).toBeVisible();
    });
  }

  const protectedPaths = [
    "/dashboard", "/business-details", "/complete-profile", "/pitch-deck", "/financials", "/funding", "/meetings", "/weekly-reports", "/profile", "/settings",
    "/admin", "/admin/startups", "/admin/investors", "/admin/matches", "/admin/meetings", "/admin/documents", "/admin/reports", "/admin/users", "/admin/notifications", "/admin/announcements", "/admin/profiles", "/admin/settings",
  ];
  for (const path of protectedPaths) {
    test(`${path} sends a signed-out visitor to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("the logo file can't be fetched signed out", async ({ request }) => {
    const res = await request.get("/api/founder/logo", { maxRedirects: 0 });
    expect([302, 303, 307, 308, 401, 404]).toContain(res.status());
  });
});

test.describe("founder sign-in", () => {
  test("works with a Login ID", async ({ page }) => {
    await loginFounder(page, ID.alpha);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Welcome back, Demo Alpha Foods/ })).toBeVisible();
  });
  test("works with an S-prefixed Login ID", async ({ page }) => {
    await loginFounder(page, "S101");
    await expect(page).toHaveURL(/\/dashboard/);
  });
  test("works with an email on file, in any case", async ({ page }) => {
    await loginFounder(page, "ALPHA.COFOUNDER@demo.test");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  const INVALID = "Invalid email / Login ID or password.";
  test("a wrong password gets the generic error", async ({ page }) => {
    await loginFounder(page, ID.alpha, "wrong-password");
    await expect(page.getByText(INVALID)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
  test("an unknown email gets the same error, so emails can't be discovered", async ({ page }) => {
    await loginFounder(page, "nobody@demo.test");
    await expect(page.getByText(INVALID)).toBeVisible();
  });
  test("an email shared by two startups can't sign in", async ({ page }) => {
    await loginFounder(page, "shared@demo.test");
    await expect(page.getByText(INVALID)).toBeVisible();
  });
  test("a team account can't sign in through the founder form", async ({ page }) => {
    await loginFounder(page, "team@sidana.test");
    await expect(page.getByText(INVALID)).toBeVisible();
  });
  test("a signed-in founder skips the login page", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("team sign-in", () => {
  test("lands on the admin panel", async ({ page }) => {
    await loginTeam(page);
    await expect(page).toHaveURL(/\/admin/);
  });
  test("a wrong password shows an error", async ({ page }) => {
    await loginTeam(page, "team@sidana.test", "nope");
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
  });
  test("a deactivated account is turned away", async ({ page }) => {
    await loginTeam(page, "inactive@sidana.test");
    await expect(page).toHaveURL(/\/login\?error=inactive/);
  });
});

test.describe("signing out", () => {
  test("ends the session", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.getByRole("button", { name: /Demo Alpha Foods/ }).click();
    await page.getByRole("menu").getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/(login|teamonly)?$|\/login/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("passwords", () => {
  test("first sign-in forces a new password, then lets the founder in", async ({ page }) => {
    await loginFounder(page, ID.gamma);
    await expect(page).toHaveURL(/\/force-reset/);

    // The portal stays closed until the password changes.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/force-reset/);

    await page.getByPlaceholder("At least 8 characters").fill("short");
    await page.getByPlaceholder("Repeat your password").fill("short");
    await page.getByRole("button", { name: /Set password/ }).click();
    await expect(page).toHaveURL(/\/force-reset/);

    await page.getByPlaceholder("At least 8 characters").fill("brand-new-pass-1");
    await page.getByPlaceholder("Repeat your password").fill("different-pass-1");
    await page.getByRole("button", { name: /Set password/ }).click();
    await expect(page).toHaveURL(/\/force-reset/);

    await page.getByPlaceholder("At least 8 characters").fill("brand-new-pass-1");
    await page.getByPlaceholder("Repeat your password").fill("brand-new-pass-1");
    await page.getByRole("button", { name: /Set password/ }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const users = await (await fetch("http://localhost:4329/__users")).json();
    const gamma = users.find((u: any) => u.email === `s${ID.gamma}@founders.sidana.local`);
    expect(gamma.password).toBe("brand-new-pass-1");
    expect(gamma.app_metadata.must_reset).toBe(false);
  });

  test("a founder can change their password in Settings", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/settings");
    const fields = page.locator('input[type="password"]');
    await fields.nth(0).fill("zeta-new-password");
    await fields.nth(1).fill("does-not-match");
    await page.getByRole("button", { name: /password/i }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();

    await fields.nth(1).fill("zeta-new-password");
    await page.getByRole("button", { name: /password/i }).click();
    await expect(page.getByText("Password updated.")).toBeVisible();

    await page.context().clearCookies();
    await loginFounder(page, ID.zeta, PASSWORD);
    await expect(page.getByText("Invalid email / Login ID or password.")).toBeVisible();
    await loginFounder(page, ID.zeta, "zeta-new-password");
    await expect(page).toHaveURL(/\/dashboard/);
    await restoreUser(`s${ID.zeta}@founders.sidana.local`);
  });

  test("forgot password asks for a reset link", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByPlaceholder("you@sidanaventures.com").fill("team@sidana.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect.poll(async () => (await webhooks()).some((w) => w.kind === "password-recovery" && w.email === "team@sidana.test")).toBe(true);
  });

  test("an admin can issue a temporary password that must be changed", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/users");
    const row = page.getByRole("row", { name: /s105/ });
    await row.getByRole("button", { name: /Reset password/ }).click();
    await row.getByRole("button", { name: /^Reset / }).click();
    await expect(row.locator("code")).toBeVisible();
    const users = await (await fetch("http://localhost:4329/__users")).json();
    const epsilon = users.find((u: any) => u.email === `s${ID.epsilon}@founders.sidana.local`);
    expect(epsilon.app_metadata.must_reset).toBe(true);
    expect(epsilon.password).not.toBe(PASSWORD);
    await restoreUser(epsilon.email);
  });
});
