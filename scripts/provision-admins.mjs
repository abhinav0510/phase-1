// Admin bootstrap — RUN MANUALLY, dry by default.
//   npm run provision:admins            # report only (safe)
//   npm run provision:admins -- --apply # set the bootstrap password
//
// Sets the Phase-1 bootstrap password (Sidana2026) on EXISTING admin/ops auth
// accounts (the app_users rows whose role is owner/ops/deals_desk/angel_desk and
// whose id already matches a Supabase Auth user). It never creates or deletes
// users and never touches founder or investor accounts. Each admin is flagged
// must_reset so they are prompted to set their own password.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ADMIN_ROLES = ["owner", "ops", "deals_desk", "angel_desk"];
const BOOTSTRAP_PASSWORD = "Sidana2026";
const APPLY = process.argv.includes("--apply");

const admin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data: users, error } = await admin
    .from("app_users")
    .select("id,email,full_name,role,active")
    .in("role", ADMIN_ROLES);
  if (error) throw error;

  for (const u of users ?? []) {
    const { data: found } = await admin.auth.admin.getUserById(u.id);
    const exists = !!found?.user;
    if (!exists) {
      console.log(`- ${u.email ?? u.id} (${u.role}): NO matching auth user — skipped (create via Supabase dashboard).`);
      continue;
    }
    if (!APPLY) {
      console.log(`- ${u.email ?? u.id} (${u.role}): auth user OK (dry-run; would set bootstrap password).`);
      continue;
    }
    const { error: upErr } = await admin.auth.admin.updateUserById(u.id, {
      password: BOOTSTRAP_PASSWORD,
      user_metadata: { ...(found.user.user_metadata ?? {}), must_reset: true },
    });
    if (upErr) {
      console.error(`- ${u.email ?? u.id}: update failed — ${upErr.message}`);
    } else {
      console.log(`- ${u.email ?? u.id} (${u.role}): bootstrap password set.`);
    }
  }
  console.log(APPLY ? "Done." : "Dry run only. Re-run with -- --apply to set passwords.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
