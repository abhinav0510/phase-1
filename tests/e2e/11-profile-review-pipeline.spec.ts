import { asFounder, asTeam, expect, failTable, ID, state, test } from "./helpers";

const profile = async (id: number) => (await state("startup_profiles")).find((p) => p.startup_id === id);

// Click only once the page has finished loading, as a person would: a click in the first
// few milliseconds, before the page's scripts run, can be lost. The team account's unread
// announcement also pops up just after load, so close it first.
async function settle(page: any) {
  await page.waitForLoadState("networkidle");
  const popup = page.getByRole("button", { name: /^(Got it|Next)$/ }).first();
  if (await popup.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) {
    await page.getByRole("button", { name: "Dismiss all" }).or(popup).first().click();
  }
}

// The whole path: a founder submits, and the team sees it waiting for review and opens it.
test.describe("profile review pipeline", () => {
  test("a founder's submission reaches the team's review queue", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/profile");
    await page.getByLabel(/Annual revenue – ARR/).fill("250");
    await page.getByLabel("One-line pitch").fill("Zeta pipeline pitch");
    await page.getByRole("button", { name: /Submit for review/ }).click();
    await expect(page.getByRole("status")).toContainText(/Sent to the Sidana team/);
    expect((await profile(ID.zeta))?.status).toBe("submitted");

    await page.context().clearCookies();
    await asTeam(page);
    await expect(page.locator("main")).toContainText(/Profiles? (waiting|to review)|Awaiting|review/i);
    await page.goto("/admin/profiles");
    const row = page.getByRole("row", { name: /Demo Zeta Mobility/ });
    await expect(row).toContainText("Awaiting review");
    await settle(page);
    await row.getByRole("link", { name: "Review" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/profiles/${ID.zeta}$`));
    await expect(page.locator("main")).toContainText("Zeta pipeline pitch");
  });
});

test.describe("submissions stay visible to the team", () => {
  test("saving a draft after submitting keeps it waiting for review", async ({ page }) => {
    await asFounder(page, ID.eta);
    await page.goto("/profile");
    await page.getByLabel(/Annual revenue – ARR/).fill("250");
    await page.getByRole("button", { name: /Submit for review/ }).click();
    await expect(page.getByRole("status")).toContainText(/Sent to the Sidana team/);

    await page.getByLabel("One-line pitch").fill("Edited after submitting");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status")).toContainText(/still with the Sidana team/);
    const p = await profile(ID.eta);
    expect(p.status).toBe("submitted");
    expect(p.answers.one_liner).toBe("Edited after submitting");
  });

  test("a failed read shows an error, never an empty queue", async ({ page }) => {
    await asTeam(page);
    await failTable("startup_profiles", true);
    try {
      await page.goto("/admin/profiles");
      await expect(page.getByRole("alert").filter({ hasText: /Couldn't load founder submissions/ })).toBeVisible();
      await expect(page.getByText("No founder profiles yet")).toHaveCount(0);
    } finally {
      await failTable("startup_profiles", false);
    }
  });

  test("the startup page links to its profile review", async ({ page }) => {
    await asTeam(page);
    await page.goto(`/admin/startups/${ID.epsilon}`);
    await settle(page);
    await page.getByRole("link", { name: /Founder profile/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/profiles/${ID.epsilon}$`));
    await expect(page.locator("main")).toContainText("Demo fintech one-liner");
  });
});
