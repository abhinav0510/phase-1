import { asFounder, asTeam, expect, failWebhook, ID, state, test, webhooks } from "./helpers";

test.describe("admin pages", () => {
  test.beforeEach(async ({ page }) => asTeam(page));

  const pages: [string, RegExp][] = [
    ["/admin", /startups/i],
    ["/admin/startups", /Demo Alpha Foods/],
    ["/admin/investors", /Demo Capital/],
    ["/admin/matches", /Matches by state/],
    ["/admin/meetings", /Demo/],
    ["/admin/documents", /Document verification queue/],
    ["/admin/reports", /Startups by status/],
    ["/admin/users", /Users & access/],
    ["/admin/notifications", /Recent broadcasts/],
    ["/admin/announcements", /New announcement/],
    ["/admin/profiles", /Founder profile reviews/],
    ["/admin/settings", /password/i],
  ];
  for (const [path, text] of pages) {
    test(`${path} loads with real content`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("body")).toContainText(text);
      await expect(page.locator("body")).not.toContainText("Application error");
    });
  }

  test("the side rail reaches every section", async ({ page }) => {
    for (const href of ["/admin/startups", "/admin/investors", "/admin/matches", "/admin/meetings", "/admin/documents", "/admin/users", "/admin/notifications", "/admin/announcements", "/admin/profiles"]) {
      await expect(page.locator(`aside a[href="${href}"]`), href).toHaveCount(1);
    }
  });

  test("startups can be searched and filtered", async ({ page }) => {
    await page.goto("/admin/startups?q=Beta");
    await expect(page.locator("main")).toContainText("Demo Beta Labs");
    await expect(page.locator("main")).not.toContainText("Demo Alpha Foods");

    await page.goto("/admin/startups?status=blocked");
    await expect(page.locator("main")).toContainText("Demo Beta Labs");
    await expect(page.locator("main")).not.toContainText("Demo Alpha Foods");

    await page.goto("/admin/startups?q=zzzz-nothing");
    await expect(page.locator("main")).not.toContainText("Demo Alpha Foods");
  });

  test("a startup record shows its matches, meetings, funding and documents", async ({ page }) => {
    await page.goto(`/admin/startups/${ID.alpha}`);
    const main = page.locator("main");
    await expect(main).toContainText("Demo Alpha Foods");
    await expect(main).toContainText("Demo Capital");
    await expect(main).toContainText("Pre-seed");
    await expect(main).toContainText("MIS");
    // The team does see internal matches.
    await expect(main).toContainText("Paused Fund Internal");
  });

  test("an unknown startup doesn't crash", async ({ page }) => {
    await page.goto("/admin/startups/999999");
    await expect(page.locator("body")).toContainText(/could not be found|not found/i);
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("investors can be searched", async ({ page }) => {
    await page.goto("/admin/investors?q=Passed");
    await expect(page.locator("main")).toContainText("Passed Partners");
    await expect(page.locator("main")).not.toContainText("Queue Ventures");
  });

  test("the documents queue lists only what's outstanding", async ({ page }) => {
    await page.goto("/admin/documents");
    await expect(page.locator("main")).toContainText("MIS");
    await expect(page.locator("main")).not.toContainText("Cap table");
  });

  test("users are listed with their roles", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator("main")).toContainText("team@sidana.test");
    await expect(page.locator("main")).toContainText("s101");
  });

  test("the top search is available", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Search" }).click();
    const box = page.getByPlaceholder("Search startups…");
    await box.fill("Beta");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/admin\/startups\?.*q=Beta/);
    await expect(page.locator("main")).toContainText("Demo Beta Labs");
  });
});

