// Founder account provisioning — RUN MANUALLY, never automatically.
//   npm run provision:founders
//
// For every startup that has no linked founder account yet, this:
//   1. creates a Supabase Auth user  (email = s<id>@founders.sidana.local)
//   2. inserts an app_users row       (role 'founder', linked to the startup)
// It is ADDITIVE and IDEMPOTENT: existing startups/investors/rows are never
// modified or deleted, and startups that already have an account are skipped.
//
// The initial password is a one-time password; founders must change it on
// first login. Credentials are written to a local, git-ignored CSV so Sidana
// can distribute them — they are not printed in full.
// To reset ALL founder logins (and create missing ones) in one go, use
// `npm run reset:founders` instead, which writes the complete CSV.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import {
  founderAuthEmail as founderEmail,
  initialFounderPassword as activationPassword,
} from "./lib/founder-credentials.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

const admin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: startups, error: sErr } = await admin
    .from("startups")
    .select("id,name,owner_name")
    .order("id", { ascending: true });
  if (sErr) throw sErr;

  const { data: existing, error: uErr } = await admin
    .from("app_users")
    .select("startup_id")
    .eq("role", "founder");
  if (uErr) throw uErr;
  const hasAccount = new Set((existing ?? []).map((u) => u.startup_id));

  const created = [];
  let skipped = 0;

  for (const s of startups ?? []) {
    if (hasAccount.has(s.id)) {
      skipped++;
      continue;
    }
    const email = founderEmail(s.id);
    const password = activationPassword(s.id, s.name);

    if (DRY_RUN) {
      created.push({ startup_id: s.id, name: s.name, email, password: "(dry-run)" });
      continue;
    }

    const { data: authUser, error: aErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "founder", startup_id: s.id },
      // must_reset lives in app_metadata (service-role only) so the founder
      // cannot clear it client-side to keep the one-time activation password.
      app_metadata: { must_reset: true },
    });
    if (aErr) {
      console.error(`startup ${s.id}: auth create failed — ${aErr.message}`);
      continue;
    }
    const { error: insErr } = await admin.from("app_users").insert({
      id: authUser.user.id,
      email,
      full_name: s.name ?? `Startup ${s.id}`, // the company; owner_name is the Sidana deal owner, not the founder
      role: "founder",
      startup_id: s.id,
      active: true,
    });
    if (insErr) {
      // Roll back the new Auth user so a later run can create this login again
      // (its synthetic email would otherwise already be taken).
      const { error: delErr } = await admin.auth.admin.deleteUser(authUser.user.id);
      console.error(
        `startup ${s.id}: app_users insert failed — ${insErr.message}` +
          (delErr
            ? ` (removing the new Auth user ${authUser.user.id} also failed: ${delErr.message} — delete it manually)`
            : " (new Auth user removed; safe to re-run)"),
      );
      continue;
    }
    created.push({ startup_id: s.id, name: s.name, email, password });
  }

  if (created.length) {
    const csv = [
      "startup_id,name,login_id,login_email,activation_password",
      ...created.map(
        (c) =>
          `${c.startup_id},"${(c.name ?? "").replace(/"/g, "'")}",${c.startup_id},${c.email},${c.password}`,
      ),
    ].join("\n");
    writeFileSync("founder-credentials.local.csv", csv);
  }

  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}created ${created.length}, skipped ${skipped} (already had accounts).`,
  );
  if (created.length && !DRY_RUN) {
    console.log("Credentials written to founder-credentials.local.csv (git-ignored).");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
