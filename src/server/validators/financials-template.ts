import "server-only";

import { fyName, shortMonth, templatePeriods } from "@/shared/lib/figures-due";
import { writeXlsx } from "./xlsx-writer.mjs";

/**
 * The Excel template founders download from the Financials page, built on each download
 * so the months and financial years are already filled in and only the amounts are typed.
 * The tab names and headings must match what ./financials-upload.ts reads.
 */
export function buildFinancialsTemplate(now = new Date()): Buffer {
  const p = templatePeriods(now);
  const first = shortMonth(p.months[0]);
  const last = shortMonth(p.months.at(-1)!);
  return writeXlsx([
    {
      name: "How to fill",
      widths: [110],
      rows: [
        ["How to fill this template"],
        ["The months and financial years are already filled in. Just type your amounts next to them."],
        ["All amounts are in ₹ lakh. For example, ₹1.5 Cr is 150 and ₹40,000 is 0.4."],
        [`Monthly: ${first} to ${last}. Revenue is everything you earned that month; MRR is the recurring part (leave it empty if you have none); Expenses is everything you spent.`],
        [`Yearly: your revenue for ${fyName(p.previousFy)} (April to March).`],
        [`Projections: the revenue you expect for ${fyName(p.projectionFys[0])} (this year, in full) and the three years after it.`],
        ["Leave a row empty if you don't have that number. Don't change the tabs, headings, months or years."],
        ["When you're done, upload this file on the Financials page of the founder portal."],
      ],
    },
    {
      name: "Monthly",
      widths: [16, 18, 16, 18],
      textColumns: [0],
      rows: [["Month", "Revenue (₹ lakh)", "MRR (₹ lakh)", "Expenses (₹ lakh)"], ...p.months.map((m) => [shortMonth(m)])],
    },
    {
      name: "Yearly",
      widths: [18, 18],
      textColumns: [0],
      rows: [["Financial year", "Revenue (₹ lakh)"], [fyName(p.previousFy)]],
    },
    {
      name: "Projections",
      widths: [18, 26],
      textColumns: [0],
      rows: [["Financial year", "Projected revenue (₹ lakh)"], ...p.projectionFys.map((fy) => [fyName(fy)])],
    },
  ]);
}
