// Reset every founder login to its initial password — RUN MANUALLY, dry by default.
//   npm run reset:founders            # dry run: show what would change
//   npm run reset:founders -- --apply # reset passwords, create missing logins
//
// For each platform startup:
//   * founder login exists  -> password set to the initial password and the
//                              founder must choose their own on first sign-in;
//   * no founder login yet   -> one is created (Auth user + app_users row).
// Writes the full list (login ID, sign-in emails on file, password) to the
// git-ignored founder-credentials.local.csv. Never changes startup data.

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { founderAuthEmail, initialFounderPassword } from "./lib/founder-credentials.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const APPLY = process.argv.includes("--apply");
const admin = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function listAllAuthUsers() {
  const all = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...(data?.users ?? []));
    if ((data?.users ?? []).length < 1000) return all;
  }
}

async function main() {
  const [startupsRes, foundersRes, contactsRes, authUsers] = await Promise.all([
    admin.from("startups").select("id,name").order("id"),
    admin.from("app_users").select("id,startup_id").eq("role", "founder"),
    admin.from("startup_contacts").select("startup_id,email").order("id"),
    listAllAuthUsers(),
  ]);
  for (const r of [startupsRes, foundersRes, contactsRes]) if (r.error) throw r.error;

  const authById = new Map(authUsers.map((u) => [u.id, u]));
  const foundersByStartup = new Map();
  for (const f of foundersRes.data) {
    if (!foundersByStartup.has(f.startup_id)) foundersByStartup.set(f.startup_id, []);
    foundersByStartup.get(f.startup_id).push(f);
  }
  const emailsByStartup = new Map();
  for (const c of contactsRes.data) {
    if (!emailsByStartup.has(c.startup_id)) emailsByStartup.set(c.startup_id, []);
    emailsByStartup.get(c.startup_id).push(c.email);
  }

  const rows = [];
  let reset = 0, created = 0;
  const problems = [];

  for (const s of startupsRes.data) {
    const password = initialFounderPassword(s.id, s.name);
    if (password.length < 6) { problems.push(`#${s.id} ${s.name}: password too short`); continue; }
    const accounts = foundersByStartup.get(s.id) ?? [];

    if (accounts.length) {
      // Every founder login for this startup must take the new password before
      // its row goes into the CSV — otherwise a founder would be handed a
      // password that was never set.
      let allSet = true;
      for (const a of accounts) {
        const au = authById.get(a.id);
        if (!au) { problems.push(`#${s.id} ${s.name}: app_users row has no auth user`); allSet = false; continue; }
        if (APPLY) {
          const { error } = await admin.auth.admin.updateUserById(a.id, {
            password,
            app_metadata: { ...(au.app_metadata ?? {}), must_reset: true },
          });
          if (error) { problems.push(`#${s.id} ${s.name}: ${error.message}`); allSet = false; continue; }
        }
        reset++;
      }
      if (!allSet) continue;
    } else {
      if (APPLY) {
        const email = founderAuthEmail(s.id);
        const { data: au, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role: "founder", startup_id: s.id },
          app_metadata: { must_reset: true },
        });
        if (error) { problems.push(`#${s.id} ${s.name}: create failed — ${error.message}`); continue; }
        const { error: insErr } = await admin.from("app_users").insert({
          id: au.user.id,
          email,
          full_name: s.name ?? `Startup ${s.id}`,
          role: "founder",
          startup_id: s.id,
          active: true,
        });
        if (insErr) {
          // Roll back the new Auth user so a later run can create this login
          // again (its synthetic email would otherwise already be taken).
          const { error: delErr } = await admin.auth.admin.deleteUser(au.user.id);
          problems.push(
            `#${s.id} ${s.name}: app_users insert failed — ${insErr.message}` +
              (delErr
                ? ` (removing the new Auth user ${au.user.id} also failed: ${delErr.message} — delete it manually)`
                : " (new Auth user removed; safe to re-run)"),
          );
          continue;
        }
      }
      created++;
    }

    rows.push([s.id, s.name, s.id, (emailsByStartup.get(s.id) ?? []).join("; "), password, "yes"]);
  }

  console.log(`${APPLY ? "" : "[DRY RUN] "}founder logins reset: ${reset}, created: ${created}`);
  console.log(`startups with no email on file (sign in with Login ID): ${rows.filter((r) => !r[3]).map((r) => r[1]).join(", ") || "none"}`);
  // Check every password's format without printing any of them.
  const badFormat = rows
    .filter((r) => !new RegExp(`^[A-Za-z0-9]+-${r[0]}$`).test(r[4]))
    .map((r) => r[1]);
  console.log(
    `format check: ${rows.length - badFormat.length}/${rows.length} passwords are <letters/numbers>-<id>` +
      (badFormat.length ? ` — unexpected for: ${badFormat.join(", ")}` : ""),
  );
  if (problems.length) {
    process.exitCode = 1;
    console.log(
      `RUN INCOMPLETE — ${problems.length} problem(s); the affected startups are left out of the CSV:\n  ` +
        problems.join("\n  "),
    );
  }

  if (APPLY) {
    const csv = [
      "startup_id,startup_name,login_id,sign_in_emails,password,must_change_on_first_login",
      ...rows.map((r) => r.map(csvCell).join(",")),
    ].join("\n");
    writeFileSync("founder-credentials.local.csv", csv);
    console.log(`Wrote ${rows.length} rows to founder-credentials.local.csv (git-ignored).`);
  } else {
    console.log("Nothing changed. Re-run with -- --apply.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