test.describe("announcements", () => {
  test("publish, reaches founders, then deactivate and delete", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/announcements");
    await page.getByPlaceholder(/New: weekly reports/).fill("Automated test notice");
    await page.getByPlaceholder(/What changed/).fill("Notice body for the test");
    await page.getByRole("button", { name: "Publish announcement" }).click();
    await expect(page.getByText(/Published\./)).toBeVisible();
    await expect.poll(async () => (await state("announcements")).some((a) => a.title === "Automated test notice")).toBe(true);

    await page.context().clearCookies();
    await asFounder(page, ID.epsilon);
    await expect(page.getByRole("dialog")).toContainText("Automated test notice");
    const notice = (await state("announcements")).find((a) => a.title === "Automated test notice");
    await page.getByRole("button", { name: /Got it|Dismiss all/ }).first().click();
    await expect.poll(async () => (await state("announcement_dismissals")).some((d) => d.announcement_id === notice.id)).toBe(true);
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.context().clearCookies();
    await asTeam(page);
    await page.goto("/admin/announcements");
    const row = page.getByRole("row", { name: /Automated test notice/ });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /delete/i }).click();
    await expect.poll(async () => (await state("announcements")).some((a) => a.title === "Automated test notice")).toBe(false);
  });

  test("a title and message are required", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/announcements");
    const publish = page.getByRole("button", { name: "Publish announcement" });
    await expect(publish).toBeDisabled();
    await page.getByPlaceholder(/New: weekly reports/).fill("Only a title");
    await expect(publish).toBeDisabled();
    await page.getByPlaceholder(/What changed/).fill("And a message");
    await expect(publish).toBeEnabled();
  });
});

test.describe("email startups", () => {
  const compose = async (page: any, subject: string) => {
    await page.goto("/admin/notifications");
    await page.getByPlaceholder(/Platform update/).fill(subject);
    await page.locator("textarea").last().fill("Hello {{founder_name}} at {{startup_name}}");
  };

  test("a test goes only to the signed-in admin", async ({ page }) => {
    await asTeam(page);
    await compose(page, "Automated test mail");
    await page.getByRole("button", { name: "Send test to me" }).click();
    await expect.poll(async () => (await webhooks()).filter((w) => w.kind === "broadcast").length).toBeGreaterThan(0);
    const last = (await webhooks()).filter((w) => w.kind === "broadcast").pop();
    expect(last.body.secret).toBe("test-webhook-secret");
    expect(last.body.messages).toHaveLength(1);
    expect(last.body.messages[0].to).toBe("team@sidana.test");
  });

  test("sending needs the count typed, then personalises each email", async ({ page }) => {
    await asTeam(page);
    await compose(page, "Automated broadcast");
    await page.getByRole("button", { name: /^Send to \d+ recipient/ }).click();
    const sendNow = page.getByRole("button", { name: "Send now" });
    await expect(sendNow).toBeDisabled();
    await page.getByRole("button", { name: "Send now" }).locator("xpath=../..").locator("input").fill("999");
    await expect(sendNow).toBeDisabled();
    const count = (await page.getByText(/Type \d+ to confirm/).innerText()).match(/\d+/)![0];
    await page.getByRole("button", { name: "Send now" }).locator("xpath=../..").locator("input").fill(count);
    await sendNow.click();

    await expect.poll(async () => (await state("email_broadcasts")).some((b) => b.subject === "Automated broadcast" && b.status === "sent")).toBe(true);
    const sent = (await webhooks()).filter((w) => w.kind === "broadcast").pop().body.messages;
    expect(sent).toHaveLength(Number(count));
    const alpha = sent.find((m: any) => m.to.includes("alpha.founder@demo.test"));
    expect(alpha.text).toContain("Hello Alpha Founder at Demo Alpha Foods");
    expect(alpha.html + alpha.subject).not.toContain("{{");
  });

  test("the same subject can't be sent twice by accident", async ({ page }) => {
    await asTeam(page);
    await compose(page, "Automated broadcast");
    await page.getByRole("button", { name: /^Send to \d+ recipient/ }).click();
    const count = (await page.getByText(/Type \d+ to confirm/).innerText()).match(/\d+/)![0];
    await page.getByRole("button", { name: "Send now" }).locator("xpath=../..").locator("input").fill(count);
    await page.getByRole("button", { name: "Send now" }).click();
    await expect(page.getByText(/just sent/i)).toBeVisible();
  });

  test("the broadcast's page shows each recipient", async ({ page }) => {
    await asTeam(page);
    const b = (await state("email_broadcasts")).find((x) => x.subject === "Automated broadcast");
    await page.goto(`/admin/notifications/${b.id}`);
    await expect(page.locator("main")).toContainText("Demo Alpha Foods");
    await expect(page.locator("main")).toContainText("alpha.founder@demo.test");
  });

  test("selected startups and extra addresses are respected, and bad addresses refused", async ({ page }) => {
    await asTeam(page);
    await compose(page, "Automated selected mail");
    await page.getByLabel(/Choose startups/).check();
    await page.getByPlaceholder("Search startups…").fill("Beta");
    await page.getByRole("button", { name: "Select shown" }).click();
    await page.getByPlaceholder(/founder@startup.com/).fill("not-an-address");
    await expect(page.locator("body")).toContainText(/not-an-address|valid/i);
    await page.getByPlaceholder(/founder@startup.com/).fill("extra@demo.test");
    await page.getByRole("button", { name: /^Send to 2 recipients/ }).click();
    await page.getByRole("button", { name: "Send now" }).locator("xpath=../..").locator("input").fill("2");
    await page.getByRole("button", { name: "Send now" }).click();
    await expect.poll(async () => (await state("email_broadcasts")).some((b) => b.subject === "Automated selected mail")).toBe(true);
    await expect.poll(async () => (await webhooks()).filter((w) => w.kind === "broadcast").pop().body.messages.map((m: any) => m.to).sort().join("|"))
      .toBe("beta.founder@demo.test, shared@demo.test|extra@demo.test");
  });

  test("when the n8n workflow is off, the admin is told and it is recorded as failed", async ({ page }) => {
    await failWebhook("broadcast", true);
    try {
      await asTeam(page);
      await compose(page, "Automated failing mail");
      await page.getByRole("button", { name: "Send test to me" }).click();
      await expect(page.getByText(/n8n responded 404/)).toBeVisible();
      await expect.poll(async () => (await state("email_broadcasts")).find((b) => b.subject?.includes("Automated failing mail"))?.status).toBe("failed");
    } finally {
      await failWebhook("broadcast", false);
    }
  });

  test("Sync now calls the contacts workflow and reports the result", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/notifications");
    await page.getByRole("button", { name: "Sync now" }).click();
    await expect(page.getByText(/Synced|matched|emails/i).first()).toBeVisible();
    await expect.poll(async () => (await webhooks()).some((w) => w.kind === "contacts-sync" && w.body.secret === "test-webhook-secret")).toBe(true);
  });
});

