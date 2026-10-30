import { expect, test as base, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

export const MOCK = "http://localhost:4329";
export const PASSWORD = "demo-password-1";

export const ID = { alpha: 101, beta: 102, gamma: 103, delta: 104, epsilon: 105, zeta: 106, eta: 107 };
export const BETA_SECRET = "BETA-SECRET-MARKER";
export const INVESTOR_CONTACTS = ["hidden.partner@demo-capital.test", "Hidden Partner", "linkedin.com/in/hidden-partner", "98765 43210"];

/** Read a table straight from the fake database. */
export async function state<T = any>(table: string): Promise<T[]> {
  const res = await fetch(`${MOCK}/__state?table=${table}`);
  return res.json();
}
export async function webhooks(): Promise<any[]> {
  return (await fetch(`${MOCK}/__webhooks`)).json();
}
/** Put a demo account back after a test changes its password. */
export async function restoreUser(email: string) {
  const users = await (await fetch(`${MOCK}/__users`)).json();
  const user = users.find((u: any) => u.email === email);
  await fetch(`${MOCK}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: PASSWORD, app_metadata: {} }),
  });
}
export async function failWebhook(name: string, on: boolean) {
  await fetch(`${MOCK}/__fail?webhook=${name}&on=${on ? 1 : 0}`);
}

/**
 * Every test: the browser may only talk to the local app and the fake services, any
 * other request is blocked and recorded, and a page crash fails the test.
 */
export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page, context }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("dialog", (d) => d.accept());
      await context.route("**/*", (route) => {
        const host = new URL(route.request().url()).hostname;
        if (host === "localhost" || host === "fonts.googleapis.com" || host === "fonts.gstatic.com") return route.continue();
        // A real project host must never even be attempted.
        expect(host, "browser tried to reach a real service").not.toMatch(/supabase\.co|n8n\.cloud/);
        return route.abort();
      });
      await use();
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export async function loginFounder(page: Page, id: number | string, password = PASSWORD) {
  await page.goto("/login");
  await page.locator('input[name="loginId"]').fill(String(id));
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function asFounder(page: Page, id: number) {
  await loginFounder(page, id);
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function loginTeam(page: Page, email = "team@sidana.test", password = PASSWORD) {
  await page.goto("/teamonly");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function asTeam(page: Page) {
  await loginTeam(page);
  await expect(page).toHaveURL(/\/admin/);
}

/** All text in the page's source, including data sent to the browser but not displayed. */
export async function pageSource(page: Page, path: string) {
  const res = await page.request.get(path);
  expect(res.status()).toBe(200);
  return res.text();
}

export function netGuardLog(): string {
  try {
    return readFileSync(".next-test/net-guard.log", "utf8");
  } catch {
    return "";
  }
}
