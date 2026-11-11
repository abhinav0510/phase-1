// Copied from n8n DAILY-REPORT (gS9DXz4E3gMzcXYP) "Build" node, 11 Nov 2026: the PIPELINE
// pairing, categorising and month/today totals, with the calendars left out (no events).
// The deal-sharing panel must produce the same numbers from the same rows. Keep this in
// step with the workflow if the team changes how the report counts.
export function referenceReport(P, nowMs) {
  const s = (v) => String(v == null ? "" : v).trim();
  const nz = (x) => s(x).toLowerCase().replace(/[’']/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  const IST = 5.5 * 3600e3;
  const today = new Date(nowMs + IST).toISOString().slice(0, 10);
  const h = P[0].map(s), I = (k) => h.indexOf(k), g = (r, k) => { const i = I(k); return i < 0 ? "" : s(r[i]); };
  const pairs = new Map();
  for (const r of P.slice(1)) {
    if (g(r, "deal_shared") !== "Yes") continue;
    const su = g(r, "startup"), inv = g(r, "investor"); if (!su || !inv) continue;
    const key = nz(su) + "|" + nz(inv.split(/\s+-\s+/)[0]);
    const x = pairs.get(key) || { su, inv, owner: g(r, "owner"), date: g(r, "date_shared"), last: "", resp: "", status: "", ms: "" };
    for (const c of ["date_shared", "last_contact"]) { const v = g(r, c).slice(0, 10); if (/^\d{4}-\d\d-\d\d$/.test(v) && v > x.last) x.last = v; }
    if (g(r, "investor_response")) x.resp = g(r, "investor_response");
    if (g(r, "deal_status")) x.status = g(r, "deal_status");
    if (g(r, "meeting_scheduled")) x.ms = g(r, "meeting_scheduled");
    if (g(r, "next_action")) x.na = g(r, "next_action");
    if (g(r, "date_shared") && (!x.date || g(r, "date_shared") < x.date)) x.date = g(r, "date_shared");
    pairs.set(key, x);
  }
  const rows = [...pairs.values()];
  const sharesToday = P.slice(1).filter((r) => g(r, "deal_shared") === "Yes" && g(r, "date_shared").startsWith(today)).length;
  for (const x of rows) {
    const m = [];
    const both = x.resp + " " + x.status;
    const sheetMeet = (/meeting/i.test(both) && !/request/i.test(both)) || /^yes/i.test(x.ms);
    const R = x.resp, St = x.status;
    if (/^bounced/i.test(R)) x.cat = "bounced";
    else if (m.length || sheetMeet) x.cat = "meeting";
    else if (/^meeting requested/i.test(R) || /^book meeting/i.test(x.na || "") || /(asked|wants|requested).{0,30}(meeting|call)|slots? (sent|shared|requested)/i.test(R)) x.cat = "tobook";
    else if (/^pass/i.test(R) || /^pass|not relevant/i.test(St)) x.cat = "passed";
    else if (/refer|forward/i.test(R) || (!R && /refer/i.test(St))) x.cat = "referred";
    else if (/not active|needs review/i.test(R)) x.cat = "other";
    else if (/intrest|interest|question|asked|request|reviewing|under review|deck|document|form|excel|positive|call|evaluat/i.test(R) || (!R && /reviewing|question|docs/i.test(St))) x.cat = "interested";
    else if (R) x.cat = "other";
    else x.cat = "none";
  }
  const monthKey = today.slice(0, 7);
  const mrows = rows.filter((x) => s(x.date).slice(0, 7) === monthKey);
  return {
    pairs: rows.map((x) => ({ key: nz(x.su) + "|" + nz(x.inv.split(/\s+-\s+/)[0]), date: x.date, cat: x.cat })),
    T: {
      shares: mrows.length,
      responses: mrows.filter((x) => !["none", "bounced"].includes(x.cat)).length,
      passes: mrows.filter((x) => x.cat === "passed").length,
      tobook: mrows.filter((x) => x.cat === "tobook").length,
      sharesToday,
    },
  };
}
