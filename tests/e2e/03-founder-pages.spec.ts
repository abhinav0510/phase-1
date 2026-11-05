import { asFounder, expect, ID, test } from "./helpers";

test.describe("dashboard", () => {
  test.beforeEach(async ({ page }) => asFounder(page, ID.alpha));

  test("shows the raise, matches and meetings", async ({ page }) => {
    await expect(page.getByText("INR 5 Cr").first()).toBeVisible();
    // Sent + queued; the paused match is left out.
    await expect(page.getByText("Investor matches")).toBeVisible();
    await expect(page.getByText("Outreach pipeline")).toBeVisible();
    await expect(page.getByText("Annual revenue (ARR)")).toBeVisible();
  });
  test("counts real meetings only: no duplicates, internal or cancelled", async ({ page }) => {
    // 1 upcoming, Twice Saved, Left Side, Not Listed, list-named, Held.
    const card = page.locator("div", { hasText: /^Meetings/ }).filter({ has: page.getByText("upcoming") }).first();
    await expect(card).toContainText("6");
    await expect(card).toContainText("1 upcoming");
    await expect(card).toContainText("1 held");
  });
  test("offers to add a logo when there is none", async ({ page }) => {
    await expect(page.getByTitle("Add your company logo")).toBeVisible();
  });
  test("nudges the founder to complete their profile", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Complete profile" }).first()).toHaveAttribute("href", "/complete-profile");
  });
  test("the pipeline stages open their investor lists", async ({ page }) => {
    await page.getByRole("button", { name: /Reached out/ }).click();
    await expect(page.getByText("Demo Capital").first()).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("every tab opens from the nav bar", async ({ page }) => {
    await asFounder(page, ID.alpha);
    const tabs: [string, RegExp, RegExp][] = [
      ["/business-details", /business-details/, /My Startup/],
      ["/complete-profile", /complete-profile/, /Complete Profile/],
      ["/pitch-deck", /pitch-deck/, /Pitch Deck/],
      ["/financials", /financials/, /Financials/],
      ["/funding", /funding/, /Investors & Matches/],
      ["/meetings", /meetings/, /Meetings/],
      ["/dashboard", /dashboard/, /Welcome back/],
    ];
    for (const [href, url, heading] of tabs) {
      await page.locator(`nav[aria-label="Portal sections"] a[href="${href}"]`).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    }
  });
  test("the menu opens My Profile and Settings", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.getByRole("button", { name: /Demo Alpha Foods/ }).click();
    await page.getByRole("menu").getByRole("link", { name: "My profile" }).click();
    await expect(page).toHaveURL(/\/profile/);
    await page.goto("/settings");
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});

test.describe("my startup", () => {
  test("shows the company record, and no status beyond what's on file", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/business-details");
    await expect(page.getByRole("heading", { name: "Demo Alpha Foods" })).toBeVisible();
    await expect(page.getByText("FoodTech").first()).toBeVisible();
    await expect(page.getByText("Demo Owner")).toBeVisible();
    await expect(page.getByRole("link", { name: /Update details/ })).toHaveAttribute("href", "/complete-profile");
  });
});

test.describe("financials", () => {
  test.beforeEach(async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/financials");
  });

  test("tells founders clearly to report annually as ARR", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Report your revenue annually, as ARR" })).toBeVisible();
    await expect(page.getByText(/not a monthly one/)).toBeVisible();
    await expect(page.getByText(/multiply by 12/)).toBeVisible();
  });
  test("asks for last year's revenue, and no projections", async ({ page }) => {
    await expect(page.getByText("Previous year's record", { exact: true })).toBeVisible();
    await expect(page.getByText(/Not added yet: FY \d{4}-\d{2}$/)).toBeVisible();
    await expect(page.getByText("Projections", { exact: true })).toHaveCount(0);
  });
  test("the button goes straight to the financials form", async ({ page }) => {
    await page.getByRole("link", { name: "Add your financials" }).click();
    await expect(page).toHaveURL(/complete-profile#section-financials/);
    await expect(page.getByRole("heading", { name: "Financials", exact: true })).toBeVisible();
  });
  test("shows figures on record, monthly revenue and funding rounds", async ({ page }) => {
    await expect(page.getByText("Annual revenue (ARR)").first()).toBeVisible();
    await expect(page.getByText("₹2.50 Cr")).toBeVisible();
    await expect(page.getByText("Monthly revenue (MRR)")).toBeVisible();
    await expect(page.getByText("₹6 L", { exact: true })).toBeVisible();
    await expect(page.getByText("Monthly burn")).toHaveCount(0);
    await expect(page.getByText("Pre-seed")).toBeVisible();
    await expect(page.getByText("Demo Lead Angel")).toBeVisible();
    await expect(page.getByText("Demo run-rate note")).toBeVisible();
  });
});

