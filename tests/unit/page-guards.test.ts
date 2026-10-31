import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function pagesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pagesUnder(full);
    return entry.name === "page.tsx" ? [full] : [];
  });
}

// A layout's check doesn't stop its page's data being sent, so each page needs its own.
// This also catches a new page that isn't in the browser tests' list yet.
describe.each([
  ["src/app/admin", "requireAdmin"],
  ["src/app/(founder)", "requireFounder"],
])("pages in %s", (dir, guard) => {
  const pages = pagesUnder(dir);

  it("exist", () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(pages)(`%s calls ${guard}() before anything else it waits for`, (file) => {
    const source = readFileSync(file, "utf8");
    const body = source.slice(source.indexOf("export default async function"));
    const firstAwait = body.match(/await\s+[\w.]+\(?/)?.[0];
    expect(firstAwait, `${file} must start with await ${guard}()`).toBe(`await ${guard}(`);
  });
});
