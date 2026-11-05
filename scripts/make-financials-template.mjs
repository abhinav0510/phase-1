// Builds the Excel template founders download from the Financials page.
//   node scripts/make-financials-template.mjs
// Writes public/templates/sidana-financials-template.xlsx. The tab names and headings
// must match what src/server/validators/financials-upload.ts reads.

import { mkdirSync, writeFileSync } from "node:fs";
import { writeXlsx } from "./lib/xlsx-writer.mjs";

const OUT = "public/templates/sidana-financials-template.xlsx";

const book = writeXlsx([
  {
    name: "How to fill",
    widths: [110],
    rows: [
      ["How to fill this template"],
      ["Fill in the Monthly, Yearly and Projections tabs. Leave a tab empty if you don't have those numbers."],
      ["All amounts are in ₹ lakh. For example, ₹1.5 Cr is 150 and ₹40,000 is 0.4."],
      ["Monthly: one row per month, written like 2026-04 for April 2026. Revenue is everything you earned that month."],
      ["Monthly: MRR is the recurring part of that revenue. Leave it empty if you have no recurring revenue."],
      ["Monthly: Expenses is everything you spent that month."],
      ["Yearly: one row per completed financial year (April to March), written like FY 2025-26."],
      ["Projections: this financial year and the years ahead, written like FY 2027-28."],
      ["Don't rename the tabs or the headings. When you're done, upload this file on the Financials page of the founder portal."],
    ],
  },
  {
    name: "Monthly",
    widths: [18, 18, 16, 18],
    textColumns: [0],
    blankRows: 60,
    rows: [["Month (YYYY-MM)", "Revenue (₹ lakh)", "MRR (₹ lakh)", "Expenses (₹ lakh)"]],
  },
  {
    name: "Yearly",
    widths: [18, 18],
    textColumns: [0],
    blankRows: 10,
    rows: [["Financial year", "Revenue (₹ lakh)"]],
  },
  {
    name: "Projections",
    widths: [18, 26],
    textColumns: [0],
    blankRows: 10,
    rows: [["Financial year", "Projected revenue (₹ lakh)"]],
  },
]);

mkdirSync("public/templates", { recursive: true });
writeFileSync(OUT, book);
console.log(`Wrote ${OUT} (${book.length} bytes)`);
