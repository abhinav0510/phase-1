import { asFounder, asTeam, expect, ID, state, test } from "./helpers";

const profile = async (id: number) => (await state("startup_profiles")).find((p) => p.startup_id === id);
const saveDraft = (page: any) => page.getByRole("button", { name: "Save draft" }).click();
const submit = (page: any) => page.getByRole("button", { name: /Submit for review/ }).click();

test.describe("complete profile", () => {
  test("the Financials section asks for ARR, past years and projections", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/complete-profile#section-financials");
    await expect(page.getByLabel(/Annual revenue – ARR/)).toBeVisible();
    await expect(page.getByText("Required")).toBeVisible();
    await expect(page.getByText(/not a monthly number/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Previous years' records" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Projections" })).toBeVisible();
    await expect(page.getByLabel(/revenue \(₹ lakh\)/)).toHaveCount(6);
  });

  test("submitting without ARR is blocked and nothing is saved", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/complete-profile");
    await submit(page);
    await expect(page.getByRole("status")).toContainText(/Annual revenue/);
    expect(await profile(ID.delta)).toBeUndefined();
  });

  test("bad numbers and links are rejected", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/complete-profile");
    await page.getByLabel(/Annual revenue – ARR/).fill("lots");
    await saveDraft(page);
    await expect(page.getByRole("status")).toContainText(/must be a number/);

    await page.getByLabel(/Annual revenue – ARR/).fill("-5");
    await saveDraft(page);
    await expect(page.getByRole("status")).toContainText(/must be a number/);

    await page.getByLabel(/Annual revenue – ARR/).fill("100");
    await page.getByLabel("Website").fill("not a link");
    await saveDraft(page);
    await expect(page.getByRole("status")).toContainText(/must be a full link/);
    expect(await profile(ID.delta)).toBeUndefined();
  });

  test("a draft can be saved without ARR, and reloads as typed", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/complete-profile");
    await page.getByLabel("One-line pitch").fill("Demo draft pitch");
    await saveDraft(page);
    await expect(page.getByRole("status")).toContainText(/saved/i);
    const p = await profile(ID.delta);
    expect(p.status).toBe("draft");
    expect(p.answers.one_liner).toBe("Demo draft pitch");

    await page.reload();
    await expect(page.getByLabel("One-line pitch")).toHaveValue("Demo draft pitch");
  });

  test("submitting saves everything for review and never touches the startup record", async ({ page }) => {
    const before = JSON.stringify((await state("startups")).find((s) => s.id === ID.delta));
    await asFounder(page, ID.delta);
    await page.goto("/complete-profile");

    await page.getByLabel(/Annual revenue – ARR/).fill("1,250");
    const years = page.getByLabel(/revenue \(₹ lakh\)/);
    await expect(years).toHaveCount(6);
    for (let i = 0; i < 6; i++) await years.nth(i).fill(String(100 + i * 50));
    await page.getByLabel("Notes on those years").fill("Net loss of 5 L in the first year");
    await page.getByLabel("What the projections assume").fill("Two new cities");
    await page.getByLabel("Link to your financial statements").fill("https://example.test/statements");
    await page.getByLabel("Link to your financial model").fill("https://example.test/model");
    await page.getByRole("button", { name: "India", exact: true }).click();

    await submit(page);
    await expect(page.getByRole("status")).toContainText(/review|submitted|sent/i);

    const p = await profile(ID.delta);
    expect(p.status).toBe("submitted");
    expect(p.answers.revenue_inr_l).toBe("1250");
    expect(p.answers.markets).toEqual(["India"]);
    expect(p.answers.past_financials_note).toContain("Net loss");
    expect(Object.keys(p.answers).filter((k) => k.startsWith("revenue_actual_fy"))).toHaveLength(3);
    expect(Object.keys(p.answers).filter((k) => k.startsWith("revenue_projected_fy"))).toHaveLength(3);

    // Founder answers never overwrite the record directly.
    expect(JSON.stringify((await state("startups")).find((s) => s.id === ID.delta))).toBe(before);
  });

  test("the Financials page then shows those numbers", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/financials");
    await expect(page.getByText(/3 of 3 added/)).toHaveCount(2);
    await expect(page.getByRole("cell", { name: "Actual" })).toHaveCount(3);
    await expect(page.getByRole("cell", { name: "Projected" })).toHaveCount(3);
    await expect(page.getByRole("cell", { name: "₹1.00 Cr", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "₹3.50 Cr", exact: true })).toBeVisible();
  });

  test("the review status shows on the form", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/complete-profile");
    await expect(page.getByText(/Sent for review on/)).toBeVisible();
  });

  test("unknown fields in a request are dropped", async ({ page }) => {
    const p = await profile(ID.delta);
    expect(Object.keys(p.answers)).not.toContain("role");
    expect(Object.keys(p.answers)).not.toContain("startup_id");
  });
});

test.describe("company logo", () => {
  // A real 1x1 PNG.
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==",
    "base64",
  );

  test("a text file pretending to be an image is refused", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/profile");
    await page.locator('input[type="file"]').setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") });
    await expect(page.locator("#logo")).toContainText(/image|PNG|couldn|read/i);
    expect((await state("startup_branding")).filter((b) => b.startup_id === ID.zeta)).toHaveLength(0);
  });

  test("upload, show on the dashboard, then remove", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/profile");
    await page.locator('input[type="file"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: /Save logo/i }).click();
    await expect.poll(async () => (await state("startup_branding")).filter((b) => b.startup_id === ID.zeta).length).toBe(1);

    const saved = (await state("startup_branding")).find((b) => b.startup_id === ID.zeta);
    expect(saved.logo_path).toContain(String(ID.zeta));

    // Founder's answers stay out of startups, and the file is served only through the app.
    const logo = await page.request.get("/api/founder/logo");
    expect(logo.status()).toBe(200);
    expect(logo.headers()["x-content-type-options"]).toBe("nosniff");
    expect(logo.headers()["cache-control"]).toContain("private");

    await page.goto("/dashboard");
    await expect(page.locator('img[src*="/api/founder/logo"]').first()).toBeVisible();
    await expect(page.getByTitle("Add your company logo")).toHaveCount(0);

    await page.goto("/profile");
    await page.getByRole("button", { name: /Remove/i }).click();
    await expect.poll(async () => (await state("startup_branding")).find((b) => b.startup_id === ID.zeta)?.logo_path ?? null).toBeNull();
    await page.goto("/dashboard");
    await expect(page.getByTitle("Add your company logo")).toBeVisible();
  });

  test("a founder with no logo gets no file, not someone else's", async ({ page }) => {
    await asFounder(page, ID.eta);
    const res = await page.request.get("/api/founder/logo");
    expect(res.status()).toBe(404);
  });

  test("a team account can't use the founder logo route", async ({ page }) => {
    await asTeam(page);
    const res = await page.request.get("/api/founder/logo");
    expect(res.status()).toBe(404);
  });
});