test.describe("profile reviews", () => {
  test("shows a submission against the record, and requesting changes needs a note", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/profiles");
    await expect(page.locator("main")).toContainText("Demo Epsilon Fintech");
    await page.goto(`/admin/profiles/${ID.epsilon}`);
    const main = page.locator("main");
    await expect(main).toContainText("Demo fintech one-liner");
    await expect(main).toContainText("Annual revenue – ARR");
    await expect(main).toContainText("Financials");
    await expect(page.getByRole("button", { name: "Request changes" })).toBeDisabled();
  });

  test("requesting changes reaches the founder", async ({ page }) => {
    await asTeam(page);
    await page.goto(`/admin/profiles/${ID.epsilon}`);
    await page.getByPlaceholder(/Please add your ARR basis/).fill("Please add your FY numbers");
    await page.getByRole("button", { name: "Request changes" }).click();
    await expect.poll(async () => (await state("startup_profiles")).find((p) => p.startup_id === ID.epsilon).status).toBe("changes_requested");

    await page.context().clearCookies();
    await asFounder(page, ID.epsilon);
    await page.goto("/complete-profile");
    await expect(page.getByText(/Please add your FY numbers/).first()).toBeVisible();
  });

  test("approving stores the approved copy and never overwrites the startup record", async ({ page }) => {
    const before = JSON.stringify((await state("startups")).find((s) => s.id === ID.epsilon));
    await asTeam(page);
    await page.goto(`/admin/profiles/${ID.epsilon}`);
    await page.getByRole("button", { name: "Approve" }).click();
    await expect.poll(async () => (await state("startup_profiles")).find((p) => p.startup_id === ID.epsilon).status).toBe("approved");
    const p = (await state("startup_profiles")).find((x) => x.startup_id === ID.epsilon);
    expect(p.approved_answers.one_liner).toBe("Demo fintech one-liner");
    expect(p.reviewed_by_email).toBe("team@sidana.test");
    expect(JSON.stringify((await state("startups")).find((s) => s.id === ID.epsilon))).toBe(before);
  });
});
