// Builds and starts the real app for the browser tests, pointed ONLY at the fake
// services. Values set here win over .env.local, and the build goes to its own
// folder so a running dev server is left alone.
import { spawnSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const MOCK = `http://localhost:${process.env.MOCK_PORT ?? 4329}`;
const APP_PORT = process.env.APP_PORT ?? "3100";
const NEXT = path.resolve("node_modules/next/dist/bin/next");

const env = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_DIST_DIR: ".next-test",
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_OPTIONS: "--require ./tests/mock/net-guard.cjs",
  NEXT_PUBLIC_SUPABASE_URL: MOCK,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  ADMIN_BOOTSTRAP_PASSWORD: "test-bootstrap",
  N8N_NOTIFY_SECRET: "test-webhook-secret",
  N8N_BROADCAST_WEBHOOK_URL: `${MOCK}/webhook/broadcast`,
  N8N_CONTACTS_SYNC_WEBHOOK_URL: `${MOCK}/webhook/contacts-sync`,
};

// A stale data cache would hide changes between runs.
rmSync(".next-test/cache", { recursive: true, force: true });
rmSync(".next-test/net-guard.log", { force: true });

if (!process.env.SKIP_BUILD) {
  const built = spawnSync(process.execPath, [NEXT, "build"], { env, stdio: "inherit" });
  if (built.status !== 0) process.exit(built.status ?? 1);
}

const server = spawn(process.execPath, [NEXT, "start", "-p", APP_PORT], { env, stdio: "inherit" });
const stop = () => server.kill();
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
server.on("exit", (code) => process.exit(code ?? 0));
