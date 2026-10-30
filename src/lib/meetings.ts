import type { Meeting } from "@/lib/types/db";

/**
 * Turns raw `meetings` rows into what a founder should see. Rows come from
 * calendar events, so the same meeting can be stored more than once, the name
 * column is often empty, and the investor link is not always right. The event
 * title ("Startup <> Investor | Sidana Ventures", kept in `notes`) is what the
 * team actually wrote, so it decides both the name and whether to show the row.
 */

/** Titles that are never an investor conversation, whoever the row is linked to. */
const NOT_INVESTOR = /internal|s\.?v\.?\s*team|rehears|sharks|pr\s*\/\s*media|founder call|\bmou\b|cancell?ed/i;

/** Bracketed notes about the meeting itself; "(Peak XV)" style names are kept. */
const MEETING_NOTE =
  /\s*\([^)]*\b(?:meeting|meet|office|physical|discussion|call|ic|2nd|second|\d(?:st|nd|rd|th))\b[^)]*\)/gi;

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** The two parties in a "A <> B" title, without prefixes like "Meeting:" or the "and Sidana Ventures" suffix. */
function titleSides(title: string): [string, string] | null {
  const parts = title.split(/<\s*>/);
  if (parts.length < 2) return null;
  const left = (parts[0].split(":").pop() ?? "").trim();
  // Separators as typed in the calendar: "|", "and", or a stray "I" / "l" for a pipe.
  const right = parts[1].split(/\||\s+[aA][nN][dD]\s+|\s[Il]\s/)[0].trim();
  return left && right ? [left, right] : null;
}

function isInvestorMeeting(m: Meeting, title: string, sides: [string, string] | null): boolean {
  if (NOT_INVESTOR.test(title)) return false;
  if (sides) return !sides.some((s) => /sidana/i.test(s));
  return !!m.investor_id && m.in_book !== false;
}

/** The side of the title that is not the startup; the right side when neither clearly is. */
function counterparty(sides: [string, string], startupKey: string): string {
  const [left, right] = sides;
  const isStartup = (s: string) => {
    const k = norm(s);
    return !!k && !!startupKey && (k.includes(startupKey) || startupKey.includes(k));
  };
  const name = isStartup(right) && !isStartup(left) ? left : right;
  return name.replace(MEETING_NOTE, "").trim() || name;
}

/**
 * Keeps investor meetings only, names each one, and collapses rows for the same
 * meeting into one. `investorNames` is the fallback for rows with no usable title.
 */
export function toFounderMeetings(
  rows: Meeting[],
  startupName: string | null | undefined,
  investorNames: Map<number, string>,
): Meeting[] {
  const startupKey = norm(startupName);
  const byMeeting = new Map<string, Meeting>();

  for (const row of rows) {
    const title = (row.notes ?? "").trim();
    const sides = titleSides(title);
    if (!isInvestorMeeting(row, title, sides)) continue;

    const name =
      (sides ? counterparty(sides, startupKey) : null) ||
      row.investor_name ||
      (row.investor_id ? investorNames.get(row.investor_id) : null) ||
      null;
    const key = `${row.scheduled_at ?? row.id}|${norm(name)}`;
    const seen = byMeeting.get(key);

    if (!seen) {
      byMeeting.set(key, { ...row, investor_name: name });
      continue;
    }
    // The row that already had a saved name is the desk-reviewed copy, so its flags win.
    const base = row.investor_name ? row : seen;
    byMeeting.set(key, {
      ...base,
      investor_name: name,
      held: seen.held || row.held,
      meet_link: seen.meet_link ?? row.meet_link,
      fireflies_id: seen.fireflies_id ?? row.fireflies_id,
    });
  }
  return [...byMeeting.values()];
}
