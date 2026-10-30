import { defineConfig } from "@playwright/test";

const MOCK_PORT = 4329;
const APP_PORT = 3100;

// Tests share one fake database and a server-side data cache, so they run in order.
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    // Uses the Chrome already on this machine, in a throwaway profile.
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `MOCK_PORT=${MOCK_PORT} node tests/mock/server.mjs`,
      url: `http://localhost:${MOCK_PORT}/__health`,
      reuseExistingServer: false,
    },
    {
      command: `MOCK_PORT=${MOCK_PORT} APP_PORT=${APP_PORT} node tests/mock/run-app.mjs`,
      url: `http://localhost:${APP_PORT}/`,
      timeout: 300_000,
      reuseExistingServer: false,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
