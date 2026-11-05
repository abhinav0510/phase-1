// Which figures a founder should be asked for next, after their first template upload.
// Plain functions (no I/O) so they are unit-tested on their own. Dates are worked out in IST.

const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ist = (now: Date) => new Date(now.getTime() + 5.5 * 3600 * 1000);
const ym = (y: number, m0: number) => {
  const d = new Date(Date.UTC(y, m0, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** "2026-10" -> "October 2026". */
export function longMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${NAMES[m - 1]} ${y}`;
}
export const fyName = (start: number) => `FY ${start}-${String(start + 1).slice(2)}`;

export interface FiguresDue {
  /** The month to ask for (YYYY-MM), or null when the months are up to date. */
  month: string | null;
  /** Start year of the financial year whose total to ask for, or null. */
  fy: number | null;
}

/** How far back the prompt reaches when months are missing; older gaps are for a fresh upload. */
const LOOKBACK = 12;

/**
 * A month is due from the 2nd of the month after it, until it is filled. When several are
 * missing, the oldest within the last 12 months comes first. A closed financial year's
 * total is due from 2 April, but only for founders who have uploaded yearly figures before.
 * Founders who have never uploaded are not asked at all: they start with the template.
 */
export function figuresDue(
  months: { month: string }[],
  years: { fy_start: number; kind: string }[],
  now = new Date(),
): FiguresDue {
  if (months.length === 0 && years.length === 0) return { month: null, fy: null };
  const t = ist(now);
  const y = t.getUTCFullYear();
  const m0 = t.getUTCMonth();
  const day = t.getUTCDate();

  let month: string | null = null;
  if (months.length) {
    // The newest month that is due: last month from the 2nd, else the month before it.
    const latestDue = day >= 2 ? ym(y, m0 - 1) : ym(y, m0 - 2);
    const have = new Set(months.map((r) => r.month));
    const newest = [...have].sort().at(-1)!;
    for (let back = LOOKBACK - 1; back >= 0; back--) {
      const [ly, lm] = latestDue.split("-").map(Number);
      const candidate = ym(ly, lm - 1 - back);
      // Only gaps after what they already have; a month before their first upload isn't "missing".
      if (candidate > newest && !have.has(candidate)) {
        month = candidate;
        break;
      }
    }
  }

  let fy: number | null = null;
  if (years.length) {
    // FY runs April to March; the last closed one is due from 2 April.
    const thisFyStart = m0 >= 3 ? y : y - 1;
    const closed = m0 === 3 && day < 2 ? thisFyStart - 2 : thisFyStart - 1;
    if (!years.some((r) => r.kind === "actual" && r.fy_start === closed)) fy = closed;
  }
  return { month, fy };
}
