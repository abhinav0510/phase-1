import { formatCr } from "@/shared/lib/utils";
import type { FundingRound, Startup } from "@/shared/types/db";

/**
 * Founder and admin pages show rupees only. Dollar amounts are converted when displayed,
 * at this fixed rate set by Sidana. Stored data and investor emails keep their original text.
 */
export const INR_PER_USD = 100;

const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;
const UNIT = String.raw`(?:thousand|million|billion|trillion|mn|bn|k|m|b|t)(?![a-z0-9])`;
const SEP = String.raw`\s*(?:-|–|—|to)\s*`;
const USD_PREFIX = String.raw`(?<![a-z])(?:US\s*\$|USD\s*|\$)\s*`;
const USD_PREFIX_AGAIN = String.raw`(?:US\s*\$|USD\s*|\$)\s*`;

/** "$1M", "US$250K-3M", "$1M to $50M", "USD 75-125K", "US$8 to 10 million". */
const DOLLAR_AMOUNT = `${USD_PREFIX}${NUM}(?:\\s*${UNIT})?(?:${SEP}(?:${USD_PREFIX_AGAIN}${NUM}(?:\\s*${UNIT})?|${NUM}\\s*${UNIT}))?`;
const DOLLAR_PARTS = new RegExp(
  `${USD_PREFIX}(${NUM})(?:\\s*(${UNIT}))?(?:${SEP}(?:${USD_PREFIX_AGAIN}(${NUM})(?:\\s*(${UNIT}))?|(${NUM})\\s*(${UNIT})))?`,
  "gi",
);
/** "500K USD", "1-2M USD". */
const DOLLAR_SUFFIX = new RegExp(`(?<![\\d.])(${NUM})(?:\\s*(${UNIT}))?(?:${SEP}(${NUM})(?:\\s*(${UNIT}))?)?\\s*(?:USD|US\\s*\\$)(?![a-z])`, "gi");

const INR_UNIT = String.raw`(?:cr|crores?|lakhs?|lacs?|l)\b`;
const APPROX = String.raw`(?:~\s*|about\s+|approx\.?\s+)?`;
/** "INR 8.5-17 Cr", "~INR 4 Cr", "INR 25.5 Cr+", "8-20Cr". */
const RUPEE_AMOUNT =
  `${APPROX}(?:(?:INR|Rs\\.?|₹)\\s*~?\\s*${NUM}(?:\\s*${INR_UNIT})?(?:${SEP}(?:INR\\s*)?${NUM}(?:\\s*${INR_UNIT})?)?` +
  `|${NUM}(?:${SEP}${NUM})?\\s*${INR_UNIT})\\+?`;

// When a figure is given in both currencies, the rupee one was worked out at a market rate.
// Keep the dollar one, whichever comes first, so every rupee value shown is dollars × 100.
const DUPLICATES: [RegExp, string][] = [
  [new RegExp(`(${DOLLAR_AMOUNT}\\+?(?:\\s+[a-z]+){0,3})\\s*\\(\\s*${RUPEE_AMOUNT}\\s*\\)`, "gi"), "$1"],
  [new RegExp(`${RUPEE_AMOUNT}\\s*\\(\\s*${APPROX}(${DOLLAR_AMOUNT}\\+?)\\s*\\)`, "gi"), "$1"],
  // "INR 0.65-1.1 Cr (USD 75-125K, per Dr. Rohit)" keeps the remark in brackets.
  [new RegExp(`${RUPEE_AMOUNT}\\s*\\(\\s*${APPROX}(${DOLLAR_AMOUNT}\\+?)\\s*,\\s*`, "gi"), "$1 ("],
  [new RegExp(`(${DOLLAR_AMOUNT}\\+?)\\s*/\\s*${RUPEE_AMOUNT}`, "gi"), "$1"],
  [new RegExp(`${RUPEE_AMOUNT}\\s*/\\s*${APPROX}(${DOLLAR_AMOUNT}\\+?)`, "gi"), "$1"],
];

const HAS_DOLLARS = /(?:US\s*\$|\$|\bUSD\b)\s*\d|\d[\dkmbtn\s]*(?:USD\b|US\s*\$)/i;

const MULTIPLIER: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mn: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  t: 1e12,
  trillion: 1e12,
};

const parseNum = (s: string) => parseFloat(s.replace(/,/g, ""));
const unitValue = (unit: string | undefined) => (unit ? MULTIPLIER[unit.toLowerCase()] : 1);
const plain = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** Splits a rupee amount into a figure and the unit it reads best in. */
function scale(inr: number): { figure: string; unit: string } {
  if (inr >= 1e7) return { figure: plain(inr / 1e7), unit: " Cr" };
  if (inr >= 1e5) return { figure: plain(inr / 1e5), unit: " L" };
  return { figure: plain(inr), unit: "" };
}

export function formatRupees(inr: number): string {
  const { figure, unit } = scale(inr);
  return `₹${figure}${unit}`;
}

function formatRange(lowInr: number, highInr: number): string {
  const low = scale(lowInr);
  const high = scale(highInr);
  return low.unit === high.unit
    ? `₹${low.figure}–${high.figure}${high.unit}`
    : `₹${low.figure}${low.unit}–₹${high.figure}${high.unit}`;
}

function convert(first: string, firstUnit?: string, second?: string, secondUnit?: string): string {
  // "US$20-50K": a first figure with no unit takes the second figure's.
  const lowUnit = unitValue(firstUnit ?? secondUnit);
  const low = parseNum(first) * lowUnit * INR_PER_USD;
  if (second === undefined) return formatRupees(low);
  return formatRange(low, parseNum(second) * unitValue(secondUnit ?? firstUnit) * INR_PER_USD);
}

export function hasDollars(text: string | null | undefined): boolean {
  return !!text && HAS_DOLLARS.test(text);
}

/** Replaces every dollar amount in a piece of text with its rupee value. */
export function toRupees<T extends string | null | undefined>(text: T): T {
  if (!text || !hasDollars(text)) return text;
  let out: string = text;
  for (const [pattern, keep] of DUPLICATES) out = out.replace(pattern, keep);
  out = out.replace(DOLLAR_PARTS, (_m, a, aUnit, b, bUnit, c, cUnit) => convert(a, aUnit, b ?? c, bUnit ?? cUnit));
  out = out.replace(DOLLAR_SUFFIX, (_m, a, aUnit, b, bUnit) => convert(a, aUnit, b, bUnit));
  return out as T;
}

/** The current ask. `ask_amount` is in millions of dollars when `ask_currency` is USD. */
export function askDisplay(
  s: Pick<Startup, "ask_as_written" | "ask_amount" | "ask_currency" | "ask_current_cr"> | null | undefined,
): string {
  if (s?.ask_as_written) return toRupees(s.ask_as_written);
  if (s?.ask_currency === "USD" && s.ask_amount != null) return formatRupees(s.ask_amount * 1e6 * INR_PER_USD);
  return formatCr(s?.ask_amount ?? s?.ask_current_cr);
}

export function allocationDisplay(s: Pick<Startup, "allocation_left_as_written" | "allocation_left_amount"> | null | undefined): string {
  return toRupees(s?.allocation_left_as_written) ?? formatCr(s?.allocation_left_amount);
}

/** A funding round's amount. A dollar figure with no text is hidden, as its scale isn't known. */
export function fundingDisplay(f: Pick<FundingRound, "as_written" | "amount" | "currency">): string {
  if (f.as_written) return toRupees(f.as_written);
  return f.currency === "USD" ? "—" : formatCr(f.amount);
}
