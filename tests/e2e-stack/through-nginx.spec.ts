import { asFounder, expect, ID, test } from "../e2e/helpers";

// Runs in CI against the real image behind real nginx and HTTPS. It covers what only
// breaks behind a proxy: server actions check Origin against the forwarded host, and
// secure cookies need the forwarded protocol to be right.
test("a founder can sign in, read pages and save through nginx", async ({ page, context }) => {
  await asFounder(page, ID.alpha);

  const session = (await context.cookies()).find((c) => c.name.includes("auth-token"));
  expect(session, "session cookie").toBeTruthy();

  await page.goto("/weekly-reports");
  await expect(page.getByRole("heading", { name: "Weekly Reports" })).toBeVisible();

  await page.goto("/complete-profile");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toBeVisible();
});
