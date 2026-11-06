// Put chosen founder logins back to a fresh start — RUN MANUALLY, dry by default.
//   npm run reset:test-founders -- --only=123,124            # dry run: show what would change
//   npm run reset:test-founders -- --only=123,124 --apply    # do it
//   npm run reset:test-founders -- --find=bon                # look up Login IDs by name (read-only)
//
// For each startup named in --only (and no other):
//   * every founder login gets the initial password and must choose its own on first
//     sign-in, exactly as scripts/reset-founder-passwords.mjs sets up every founder;
//   * what the founder entered in the portal is removed, so they start like everyone
//     else: profile answers (startup_profiles), uploaded monthly and yearly figures
//     (startup_financial_months / _years), uploaded files (startup_mis_files and the
//     'startup-mis' bucket) and the logo (startup_branding and the 'startup-logos' bucket).
// Never touches public.startups, matches, meetings, decks or anything the agents write.
// The new passwords go to the git-ignored founder-credentials.test-accounts.local.csv,
// never to the screen.
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { initialFounderPassword } from "./lib/founder-credentials.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const admin = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const findArg = process.argv.find((a) => a.startsWith("--find="));
if (findArg) {
  const q = findArg.slice(7).trim();
  const { data, error } = await admin.from("startups").select("id,name").ilike("name", `%${q.replace(/[%_]/g, "")}%`).order("name").limit(50);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(data.length ? data.map((s) => `  ${s.id}  ${s.name}`).join("\n") : `No startup name contains "${q}".`);
  process.exit(0);
}

const APPLY = process.argv.includes("--apply");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const IDS = [...new Set((onlyArg?.slice(7) ?? "").split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0))];
if (!IDS.length) {
  console.error("Name the startups to reset, e.g. --only=123,124 (their Login IDs), or look them up with --find=<part of the name>.");
  process.exit(1);
}
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const problems = [];
const must = (res, what) => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
};

async function rowsFor(table, cols, id) {
  const res = await admin.from(table).select(cols).eq("startup_id", id);
  // A table that was never created just means there is nothing to clear.
  if (res.error && /PGRST205|42P01|does not exist|schema cache/i.test(`${res.error.code} ${res.error.message}`)) return [];
  return must(res, `read ${table}`) ?? [];
}

async function main() {
  const startups = must(await admin.from("startups").select("id,name").in("id", IDS), "read startups");
  const missing = IDS.filter((id) => !startups.some((s) => s.id === id));
  if (missing.length) {
    console.error(`No startup with id ${missing.join(", ")}. Nothing changed.`);
    process.exit(1);
  }
  const founders = must(await admin.from("app_users").select("id,startup_id").eq("role", "founder").in("startup_id", IDS), "read app_users");
  const csv = [];

  for (const s of startups) {
    console.log(`\n#${s.id} ${s.name}`);
    const accounts = founders.filter((f) => f.startup_id === s.id);
    const password = initialFounderPassword(s.id, s.name);

    // 1. Logins back to the initial password, to be changed on first sign-in.
    if (!accounts.length) problems.push(`#${s.id}: no founder login (run reset:founders to create one)`);
    let allSet = accounts.length > 0;
    for (const a of accounts) {
      const got = await admin.auth.admin.getUserById(a.id);
      if (got.error || !got.data?.user) {
        problems.push(`#${s.id}: app_users row ${a.id} has no auth user`);
        allSet = false;
        continue;
      }
      console.log(`  login ${got.data.user.email}: initial password, must change on first sign-in`);
      if (APPLY) {
        const { error } = await admin.auth.admin.updateUserById(a.id, {
          password,
          app_metadata: { ...(got.data.user.app_metadata ?? {}), must_reset: true },
        });
        if (error) {
          problems.push(`#${s.id}: ${error.message}`);
          allSet = false;
        }
      }
    }
    if (allSet) csv.push([s.id, s.name, s.id, password]);

    // 2. What the founder entered, so they start again from empty.
    const months = await rowsFor("startup_financial_months", "month", s.id);
    const years = await rowsFor("startup_financial_years", "fy_start", s.id);
    const files = await rowsFor("startup_mis_files", "file_path", s.id);
    const profile = await rowsFor("startup_profiles", "status", s.id);
    const branding = await rowsFor("startup_branding", "logo_path", s.id);
    const logos = branding.map((b) => b.logo_path).filter(Boolean);
    console.log(
      `  remove: ${months.length} months, ${years.length} years of figures, ${files.length} uploaded file(s), ` +
        `${profile.length ? `profile answers (${profile[0].status})` : "no profile answers"}, ${logos.length ? "logo" : "no logo"}`,
    );
    if (!APPLY) continue;

    for (const [table] of [["startup_financial_months"], ["startup_financial_years"], ["startup_mis_files"], ["startup_profiles"], ["startup_branding"]]) {
      const { error } = await admin.from(table).delete().eq("startup_id", s.id);
      if (error && !/PGRST205|42P01/.test(`${error.code}`)) problems.push(`#${s.id}: clear ${table}: ${error.message}`);
    }
    if (files.length) {
      const { error } = await admin.storage.from("startup-mis").remove(files.map((f) => f.file_path));
      if (error) problems.push(`#${s.id}: remove uploaded files: ${error.message}`);
    }
    if (logos.length) {
      const { error } = await admin.storage.from("startup-logos").remove(logos);
      if (error) problems.push(`#${s.id}: remove logo: ${error.message}`);
    }
  }

  if (problems.length) {
    process.exitCode = 1;
    console.log(`\nRUN INCOMPLETE — ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  }
  if (APPLY) {
    const out = "founder-credentials.test-accounts.local.csv";
    writeFileSync(out, ["startup_id,startup_name,login_id,password", ...csv.map((r) => r.map(csvCell).join(","))].join("\n"));
    console.log(`\nDone. Sign-in details for ${csv.length} startup(s) are in ${out} (git-ignored).`);
  } else {
    console.log("\n[DRY RUN] Nothing changed. Re-run with --apply to do it.");
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