test.describe("investors and matches", () => {
  test.beforeEach(async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/funding");
  });

  test("lists matched investors without paused ones", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Demo Capital/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Queue Ventures/ })).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Paused Fund");
  });
  test("shows what an investor said, with contact details hidden", async ({ page }) => {
    await page.getByRole("button", { name: /Demo Capital/ }).click();
    await expect(page.getByText(/Happy to meet/)).toBeVisible();
    await expect(page.getByText(/\[email hidden\]/)).toBeVisible();
    await expect(page.getByText(/\[phone hidden\]/)).toBeVisible();
    await expect(page.getByText(/\[profile link hidden\]/)).toBeVisible();
  });
  test("shows the investor's cheque size, sectors and geography", async ({ page }) => {
    await page.getByRole("button", { name: /Demo Capital/ }).click();
    await expect(page.getByText("₹2–10 Cr").first()).toBeVisible();
    await expect(page.getByText("India", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("foodtech", { exact: false }).first()).toBeVisible();
  });
  test("the Passed section gives the reason and opens investor details", async ({ page }) => {
    const reason = page.getByText("Too early for our fund right now");
    await reason.scrollIntoViewIfNeeded();
    await expect(reason).toBeVisible();
    await page.getByRole("button", { name: /Passed Partners/ }).last().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Passed Partners");
    await expect(dialog).toContainText("Global");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
  test("the tabs filter the list", async ({ page }) => {
    await page.getByRole("tab", { name: /In queue/ }).click();
    await expect(page.getByRole("button", { name: /Queue Ventures/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^DC Demo Capital/ })).toHaveCount(0);
  });
});

test.describe("meetings", () => {
  test.beforeEach(async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/meetings");
  });

  test("never says just Investor when a name can be found", async ({ page }) => {
    await page.getByRole("tab", { name: /Past/ }).click();
    const list = page.locator("ul").filter({ has: page.getByRole("button") }).first();
    await expect(list.getByText("Left Side Capital")).toBeVisible();
    await expect(list.getByText("Not Listed Fund")).toBeVisible();
    await expect(list.getByText("Queue Ventures")).toBeVisible();
    await expect(list.getByText("Investor", { exact: true })).toHaveCount(0);
  });
  test("shows a saved-twice meeting once", async ({ page }) => {
    await page.getByRole("tab", { name: /Past/ }).click();
    await expect(page.getByRole("button", { name: /Twice Saved Ventures/ })).toHaveCount(1);
  });
  test("hides internal and cancelled meetings", async ({ page }) => {
    await page.getByRole("tab", { name: /Past/ }).click();
    const body = page.locator("body");
    for (const hidden of ["Internal S.V Team", "SHARKS", "Cancelled Capital", "Rakesh Sidana"]) await expect(body).not.toContainText(hidden);
  });
  test("an upcoming meeting offers its join link", async ({ page }) => {
    await page.getByRole("tab", { name: /Upcoming/ }).click();
    await page.getByRole("button", { name: /Demo Capital/ }).click();
    await expect(page.getByRole("link", { name: "Join meeting" })).toHaveAttribute("href", "https://meet.example.test/abc");
  });
  test("counts agree with the list", async ({ page }) => {
    await expect(page.getByRole("tab", { name: /Upcoming/ })).toContainText("1");
    await expect(page.getByRole("tab", { name: /Past/ })).toContainText("5");
  });
});

test.describe("pitch deck", () => {
  test("embeds a Google Drive deck", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/pitch-deck");
    await expect(page.locator("iframe")).toHaveAttribute("src", "https://drive.google.com/file/d/DEMOFILEID12345/preview");
  });
  test("offers a mail button to request an update", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/pitch-deck");
    const mail = page.locator('a[href^="mailto:"]').first();
    await expect(mail).toBeVisible();
    await expect(mail).toHaveAttribute("href", /Pitch%20deck%20update/);
  });
  test("handles an external link it can't preview", async ({ page }) => {
    await asFounder(page, ID.delta);
    await page.goto("/pitch-deck");
    await expect(page.getByText("This deck is hosted outside Google Drive")).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
  });
  test("handles no deck at all", async ({ page }) => {
    await asFounder(page, ID.eta);
    await page.goto("/pitch-deck");
    await expect(page.getByText("No pitch deck on file yet")).toBeVisible();
  });
});

test.describe("weekly reports", () => {
  test("aren't shown to founders: no tab, and the old page goes to the dashboard", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await expect(page.locator('nav a[href="/weekly-reports"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Weekly Reports/ })).toHaveCount(0);
    await page.goto("/weekly-reports");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { level: 1, name: /Welcome back/ })).toBeVisible();
  });
});

test.describe("a startup with almost no data", () => {
  for (const path of ["/dashboard", "/business-details", "/financials", "/funding", "/meetings", "/pitch-deck", "/profile", "/complete-profile"]) {
    test(`${path} still loads`, async ({ page }) => {
      await asFounder(page, ID.eta);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }
});

test.describe("announcements", () => {
  test("a founder sees live notices only and can dismiss them", async ({ page }) => {
    await asFounder(page, ID.beta);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Demo live announcement");
    await page.getByRole("button", { name: /Got it|Next|Dismiss all/ }).first().click();
    await page.getByRole("button", { name: /^Announcements/ }).click();
    await expect(page.getByText("Demo live announcement").first()).toBeVisible();
    const body = page.locator("body");
    for (const hidden of ["Demo expired announcement", "Demo team-only announcement", "Demo inactive announcement"]) await expect(body).not.toContainText(hidden);
  });
});

// Sections used to wait until they scrolled into view, and Safari could leave them blank
// after a tab switch until the page was reloaded.
test("switching tabs never leaves a section invisible", async ({ page }) => {
  await asFounder(page, ID.alpha);
  for (const href of ["/complete-profile", "/funding", "/financials", "/meetings", "/business-details", "/dashboard", "/funding"]) {
    await page.locator(`nav[aria-label="Portal sections"] a[href="${href}"]`).click();
    await expect(page).toHaveURL(new RegExp(href));
    await expect
      .poll(
        () =>
          page.evaluate(
            () => [...document.querySelectorAll("main [style*='opacity']")].filter((el) => getComputedStyle(el).opacity === "0").length,
          ),
        { message: `${href} has invisible sections`, timeout: 5000 },
      )
      .toBe(0);
  }
});
