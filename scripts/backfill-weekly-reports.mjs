// Backfill the current week's rows into public.weekly_reports — RUN MANUALLY.
//   npm run backfill:weekly            # dry run: fetch + show what would be written
//   npm run backfill:weekly -- --apply # upsert the rows into Supabase
//
// This calls the weekly workflow's PREVIEW webhook (no emails sent, no workflow
// Supabase write — the preview branch never touches the write branch), derives
// the same rows the live run would persist, resolves each startup_id from
// public.startups, and upserts them into public.weekly_reports (merge on
// startup_key,week_start). It never modifies any other table. The table must
// already exist (run MIGRATIONS/weekly-reports.sql first).

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const PREVIEW_URL =
  "https://sidanaventures.app.n8n.cloud/webhook/weekly-founder-report-preview-8c2e";
const APPLY = process.argv.includes("--apply");

const admin = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const norm = (v) =>
  String(v == null ? "" : v)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const num = (x) => {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
};
const arr = (x) => (Array.isArray(x) ? x : []);

async function main() {
  // 1. Preview run (no emails, no writes) → report + summary items
  console.log("Fetching preview run from the weekly workflow…");
  const res = await fetch(PREVIEW_URL);
  if (!res.ok) throw new Error(`Preview webhook HTTP ${res.status}`);
  const items = await res.json();
  if (!Array.isArray(items)) throw new Error("Preview did not return an array");

  // "report" = emailed to the founder; "record" = quiet week, saved for the
  // dashboard only (the workflow never emails these).
  const reports = items.filter((r) => r && (r.kind === "report" || r.kind === "record"));
  const summary = items.find((r) => r && r.kind === "summary");

  // 2. Reporting window — prefer the summary's exact window, else compute Mon–Fri
  let weekStart = null;
  let weekEnd = null;
  if (summary && typeof summary.window === "string" && summary.window.includes("..")) {
    const [a, b] = summary.window.split("..").map((s) => s.trim());
    weekStart = a || null;
    weekEnd = b || null;
  }
  if (!weekStart) {
    const now = new Date();
    const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
    const dow = ist.getUTCDay(); // 0=Sun..6=Sat
    const back = ((dow - 5 + 7) % 7) || 7; // days back to the most recent Friday
    const end = new Date(ist.getTime() - back * 86400000);
    const start = new Date(end.getTime() - 4 * 86400000);
    const iso = (d) => d.toISOString().slice(0, 10);
    weekStart = iso(start);
    weekEnd = iso(end);
  }

  // 3. Resolve startup_id from public.startups (same ids the dashboard uses)
  const { data: startups, error: sErr } = await admin
    .from("startups")
    .select("id,name");
  if (sErr) throw sErr;
  const byKey = {};
  for (const s of startups ?? []) {
    const k = norm(s.name);
    if (k && byKey[k] === undefined) byKey[k] = s.id;
  }

  // 4. Build rows
  const seen = {};
  const rows = [];
  for (const r of reports) {
    const key = norm(r.startup);
    if (!key) continue;
    const dedupe = key + "|" + weekStart;
    if (seen[dedupe]) continue;
    seen[dedupe] = 1;
    const sid = byKey[key];
    rows.push({
      startup_id: sid === undefined ? null : sid,
      startup_key: key,
      startup_name: r.startup || null,
      week_start: weekStart,
      week_end: weekEnd,
      owner_name: r.owner || null,
      founder_name: r.founder_name || null,
      reached: num(r.reached),
      followups: num(r.followups),
      passed: num(r.passed),
      meetings: num(r.meetings),
      feedback_count: num(r.feedback),
      meeting_list: arr(r.meeting_list),
      passed_list: arr(r.passed_list),
      feedback_list: arr(r.feedback_list),
      subject: r.subject || null,
      report_html: null, // preview carries no HTML; live runs fill this going forward
      sent_to: r.kind === "record" ? null : r.to || null,
      source: r.kind === "record" ? "backfill-dashboard-only" : "backfill-preview",
    });
  }

  const unresolved = rows.filter((x) => x.startup_id == null).map((x) => x.startup_name);
  console.log(`\nWeek: ${weekStart} .. ${weekEnd}`);
  console.log(`Report items from preview: ${reports.length}`);
  console.log(`Rows to upsert: ${rows.length}`);
  console.log(`startup_id resolved: ${rows.length - unresolved.length}/${rows.length}`);
  if (unresolved.length) {
    console.log(`Unresolved (will store by startup_key only): ${unresolved.join(", ")}`);
  }
  console.log(
    rows
      .map((x) => `  • ${x.startup_name} — reached ${x.reached}, meetings ${x.meetings}, passed ${x.passed}`)
      .join("\n"),
  );

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to upsert.");
    return;
  }
  if (!rows.length) {
    console.log("\nNo rows to write.");
    return;
  }

  const { error: uErr, count } = await admin
    .from("weekly_reports")
    .upsert(rows, { onConflict: "startup_key,week_start", count: "exact" });
  if (uErr) throw uErr;
  console.log(`\nUpserted ${count ?? rows.length} row(s) into weekly_reports.`);
}

main().catch((e) => {
  console.error("\nFailed:", e.message || e);
  process.exit(1);
});
