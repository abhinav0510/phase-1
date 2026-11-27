import type { Page } from "@playwright/test";
import { asFounder, asTeam, BETA_SECRET, expect, ID, pageSource, state, test, webhooks } from "./helpers";

// Phase 2: the investor portal, the founder chat and conclusions, and admin visibility.
const GOOGLE = { investor: "investor@northbridge.test", stranger: "stranger@gmail.test", noAccess: "hidden.partner@demo-capital.test" };
const NORTHBRIDGE = 207;

async function googleSignIn(page: Page, email: string, query = "") {
  await page.goto(`/investor/login${query}`);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.getByRole("link", { name: email }).click();
}

async function asInvestor(page: Page, query = "") {
  await googleSignIn(page, GOOGLE.investor, query);
  await expect(page).toHaveURL(/\/investor\//);
}

test.describe("investor sign-in (2.1, 2.12)", () => {
  test("a Google account that isn't on the list gets no portal account", async ({ page }) => {
    await googleSignIn(page, GOOGLE.stranger);
    await expect(page).toHaveURL(/\/investor\/login\?error=not_on_list/);
    await expect(page.locator(".auth-notice")).toContainText("isn't on Sidana's investor list");
    const rows = await state("app_users");
    expect(rows.some((r: any) => r.email === GOOGLE.stranger)).toBe(false);
  });

  test("an investor whose reply hasn't opened access is told so", async ({ page }) => {
    await googleSignIn(page, GOOGLE.noAccess);
    await expect(page).toHaveURL(/error=no_access/);
  });

  test("the invite link lands the investor on the startup, signed in with Google", async ({ page }) => {
    await asInvestor(page, `?next=/investor/startup/${ID.alpha}&hint=${GOOGLE.investor}`);
    await expect(page).toHaveURL(new RegExp(`/investor/startup/${ID.alpha}$`));
    await expect(page.getByRole("heading", { name: /Demo Alpha Foods/ })).toBeVisible();
    const user = (await state("app_users")).find((r: any) => r.email === GOOGLE.investor);
    expect(user).toMatchObject({ role: "investor", investor_id: NORTHBRIDGE, active: true });
    const access = (await state("investor_portal_access")).find((r: any) => r.investor_id === NORTHBRIDGE);
    expect(access.first_signin_at).toBeTruthy();
    expect((await state("portal_activity")).some((a: any) => a.action === "signed_in" && a.investor_id === NORTHBRIDGE)).toBe(true);
  });

  test("roles stay in their own portals", async ({ page, browser }) => {
    await asInvestor(page);
    for (const path of ["/dashboard", "/meetings", "/admin"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/investor\/matches/);
    }
    const founder = await browser.newPage();
    await asFounder(founder, ID.alpha);
    await founder.goto("/investor/matches");
    await expect(founder).toHaveURL(/\/dashboard/);
    await founder.close();
  });

  test("signed-out visitors are sent to the investor sign-in", async ({ page }) => {
    await page.goto("/investor/matches");
    await expect(page).toHaveURL(/\/investor\/login\?next=%2Finvestor%2Fmatches/);
  });
});

test.describe("matches and thesis (2.4, 2.6)", () => {
  test("shows startups that fit the thesis, and only those", async ({ page }) => {
    await asInvestor(page);
    await page.goto("/investor/matches");
    await expect(page.getByRole("heading", { name: "Demo Alpha Foods" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo Theta Sheets" })).toBeVisible();
    const html = await pageSource(page, "/investor/matches");
    expect(html).not.toContain("Demo Beta Labs");
    expect(html).not.toContain(BETA_SECRET);
    expect(html).not.toContain("Demo Gamma Robotics");
  });

  test("editing the thesis refreshes the list at once and tags new matches", async ({ page }) => {
    await asInvestor(page);
    await page.goto("/investor/matches");
    await page.getByRole("button", { name: "Edit thesis" }).click();
    // Sectors are folded into groups; searching opens the matching ones.
    await expect(page.getByRole("button", { name: "Manufacturing & industrial", exact: true })).toHaveCount(0);
    await page.getByLabel("Search sectors").fill("manufact");
    await page.getByRole("button", { name: "Manufacturing & industrial", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Demo Gamma Robotics" })).toBeVisible();
    await expect(page.getByText("New match")).toBeVisible();
    await expect(page.getByRole("status")).toContainText("1 new");
    const row = (await state("investor_thesis")).find((r: any) => r.investor_id === NORTHBRIDGE);
    expect(row.sectors).toContain("MANUFACTURING_INDUSTRIAL");
    // The synced investor row is never written; the change goes to INVESTOR_CRITERIA through n8n instead.
    const inv = (await state("investors")).find((r: any) => r.id === NORTHBRIDGE);
    expect(inv.sectors).toEqual(["FNB_PACKAGED_FOOD", "SAAS_ENTERPRISE"]);
    await expect
      .poll(async () => ((await state("thesis_writebacks")) ?? []).at(-1))
      .toMatchObject({ investor_name: "Northbridge Demo Fund", changes: { sector_mode: "LIST", sectors_in: expect.arrayContaining(["MANUFACTURING_INDUSTRIAL"]) } });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Demo Gamma Robotics" })).toBeVisible();
    // Put it back for the next tests, from the picked-sector chip.
    await page.getByRole("button", { name: "Edit thesis" }).click();
    await page.getByRole("button", { name: "Remove Manufacturing & industrial" }).click();
    await expect(page.getByRole("heading", { name: "Demo Gamma Robotics" })).toHaveCount(0);
  });
});

test.describe("profile, meetings and chat (2.5, 2.7, 2.8)", () => {
  test("a startup outside the thesis, with no interest or meeting, is a 404", async ({ page }) => {
    await asInvestor(page);
    for (const path of [`/investor/startup/${ID.beta}`, `/investor/chats/${ID.alpha + 2}`, `/api/investor/logo/${ID.beta}`]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test("a startup without an approved founder profile shows Sidana's deal-memo data, labelled", async ({ page }) => {
    await asInvestor(page);
    await page.goto(`/investor/startup/${ID.theta}`);
    await expect(page.getByText("From Sidana's deal memo.")).toBeVisible();
    await expect(page.getByText("Theta memo one-liner").first()).toBeVisible();
    await expect(page.getByText("Theta memo overview from the deal memo.")).toBeVisible();
    await expect(page.getByText("Chennai")).toBeVisible();
  });

  test("profile shows approved data, the interested count and the actions", async ({ page }) => {
    await asInvestor(page);
    const html = await pageSource(page, `/investor/startup/${ID.alpha}`);
    expect(html).not.toContain("alpha.founder@demo.test");
    expect(html).not.toContain("Demo run-rate note");
    await page.goto(`/investor/startup/${ID.alpha}`);
    await expect(page.getByText("Investors interested")).toBeVisible();
    await expect(page.getByRole("button", { name: "Interested", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Chat with founder" })).toBeVisible();
  });

  test("booking a Google Meet goes through n8n and is saved", async ({ page }) => {
    await asInvestor(page);
    await page.goto(`/investor/startup/${ID.theta}`);
    await page.getByRole("button", { name: "Schedule a meet" }).click();
    const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    await page.getByLabel("Date").fill(day);
    await page.getByLabel("Time (IST)").selectOption("16:00");
    await page.getByRole("button", { name: "Book meeting" }).click();
    await expect(page.getByRole("status")).toContainText("Booked");
    const hook = (await webhooks()).filter((w: any) => w.kind === "portal-meet-create").pop();
    expect(hook.body).toMatchObject({ startup_id: ID.theta, investor_id: NORTHBRIDGE, duration_min: 30, title: "Demo Theta Sheets <> Northbridge Demo Fund" });
    expect(hook.body.start).toBe(new Date(`${day}T16:00:00+05:30`).toISOString());
    expect((await state("portal_meetings")).some((m: any) => m.startup_id === ID.theta && m.investor_id === NORTHBRIDGE)).toBe(true);
    await expect(page.getByRole("button", { name: "Schedule a meet" })).toHaveCount(0);
    const thetaThread = (await state("chat_threads")).find((t: any) => t.investor_id === NORTHBRIDGE && t.startup_id === ID.theta);
    const notice = (await state("chat_messages")).filter((m: any) => m.thread_id === thetaThread.id);
    expect(notice).toHaveLength(1);
    expect(notice[0]).toMatchObject({ sender_role: "system", meet_link: expect.stringContaining("https://meet.google.com/mock-") });
  });

  test("chat is closed until there is interest AND a meeting", async ({ page }) => {
    await asInvestor(page);
    // Theta now has a meeting but no interest yet.
    await page.goto(`/investor/startup/${ID.theta}`);
    await expect(page.getByRole("link", { name: "Chat with founder" })).toHaveCount(0);
    expect((await page.goto(`/investor/chats/${ID.theta}`))?.status()).toBe(404);
    await page.goto(`/investor/startup/${ID.theta}`);
    await page.getByRole("button", { name: "I'm interested" }).click();
    await expect(page.getByRole("link", { name: "Chat with founder" })).toBeVisible();
    // Withdraw again so the founder side below only has Alpha.
    await page.getByRole("button", { name: "Interested", exact: true }).click();
    await expect(page.getByRole("link", { name: "Chat with founder" })).toHaveCount(0);
  });

  test("a message reaches the founder, and the founder can reply", async ({ page, browser }) => {
    await asInvestor(page);
    await page.goto(`/investor/chats/${ID.alpha}`);
    await expect(page.getByText("Meeting booked · Sidana Ventures")).toBeVisible();
    await expect(page.getByRole("link", { name: "Join Google Meet" })).toHaveAttribute("href", "https://meet.google.com/nb-alpha");
    await page.getByLabel("Message").fill("Could you share the bank-partner contracts?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Could you share the bank-partner contracts?").last()).toBeVisible();

    const founder = await browser.newPage();
    await asFounder(founder, ID.alpha);
    await founder.goto("/chats");
    await founder.getByRole("link", { name: /Northbridge Demo Fund/ }).click();
    await expect(founder.getByRole("link", { name: "Join Google Meet" })).toBeVisible();
    await expect(founder.getByText("Could you share the bank-partner contracts?").last()).toBeVisible();
    await founder.getByLabel("Message").fill("Sending them over today.");
    await founder.getByRole("button", { name: "Send" }).click();
    await expect(founder.getByText("Sending them over today.").last()).toBeVisible();
    // Another founder sees no such chat.
    const other = await browser.newPage();
    await asFounder(other, ID.delta);
    // The founder area streams (loading.tsx), so Next sends its not-found page with a 200.
    await other.goto(`/chats/${NORTHBRIDGE}`);
    await expect(other.getByRole("heading", { name: "Page not found" })).toBeVisible();
    expect(await other.content()).not.toContain("bank-partner");
    await founder.close();
    await other.close();

    await page.reload();
    await expect(page.getByText("Sending them over today.").last()).toBeVisible();
    const msgs = await state("chat_messages");
    const alphaThread = (await state("chat_threads")).find((t: any) => t.investor_id === NORTHBRIDGE && t.startup_id === ID.alpha);
    const inThread = msgs.filter((m: any) => m.thread_id === alphaThread.id);
    // First: Sidana's automatic notice with the booked call's time and Join link, posted once.
    expect(inThread.map((m: any) => m.sender_role)).toEqual(["system", "investor", "founder"]);
    expect(inThread[0].meet_link).toBe("https://meet.google.com/nb-alpha");
    // Activity is logged without the message text.
    const acts = (await state("portal_activity")).filter((a: any) => a.action === "chat_message");
    expect(acts).toHaveLength(2);
    expect(JSON.stringify(acts)).not.toContain("bank-partner");
  });

  test("files can be attached, reach the founder, and stay inside the chat", async ({ page, browser }) => {
    await asInvestor(page);
    await page.goto(`/investor/chats/${ID.alpha}`);
    const pdf = Buffer.from("%PDF-1.7\n1 0 obj<<>>endobj\n%%EOF");
    await page.locator('input[type="file"]').setInputFiles({ name: "Term sheet draft.pdf", mimeType: "application/pdf", buffer: pdf });
    await expect(page.getByText("Term sheet draft.pdf")).toBeVisible();
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.locator('a[href*="/api/chat/attachment/"]', { hasText: "Term sheet draft.pdf" })).toBeVisible();

    // A file that isn't a document is refused.
    await page.locator('input[type="file"]').setInputFiles({ name: "run.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ\x90\x00not a doc") });
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Send an image, PDF, Excel, Word, PowerPoint or CSV file")).toBeVisible();

    const msg = (await state("chat_messages")).find((m: any) => m.attachment_name === "Term sheet draft.pdf");
    expect(msg).toMatchObject({ sender_role: "investor", attachment_type: "application/pdf", body: "" });

    const founder = await browser.newPage();
    await asFounder(founder, ID.alpha);
    await founder.goto(`/chats/${NORTHBRIDGE}`);
    await expect(founder.locator('a[href*="/api/chat/attachment/"]', { hasText: "Term sheet draft.pdf" })).toBeVisible();
    const res = await founder.request.get(`/api/chat/attachment/${msg.id}?download=1`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toContain("attachment");
    expect((await res.body()).toString()).toContain("%PDF-1.7");

    // Another founder, or nobody signed in, can't fetch it.
    const other = await browser.newPage();
    await asFounder(other, ID.delta);
    expect((await other.request.get(`/api/chat/attachment/${msg.id}`)).status()).toBe(404);
    const anon = await (await browser.newContext()).newPage();
    const anonRes = await anon.request.get(`/api/chat/attachment/${msg.id}`, { maxRedirects: 0 });
    expect(anonRes.status()).not.toBe(200);
    expect((await anonRes.body()).toString()).not.toContain("%PDF");
    await founder.close();
    await other.close();
  });

  test("my meetings lists the portal booking", async ({ page }) => {
    await asInvestor(page);
    await page.goto("/investor/meetings");
    await expect(page.getByRole("heading", { name: "My meetings" })).toBeVisible();
    await expect(page.getByText("Demo Alpha Foods").first()).toBeVisible();
  });
});

test.describe("past deals", () => {
  test("live shared deals and past deals each show in their place", async ({ page }) => {
    const MOCK = "http://localhost:4329";
    const at = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
    await fetch(`${MOCK}/rest/v1/mail_log`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: "test-service-role-key", authorization: "Bearer test-service-role-key" },
      body: JSON.stringify([
        { id: 9101, startup_id: ID.epsilon, investor_id: NORTHBRIDGE, sent_at: at(30), reply_kind: null, subject: "Epsilon", reply_gist: null },
        { id: 9102, startup_id: ID.epsilon, investor_id: NORTHBRIDGE, sent_at: at(28), reply_kind: "pass", subject: "Re: Epsilon", reply_gist: "Lending is outside our mandate this year." },
        { id: 9103, startup_id: ID.delta, investor_id: NORTHBRIDGE, sent_at: at(10), reply_kind: null, subject: "Delta", reply_gist: null },
      ]),
    });
    await asInvestor(page);
    await page.goto("/investor/past-deals");
    await expect(page.getByRole("heading", { name: "Past deals", exact: true, level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Demo Epsilon Fintech/ }).first().click();
    await expect(page.getByText("Lending is outside our mandate this year.")).toBeVisible();
    // An unanswered deal that's still raising is a live shared deal, not history.
    await expect(page.getByText("Demo Delta Retail")).toHaveCount(0);
    await page.goto("/investor/shared");
    await expect(page.getByRole("heading", { name: "Shared deals", exact: true, level: 1 })).toBeVisible();
    // The smallest block holding both the name and the status is Delta's card.
    const delta = page.locator("div").filter({ has: page.getByRole("heading", { name: "Demo Delta Retail" }) }).filter({ hasText: "Awaiting your reply" }).last();
    await expect(delta).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo Alpha Foods" })).toBeVisible();
    await delta.getByRole("link", { name: "View profile" }).click();
    await expect(page).toHaveURL(new RegExp(`/investor/startup/${ID.delta}$`));
    await expect(page.getByRole("heading", { name: /Demo Delta Retail/ })).toBeVisible();
  });
});

test.describe("passing on a deal", () => {
  test("asks why, learns from it, sets a private trigger, and the founder sees none of it", async ({ page, browser }) => {
    const MOCK = "http://localhost:4329";
    const month = (n: number) => {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - n);
      return d.toISOString().slice(0, 7);
    };
    // Delta has uploaded figures: ₹12 L last month.
    await fetch(`${MOCK}/rest/v1/startup_financial_months`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: "test-service-role-key", authorization: "Bearer test-service-role-key" },
      body: JSON.stringify([2, 1].map((n, i) => ({ startup_id: ID.delta, month: month(n), revenue_inr_l: 10 + i * 2, mrr_inr_l: 10 + i * 2, expenses_inr_l: 9 }))),
    });

    await asInvestor(page);
    await page.goto("/investor/shared");
    const delta = page.locator("div").filter({ has: page.getByRole("heading", { name: "Demo Delta Retail" }) }).filter({ hasText: "Awaiting your reply" }).last();
    await delta.getByRole("button", { name: "Pass" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("The founder is never told")).toBeVisible();
    await dialog.getByRole("button", { name: "Pass on this deal" }).isDisabled();
    await dialog.getByRole("radio", { name: "Too early on traction" }).click();
    await dialog.getByPlaceholder("e.g. We'd want").fill("Want to see repeat purchase above 40%.");
    await expect(dialog.getByText("Update my thesis:")).toBeVisible();
    await dialog.getByText("Tell me if things change").click();
    await dialog.getByLabel("Target", { exact: true }).selectOption("mrr_l");
    await expect(dialog.getByText("Now: ₹12 L a month.")).toBeVisible();
    await dialog.getByLabel(/Target in/).fill("10");
    await dialog.getByRole("button", { name: "Pass on this deal" }).click();
    await expect(dialog).toHaveCount(0);

    // Saved privately, thesis learned, and the target was already met.
    const pass = (await state("investor_passes")).find((p: any) => p.startup_id === ID.delta);
    expect(pass).toMatchObject({ investor_id: NORTHBRIDGE, reason_category: "traction", reason_text: "Want to see repeat purchase above 40%." });
    // Twice Delta's ARR from its own uploaded figures (₹12 L a month × 12 = ₹144 L), rounded up: the founder's numbers are final.
    expect((await state("investor_thesis")).find((t: any) => t.investor_id === NORTHBRIDGE).min_revenue_inr_l).toBe(290);
    await page.goto("/investor/past-deals");
    await expect(page.getByText("Demo Delta Retail hit your target")).toBeVisible();
    await page.getByRole("button", { name: /Demo Delta Retail/ }).first().click();
    await expect(page.getByText("Too early on traction: Want to see repeat purchase above 40%.")).toBeVisible();
    await page.getByRole("button", { name: "Dismiss" }).first().click();
    await expect(page.getByText("Demo Delta Retail hit your target")).toHaveCount(0);

    // The founder of Delta sees nothing of the reason or the trigger.
    const founder = await browser.newPage();
    await asFounder(founder, ID.delta);
    for (const path of ["/dashboard", "/overview", "/meetings", "/chats", "/financials"]) {
      const html = await pageSource(founder, path);
      expect(html, path).not.toContain("repeat purchase above 40%");
      expect(html, path).not.toContain("hit your target");
      expect(html, path).not.toContain("Too early on traction");
    }
    await founder.close();

    // Put the thesis back for the next tests.
    await page.goto("/investor/matches");
    await page.getByRole("button", { name: /Remove: ARR at least/ }).click();
    await expect(page.getByRole("button", { name: /Remove: ARR at least/ })).toHaveCount(0);
  });
});

test.describe("founder conclusions and admin visibility (2.10, 2.11)", () => {
  test("the founder's past meeting shows its Fireflies conclusion", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/meetings");
    await page.getByRole("tab", { name: /Past/ }).first().click();
    await page.getByRole("button", { name: /Twice Saved Ventures/ }).first().click();
    await expect(page.getByText("Liked the repeat-order numbers")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Send unit economics");
  });

  test("admins see chats, activity, access and unlinked records", async ({ page }) => {
    await asTeam(page);
    await page.goto("/admin/chats");
    await expect(page.getByRole("cell", { name: "Northbridge Demo Fund" }).first()).toBeVisible();
    const alphaThread = (await state("chat_threads")).find((t: any) => t.investor_id === NORTHBRIDGE && t.startup_id === ID.alpha);
    await page.goto(`/admin/chats?thread=${alphaThread.id}`);
    await expect(page.getByRole("link", { name: "Attachment: Term sheet draft.pdf" })).toBeVisible();
    await expect(page.getByText("Could you share the bank-partner contracts?").last()).toBeVisible();

    await page.goto("/admin/activity?portal=investor");
    await expect(page.getByText("Signed in with Google").first()).toBeVisible();

    await page.goto("/admin/portal-access");
    await expect(page.getByRole("cell", { name: /Northbridge Demo Fund/ })).toBeVisible();
    await expect(page.getByText("Unknown Angels")).toBeVisible();
    await expect(page.getByText("An unlinked call summary.")).toBeVisible();

    await page.goto("/admin/meetings?scope=all");
    await expect(page.getByText("Liked the repeat-order numbers").first()).toBeVisible();
  });

  test("revoking access locks the investor out at once", async ({ page, browser }) => {
    const admin = await browser.newPage();
    await asTeam(admin);
    await admin.goto("/admin/portal-access");
    await admin.waitForLoadState("networkidle");
    const posted = admin.waitForResponse((r) => r.request().method() === "POST");
    await admin.getByRole("row", { name: /Northbridge Demo Fund/ }).getByRole("button", { name: "Revoke" }).click();
    expect((await posted).status()).toBe(200);
    expect((await state("investor_portal_access")).find((r: any) => r.investor_id === NORTHBRIDGE).revoked_at).toBeTruthy();
    await admin.reload();
    await expect(admin.getByRole("row", { name: /Northbridge Demo Fund/ }).getByText("revoked")).toBeVisible();

    await googleSignIn(page, GOOGLE.investor);
    await expect(page).toHaveURL(/error=no_access/);

    await admin.waitForLoadState("networkidle");
    await admin.getByRole("row", { name: /Northbridge Demo Fund/ }).getByRole("button", { name: "Re-open" }).click();
    await expect.poll(async () => (await state("investor_portal_access")).find((r: any) => r.investor_id === NORTHBRIDGE).revoked_at).toBeNull();
    await admin.reload();
    await expect(admin.getByRole("row", { name: /Northbridge Demo Fund/ }).getByText("open", { exact: true })).toBeVisible();
    await admin.close();
  });
});

test.describe("one set of data for every portal (26 Nov)", () => {
  test("a founder's save is what founder, investor and admin all see, and goes to the sheet", async ({ page, browser }) => {
    await asFounder(page, ID.alpha);
    await page.goto("/profile");
    await page.locator("#pf-raise_amount").fill("INR 7.5 Cr");
    await page.locator("#pf-stage_code").selectOption("Seed");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Investors and the Sidana team now see these details");

    // Founder overview, investor profile and admin startup page show the same raise.
    await page.goto("/overview");
    await expect(page.getByText("INR 7.5 Cr").first()).toBeVisible();
    const investor = await browser.newPage();
    await asInvestor(investor);
    await investor.goto(`/investor/startup/${ID.alpha}`);
    await expect(investor.getByText("INR 7.5 Cr").first()).toBeVisible();
    await expect(investor.getByText(/Profile written by the founder/)).toBeVisible();
    const admin = await browser.newPage();
    await asTeam(admin);
    await admin.goto(`/admin/startups/${ID.alpha}`);
    await expect(admin.getByText("INR 7.5 Cr").first()).toBeVisible();

    // The change is logged for admins, and copied to the agents' sheet.
    const log = (await state("portal_activity")).filter((r: any) => r.action === "profile_updated" && r.startup_id === ID.alpha).at(-1);
    expect(log.meta.changes).toEqual(expect.arrayContaining([expect.objectContaining({ field: "raise_amount", after: "INR 7.5 Cr" })]));
    await expect
      .poll(async () => ((await state("founder_writebacks")) ?? []).at(-1))
      .toMatchObject({ startup_name: "Demo Alpha Foods", startups: { raise_inr_cr: "INR 7.5 Cr", stage: "Seed" }, profile: { raise_cr: 7.5, stage_code: "SEED" } });
    await investor.close();
    await admin.close();
  });
});

test.describe("phone width (2.14)", () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test("investor pages fit a phone", async ({ page }) => {
    await asInvestor(page);
    for (const path of ["/investor/matches", `/investor/startup/${ID.alpha}`, "/investor/chats", `/investor/chats/${ID.alpha}`, "/investor/meetings", "/investor/past-deals", "/investor/shared"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});
