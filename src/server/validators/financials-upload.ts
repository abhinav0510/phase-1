import "server-only";

import { readXlsxSheets } from "./xlsx-reader.mjs";

/**
 * Reads the financials template founders download from the Financials page
 * (scripts/make-financials-template.mjs) and checks every row. Amounts are in ₹ lakh.
 */

export interface MonthRow {
  month: string; // YYYY-MM
  revenue_inr_l: number | null;
  mrr_inr_l: number | null;
  expenses_inr_l: number | null;
}

export interface YearRow {
  fy_start: number; // 2025 for FY 2025-26
  kind: "actual" | "projected";
  revenue_inr_l: number;
}

export type FinancialsParse =
  | { ok: true; months: MonthRow[]; years: YearRow[] }
  | { ok: false; errors: string[] };

const MAX_ROWS = 240;
const MAX_LAKH = 10_000_000;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** The Indian financial year (April to March) a date falls in, by its start year, in IST. */
export function fyStartOf(now = new Date()): number {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
}

export function currentMonth(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "2026-04", "Apr 2026", "April 2026", "04/2026", "2026-04-01", or an Excel date number. */
export function parseMonth(raw: string): string | null {
  const s = raw.trim();
  let y: number | undefined;
  let m: number | undefined;
  let hit: RegExpExecArray | null;
  if ((hit = /^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/.exec(s))) [y, m] = [Number(hit[1]), Number(hit[2])];
  else if ((hit = /^(\d{1,2})[-/.](\d{4})$/.exec(s))) [m, y] = [Number(hit[1]), Number(hit[2])];
  else if ((hit = /^([a-z]{3,9})\.?[\s,'-]*(\d{2}|\d{4})$/i.exec(s))) {
    const idx = MONTHS.indexOf(hit[1].slice(0, 3).toLowerCase());
    if (idx >= 0) [m, y] = [idx + 1, hit[2].length === 2 ? 2000 + Number(hit[2]) : Number(hit[2])];
  } else if (/^\d{5}(\.\d+)?$/.test(s)) {
    // Excel stores a typed date as days since 30 Dec 1899.
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000);
    [y, m] = [d.getUTCFullYear(), d.getUTCMonth() + 1];
  }
  if (!y || !m || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** "FY 2025-26", "2025-26", "FY25-26" or "2025-2026" -> 2025. */
export function parseFy(raw: string): number | null {
  const s = raw.trim().replace(/^fy\s*/i, "");
  const hit = /^(\d{2}|\d{4})\s*[-–/]\s*(\d{2}|\d{4})$/.exec(s);
  if (!hit) return null;
  const start = hit[1].length === 2 ? 2000 + Number(hit[1]) : Number(hit[1]);
  const end = hit[2].length === 2 ? Math.floor(start / 100) * 100 + Number(hit[2]) : Number(hit[2]);
  if (end !== start + 1 || start < 2000 || start > 2100) return null;
  return start;
}

const fyLabel = (start: number) => `FY ${start}-${String(start + 1).slice(2)}`;

/** A blank cell is null; anything else must be a number from 0 up. */
function amount(raw: string): number | null | "bad" {
  const s = raw.trim().replace(/,/g, "").replace(/^₹\s*/, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= MAX_LAKH ? Math.round(n * 100) / 100 : "bad";
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const tabOf = (sheets: Map<string, string[][]>, name: string) =>
  [...sheets.entries()].find(([k]) => norm(k) === norm(name))?.[1];

/** Which column each heading is in, or the headings that are missing. */
function columns(header: string[] | undefined, wanted: Record<string, string>): Record<string, number> | string[] {
  const at: Record<string, number> = {};
  const missing: string[] = [];
  for (const [key, label] of Object.entries(wanted)) {
    const i = (header ?? []).findIndex((h) => norm(h).startsWith(norm(label)));
    if (i < 0) missing.push(label);
    else at[key] = i;
  }
  return missing.length ? missing : at;
}

export function parseFinancialsWorkbook(bytes: Uint8Array, now = new Date()): FinancialsParse {
  let sheets: Map<string, string[][]>;
  try {
    sheets = readXlsxSheets(Buffer.from(bytes));
  } catch {
    return { ok: false, errors: ["This isn't an Excel file we can read. Download the template and fill it in."] };
  }
  const errors: string[] = [];
  const add = (msg: string) => {
    if (errors.length < 20) errors.push(msg);
  };
  const thisMonth = currentMonth(now);
  const thisFy = fyStartOf(now);
  const months: MonthRow[] = [];
  const years: YearRow[] = [];

  const monthly = tabOf(sheets, "Monthly");
  const yearly = tabOf(sheets, "Yearly");
  const projections = tabOf(sheets, "Projections");
  if (!monthly && !yearly && !projections) {
    return { ok: false, errors: ['The file has no "Monthly", "Yearly" or "Projections" tab. Download the template and fill it in.'] };
  }

  if (monthly) {
    const at = columns(monthly[0], { month: "Month", revenue: "Revenue", mrr: "MRR", expenses: "Expenses" });
    if (Array.isArray(at)) add(`Monthly tab: missing the ${at.join(", ")} heading. Don't rename the template's headings.`);
    else {
      const seen = new Set<string>();
      monthly.slice(1, MAX_ROWS + 1).forEach((row, i) => {
        const cell = (k: string) => String(row[at[k]] ?? "");
        const label = `Monthly tab, row ${i + 2}`;
        if (![cell("month"), cell("revenue"), cell("mrr"), cell("expenses")].some((v) => v.trim())) return;
        const month = parseMonth(cell("month"));
        if (!month) return add(`${label}: write the month like 2026-04.`);
        if (month > thisMonth) return add(`${label}: ${month} is in the future. Put expected revenue in the Projections tab.`);
        if (seen.has(month)) return add(`${label}: ${month} appears twice.`);
        seen.add(month);
        const values = { revenue: amount(cell("revenue")), mrr: amount(cell("mrr")), expenses: amount(cell("expenses")) };
        const bad = Object.entries(values).filter(([, v]) => v === "bad").map(([k]) => (k === "mrr" ? "MRR" : k[0].toUpperCase() + k.slice(1)));
        if (bad.length) return add(`${label}: ${bad.join(", ")} must be a number in ₹ lakh, like 12.5.`);
        if (values.revenue === null && values.mrr === null && values.expenses === null) return add(`${label}: add at least one amount for ${month}.`);
        months.push({ month, revenue_inr_l: values.revenue as number | null, mrr_inr_l: values.mrr as number | null, expenses_inr_l: values.expenses as number | null });
      });
    }
  }

  for (const [tab, rows, kind] of [["Yearly", yearly, "actual"], ["Projections", projections, "projected"]] as const) {
    if (!rows) continue;
    const at = columns(rows[0], { fy: "Financial year", revenue: kind === "actual" ? "Revenue" : "Projected revenue" });
    if (Array.isArray(at)) {
      add(`${tab} tab: missing the ${at.join(", ")} heading. Don't rename the template's headings.`);
      continue;
    }
    const seen = new Set<number>();
    rows.slice(1, MAX_ROWS + 1).forEach((row, i) => {
      const fyCell = String(row[at.fy] ?? "");
      const revCell = String(row[at.revenue] ?? "");
      const label = `${tab} tab, row ${i + 2}`;
      if (!fyCell.trim() && !revCell.trim()) return;
      const fy = parseFy(fyCell);
      if (fy === null) return add(`${label}: write the year like FY 2025-26.`);
      if (kind === "actual" && fy >= thisFy) return add(`${label}: ${fyLabel(fy)} isn't over yet. Put it in the Projections tab.`);
      if (kind === "projected" && fy < thisFy) return add(`${label}: ${fyLabel(fy)} is already over. Put it in the Yearly tab.`);
      if (seen.has(fy)) return add(`${label}: ${fyLabel(fy)} appears twice.`);
      seen.add(fy);
      const rev = amount(revCell);
      if (rev === "bad" || rev === null) return add(`${label}: revenue must be a number in ₹ lakh, like 450.`);
      years.push({ fy_start: fy, kind, revenue_inr_l: rev });
    });
  }

  if (errors.length) return { ok: false, errors };
  if (!months.length && !years.length) return { ok: false, errors: ["The file has no figures yet. Fill in at least one tab, then upload it again."] };
  months.sort((a, b) => a.month.localeCompare(b.month));
  years.sort((a, b) => a.fy_start - b.fy_start);
  return { ok: true, months, years };
}
