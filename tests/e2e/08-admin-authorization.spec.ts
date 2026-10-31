import type { APIRequestContext, Page } from "@playwright/test";
import { asFounder, asTeam, BETA_SECRET, expect, ID, INVESTOR_CONTACTS, loginTeam, MOCK, restoreUser, test } from "./helpers";

// A browser follows a redirect and never shows what came with it, so checking the final
// address can't catch a leak. These tests read the raw response body of every admin page.
// `proof` is text that only appears once that page has really loaded its data.
const ADMIN_PAGES: { path: string; proof?: string }[] = [
  { path: "/admin", proof: "Startups by status" },
  { path: "/admin/investors", proof: "Demo Capital" },
  { path: "/admin/startups", proof: "Demo Beta Labs" },
  { path: `/admin/startups/${ID.beta}`, proof: BETA_SECRET },
  { path: "/admin/users", proof: "Founder account provisioning" },
  { path: "/admin/meetings", proof: "Demo Capital" },
  { path: "/admin/matches", proof: "Total matches" },
  { path: "/admin/documents", proof: "Document verification queue" },
  { path: "/admin/reports", proof: "Investors by type" },
  { path: "/admin/profiles", proof: "Founder profile reviews" },
  { path: `/admin/profiles/${ID.epsilon}`, proof: "Demo fintech one-liner" },
  { path: "/admin/notifications" },
  { path: "/admin/notifications/1" },
  { path: "/admin/announcements", proof: "Demo inactive announcement" },
  { path: "/admin/settings" },
];

const FORBIDDEN = [
  ...new Set(ADMIN_PAGES.flatMap((p) => (p.proof ? [p.proof] : []))),
  ...INVESTOR_CONTACTS,
  "team@sidana.test",
];

/** A router state saying another admin page is on screen, so Next.js skips rendering the admin layout. */
const insideAdminLayout = (path: string) => {
  const sibling = path.startsWith("/admin/investors") ? "meetings" : "investors";
  return encodeURIComponent(
    JSON.stringify(["", { children: ["admin", { children: [sibling, { children: ["__PAGE__", {}] }] }] }, null, null, true]),
  );
};

const REQUESTS: { name: string; headers: (path: string) => Record<string, string> }[] = [
  { name: "page load", headers: () => ({}) },
  { name: "client navigation", headers: () => ({ RSC: "1" }) },
  { name: "prefetch", headers: () => ({ RSC: "1", "Next-Router-Prefetch": "1" }) },
  { name: "layout skipped", headers: (path) => ({ RSC: "1", "Next-Router-State-Tree": insideAdminLayout(path) }) },
];

const get = (request: APIRequestContext, path: string, headers: Record<string, string>) =>
  request.get(path, { headers, maxRedirects: 0 });

async function expectNoAdminData(page: Page) {
  for (const { path } of ADMIN_PAGES) {
    for (const { name, headers } of REQUESTS) {
      const res = await get(page.request, path, headers(path));
      const body = await res.text();
      for (const text of FORBIDDEN) {
        expect(body.includes(text), `${path} (${name}, status ${res.status()}) contains "${text}"`).toBe(false);
      }
    }
    const plain = await get(page.request, path, {});
    expect(plain.status(), `${path} must redirect`).toBe(307);
  }
}

async function userIdFor(email: string): Promise<string> {
  const users = await (await fetch(`${MOCK}/__users`)).json();
  return users.find((u: { email: string }) => u.email === email).id;
}

async function setRole(email: string, role: string | null) {
  const res = await fetch(`${MOCK}/rest/v1/app_users?id=eq.${await userIdFor(email)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role }),
  });
  expect(res.ok).toBe(true);
}

async function setMustReset(email: string) {
  const res = await fetch(`${MOCK}/auth/v1/admin/users/${await userIdFor(email)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_metadata: { must_reset: true } }),
  });
  expect(res.ok).toBe(true);
}

const ZETA_EMAIL = `s${ID.zeta}@founders.sidana.local`;

test.describe("admin data never reaches anyone but the team", () => {
  test.describe.configure({ timeout: 180_000 });

  test("the team receives it, so these checks can detect a leak", async ({ page }) => {
    await asTeam(page);
    for (const { path, proof } of ADMIN_PAGES) {
      if (!proof) continue;
      for (const name of ["page load", "layout skipped"]) {
        const { headers } = REQUESTS.find((r) => r.name === name)!;
        const body = await (await get(page.request, path, headers(path))).text();
        expect(body.includes(proof), `${path} (${name}) should contain "${proof}"`).toBe(true);
      }
    }
  });

  test("a founder", async ({ page }) => {
    await asFounder(page, ID.alpha);
    await expectNoAdminData(page);
  });

  test("a founder who must still change their password", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await setMustReset(ZETA_EMAIL);
    try {
      await expectNoAdminData(page);
    } finally {
      await restoreUser(ZETA_EMAIL);
    }
  });

  for (const role of ["investor", null]) {
    test(`an account with ${role ? `the ${role} role` : "no role"}`, async ({ page }) => {
      await asFounder(page, ID.zeta);
      await setRole(ZETA_EMAIL, role);
      try {
        await expectNoAdminData(page);
      } finally {
        await setRole(ZETA_EMAIL, "founder");
      }
    });
  }

  test("a deactivated team member", async ({ page }) => {
    await loginTeam(page, "inactive@sidana.test");
    await expect(page).toHaveURL(/error=inactive/);
    await expectNoAdminData(page);
  });

  test("a team member who must still change their password", async ({ page }) => {
    await asTeam(page);
    await setMustReset("team@sidana.test");
    try {
      await expectNoAdminData(page);
    } finally {
      await restoreUser("team@sidana.test");
    }
  });

  test("someone signed out", async ({ page }) => {
    await expectNoAdminData(page);
  });
});
