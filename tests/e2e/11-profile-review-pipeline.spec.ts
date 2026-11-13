import { asFounder, asTeam, expect, failTable, ID, MOCK, state, test } from "./helpers";
import { USER } from "../mock/seed.mjs";

const USER_GAMMA = USER.gamma;

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

// Clicking a startup's name shows the team everything the founder has filled in.
test.describe("founder profile on the startup page", () => {
  test("shows every profile answer beside the record, and the founder's sign-in status", async ({ page, browser }) => {
    // The founder signs in once, so their last sign-in is known.
    const founder = await browser.newPage();
    await asFounder(founder, ID.epsilon);
    await founder.close();

    await asTeam(page);
    await page.goto("/admin/startups");
    await settle(page);
    await expect(page.getByRole("link", { name: "Demo Epsilon Fintech" }).first()).toHaveAttribute("href", `/admin/startups/${ID.epsilon}`);
    await page.goto(`/admin/startups/${ID.epsilon}`);

    const section = page.locator("#founder-profile");
    await expect(section).toContainText("Founder profile");
    await expect(section).toContainText(/\d+ of \d+ details complete/);
    for (const title of ["company", "team", "financials", "round"]) {
      await expect(section.locator(`[data-profile-section="${title}"]`)).toBeVisible();
    }
    await expect(section.locator('[data-field="one_liner"]')).toContainText("Demo fintech one-liner");
    await expect(section).toContainText("Login ID");
    await expect(section).toContainText("Changed by the founder");
    await expect(section).not.toContainText("Never signed in");
    await expect(section.getByRole("link", { name: /Open review/ })).toHaveAttribute("href", `/admin/profiles/${ID.epsilon}`);
  });

  test("a founder who hasn't started still shows the questions, their emails and the one-time password", async ({ page }) => {
    // Earlier tests may have had this founder choose a password; put them back on the one-time one.
    await fetch(`${MOCK}/auth/v1/admin/users/${USER_GAMMA}`, {
      method: "PUT",
      headers: { apikey: "test-service-role-key", Authorization: "Bearer test-service-role-key", "Content-Type": "application/json" },
      body: JSON.stringify({ app_metadata: { must_reset: true } }),
    });
    await asTeam(page);
    await page.goto(`/admin/startups/${ID.gamma}`);
    await settle(page);
    const section = page.locator("#founder-profile");
    await expect(section).toContainText("hasn't started their profile yet");
    await expect(section.locator("[data-field]").first()).toBeVisible();
    await expect(section).toContainText("Still on the one-time password");

    await page.goto(`/admin/startups/${ID.alpha}`);
    await expect(page.locator("#founder-profile")).toContainText("alpha.founder@demo.test");
  });
});

test.describe("deals shared on the startup page", () => {
  test("lists every investor the deal went to, with their reply and meeting", async ({ page }) => {
    await asTeam(page);
    await page.goto(`/admin/startups/${ID.alpha}`);
    await settle(page);
    const deals = page.locator("#deal-shares");
    await expect(deals).toContainText("Deals shared with investors");
    // From the PIPELINE tab, like the founder's dashboard: Demo Capital (two rows, one firm,
    // met on the calendar) and Passed Partners.
    await expect(deals).toContainText(/Shared with 2 investors · 2 replied/);
    const totals = deals.locator("[data-deal-totals]");
    await expect(totals).toContainText("Deals shared2");
    await expect(totals).toContainText("Investors interested1");
    await expect(totals).toContainText("Passed1");
    await expect(deals.locator(".recharts-wrapper")).toHaveCount(1);
    const row = (name: RegExp) => deals.locator("tr", { hasText: name });
    await expect(row(/Demo Capital/)).toContainText("Meeting");
    await expect(row(/Demo Capital/)).toContainText("Scheduled");
    await expect(row(/Demo Capital/)).toContainText("Shared 2 times");
    await expect(row(/Demo Capital/)).toContainText("Interested / Reviewing");
    await expect(row(/Passed Partners/)).toContainText("Passed");
    // The donut's legend filters the table to one reply type, and back.
    await deals.getByRole("button", { name: /^Passed/ }).click();
    await expect(deals.locator("tbody tr")).toHaveCount(1);
    await expect(deals.locator("tbody")).toContainText("Passed Partners");
    await deals.getByRole("button", { name: "Show all" }).click();
    await expect(deals.locator("tbody tr")).toHaveCount(2);
    // Another startup's emails never show here.
    await expect(deals).not.toContainText("BETA-SECRET-MARKER");
  });

  test("a startup with no deals shared says so", async ({ page }) => {
    await asTeam(page);
    await page.goto(`/admin/startups/${ID.epsilon}`);
    await expect(page.locator("#deal-shares")).toContainText("hasn't been shared with any investor yet");
  });
});

test.describe("meetings on the startup page", () => {
  test("are split into Scheduled and Past, without internal or cancelled ones", async ({ page }) => {
    await asTeam(page);
    await page.goto(`/admin/startups/${ID.alpha}`);
    await settle(page);
    const meetings = page.locator("#meetings");
    await expect(meetings.getByRole("tab", { name: /Scheduled 1/ })).toHaveAttribute("aria-selected", "true");
    await expect(meetings.locator("tbody tr")).toHaveCount(1);
    await expect(meetings.locator("tbody")).toContainText("Demo Capital");
    await expect(meetings.getByRole("link", { name: "Join" })).toBeVisible();

    await meetings.getByRole("tab", { name: /Past/ }).click();
    await expect(meetings.getByRole("tab", { name: /Past/ })).toHaveAttribute("aria-selected", "true");
    await expect(meetings.locator("tbody")).toContainText("Held");
    await expect(meetings.locator("tbody")).not.toContainText(/Internal|Sharks|Cancelled/i);
    await expect(meetings.getByRole("link", { name: "Join" })).toHaveCount(0);
  });
});

test.describe("pitch deck on the startup page", () => {
  test("shows the deck link investors receive", async ({ page }) => {
    await asTeam(page);
    await page.goto(`/admin/startups/${ID.alpha}`);
    await expect(page.locator("[data-deck]")).toContainText("https://bit.ly/demo-alpha");
    await page.goto(`/admin/startups/${ID.gamma}`);
    await expect(page.locator("[data-deck]")).toContainText("No deck link in the sheet");
  });
});
