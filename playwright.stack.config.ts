import { defineConfig } from "@playwright/test";

// Used by CI once the production stack is running. See .github/workflows/ci.yml.
export default defineConfig({
  testDir: "tests/e2e-stack",
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: process.env.STACK_URL ?? "https://localhost:8443",
    ignoreHTTPSErrors: true,
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
});
