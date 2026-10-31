import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const importsOf = (file: string) =>
  [...readFileSync(file, "utf8").matchAll(/(?:from\s+|import\s*\(\s*|^import\s+)["']([^"']+)["']/gm)].map((m) => m[1]);

function violations(dir: string, forbidden: RegExp): string[] {
  return sourceFiles(dir).flatMap((file) =>
    importsOf(file)
      .filter((spec) => forbidden.test(spec))
      .map((spec) => `${file} imports ${spec}`),
  );
}

describe("client, server and shared boundaries", () => {
  it("shared code imports neither client nor server code", () => {
    expect(violations("src/shared", /^@\/(client|server|app)\//)).toEqual([]);
  });

  it("client code never imports server code, even for types", () => {
    expect(violations("src/client", /^@\/server\//)).toEqual([]);
  });

  it("server code never imports client or page code", () => {
    expect(violations("src/server", /^@\/(client|app)\//)).toEqual([]);
  });

  it('no "use client" file imports server code', () => {
    const files = sourceFiles("src").filter((f) => /^\s*["']use client["']/.test(readFileSync(f, "utf8")));
    expect(files.length).toBeGreaterThan(0);
    const bad = files.flatMap((f) => importsOf(f).filter((s) => s.startsWith("@/server/")).map((s) => `${f} imports ${s}`));
    expect(bad).toEqual([]);
  });

  // The Edge middleware also uses resilient-fetch, which holds no secrets.
  const EDGE_SAFE = new Set([path.join("src", "server", "integrations", "supabase", "resilient-fetch.ts")]);

  it("server modules can't be bundled for the browser", () => {
    const unmarked = sourceFiles("src/server").filter(
      (f) => !EDGE_SAFE.has(f) && !/^import "server-only";/m.test(readFileSync(f, "utf8")),
    );
    expect(unmarked).toEqual([]);
  });

  it("the old folders stay gone", () => {
    expect(existsSync("src/lib")).toBe(false);
    expect(existsSync("src/components")).toBe(false);
  });
});
