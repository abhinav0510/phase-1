// Load the Sidana team's startup details into public.startup_profile_prefill — RUN MANUALLY.
//   npm run import:prefill -- <path to .xlsx>           # dry run: match and show what would be written
//   npm run import:prefill -- <path to .xlsx> --apply   # upsert the rows into Supabase
//
// Each row is matched to public.startups by company name. Complete Profile then shows
// these values in questions the founder hasn't answered; blank cells stay blank for the
// founder to fill. This writes ONLY startup_profile_prefill: founders' own answers
// (startup_profiles), public.startups and the Pilot sheet are never touched.
// Run MIGRATIONS/startup-profile-prefill.sql first.
//
// The spreadsheet holds founders' names: keep it out of this repository.

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { readXlsxRows, rowToAnswers } from "./lib/profile-prefill.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!file) {
  console.error("Usage: npm run import:prefill -- <path to .xlsx> [--apply]");
  process.exit(1);
}
const APPLY = process.argv.includes("--apply");

const admin = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const norm = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function main() {
  const [header, ...rows] = readXlsxRows(readFileSync(file));
  if (!header?.includes("Company Name")) throw new Error('The first row must have a "Company Name" column');
  const parsed = rows.map((r) => ({ ...rowToAnswers(header, r), sectorText: String(r[header.indexOf("Sector")] ?? "").trim() }))
    .filter((r) => r.name);

  const { data: startups, error } = await admin.from("startups").select("id,name");
  if (error) throw new Error(`Could not read startups: ${error.message}`);
  const byName = new Map();
  for (const s of startups ?? []) {
    const k = norm(s.name);
    byName.set(k, byName.has(k) ? null : s.id); // two startups with one name: don't guess
  }

  const matched = [];
  const unmatched = [];
  const ambiguous = [];
  for (const r of parsed) {
    const id = byName.get(norm(r.name));
    if (id === undefined) unmatched.push(r.name);
    else if (id === null) ambiguous.push(r.name);
    else matched.push({ startup_id: id, ...r });
  }

  const counts = {};
  for (const m of matched) for (const k of Object.keys(m.answers)) counts[k] = (counts[k] ?? 0) + 1;
  console.log(`Rows: ${parsed.length}. Matched to a startup: ${matched.length}.`);
  if (unmatched.length) console.log(`No startup with this name (skipped): ${unmatched.join(", ")}`);
  if (ambiguous.length) console.log(`More than one startup with this name (skipped): ${ambiguous.join(", ")}`);
  console.log("Answers per question:", counts);
  const noSector = matched.filter((m) => m.sectorText && !m.answers.sector).map((m) => `${m.name} ("${m.sectorText}")`);
  if (noSector.length) console.log(`Sector left empty, as it fits none of the form's choices: ${noSector.join("; ")}`);

  if (!APPLY) {
    console.log("\nDry run: nothing written. Add --apply to save these rows.");
    return;
  }
  const now = new Date().toISOString();
  const { error: upErr } = await admin.from("startup_profile_prefill").upsert(
    matched.map((m) => ({ startup_id: m.startup_id, answers: m.answers, source: basename(file), imported_at: now })),
    { onConflict: "startup_id" },
  );
  if (upErr) throw new Error(`Could not save: ${upErr.message}`);
  console.log(`\nSaved ${matched.length} startups' details to startup_profile_prefill.`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
