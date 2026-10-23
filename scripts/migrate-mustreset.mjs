// One-time migration: move the must_reset flag from user_metadata (which the
// user can write via supabase.auth.updateUser) into app_metadata (service-role
// only). After this runs, auth.ts reads app_metadata.must_reset authoritatively.
//   npm run migrate:mustreset            # dry run: report what would change
//   npm run migrate:mustreset -- --apply # write app_metadata, strip user_metadata copy
//
// Idempotent and reversible-in-effect: it only mirrors the current flag state
// into app_metadata and removes the duplicate from user_metadata. Never changes
// passwords or any other data.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const APPLY = process.argv.includes("--apply");
const admin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  let page = 1;
  let changed = 0;
  let scanned = 0;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users ?? [];
    if (!users.length) break;
    for (const u of users) {
      scanned++;
      const um = u.user_metadata ?? {};
      const am = u.app_metadata ?? {};
      const needs = am.must_reset === true || um.must_reset === true;
      const alreadyCorrect =
        am.must_reset === needs && !(("must_reset") in um);
      if (alreadyCorrect) continue;
      changed++;
      const newUm = { ...um };
      delete newUm.must_reset;
      if (!APPLY) {
        console.log(`would update ${u.email}: app_metadata.must_reset=${needs}, strip user_metadata.must_reset`);
        continue;
      }
      const { error: upErr } = await admin.auth.admin.updateUserById(u.id, {
        app_metadata: { ...am, must_reset: needs },
        user_metadata: newUm,
      });
      if (upErr) console.error(`update failed ${u.email}: ${upErr.message}`);
      else console.log(`updated ${u.email}: must_reset=${needs}`);
    }
    if (users.length < 1000) break;
    page++;
  }
  console.log(`\nScanned ${scanned} users; ${changed} ${APPLY ? "updated" : "would be updated"}.`);
  if (!APPLY) console.log("DRY RUN — re-run with --apply to write.");
}

main().catch((e) => {
  console.error("\nFailed:", e.message || e);
  process.exit(1);
});
