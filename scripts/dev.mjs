// `npm run dev`: the app on fake Supabase and n8n, with demo data that vanishes when it stops.
// Values set here win over .env.local, and the network guard stops the app reaching anything
// but this machine, so nothing done here can touch real data or send a real email.
import { spawn } from "node:child_process";
import path from "node:path";

const PORT = process.env.PORT ?? "3000";
const MOCK_PORT = process.env.MOCK_PORT ?? "4330";
const MOCK = `http://localhost:${MOCK_PORT}`;
const NEXT = path.resolve("node_modules/next/dist/bin/next");

const env = {
  ...process.env,
  NODE_ENV: "development",
  // Kept apart from .next so an old data cache can't show real data.
  NEXT_DIST_DIR: ".next-dev",
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

console.log(`
  Sidana portal on FAKE services. Real Supabase, n8n and email can't be reached.

  App      http://localhost:${PORT}
  Founder  /login     Login ID 101, password demo-password-1
  Team     /teamonly  team@sidana.test, password demo-password-1

  Data resets each time this starts.
`);

const mock = spawn(process.execPath, ["tests/mock/server.mjs"], {
  env: { ...process.env, MOCK_PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
const app = spawn(process.execPath, [NEXT, "dev", "-p", PORT], { env, stdio: "inherit" });

const stop = () => {
  app.kill();
  mock.kill();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
mock.on("exit", (code) => {
  if (code) console.error(`The fake services stopped (exit ${code}). Is port ${MOCK_PORT} in use?`);
  app.kill();
});
app.on("exit", (code) => {
  mock.kill();
  process.exit(code ?? 0);
});
