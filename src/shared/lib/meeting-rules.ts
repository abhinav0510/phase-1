/**
 * Booking rules shared by the "Schedule a meet" picker and the server check.
 *
 * A portal-booked meeting reaches the founder's and admins' meetings pages
 * through CAL-SYNC (hourly), so a meeting must start at least two hours after
 * it is booked: by then everyone can see it.
 */
export const MIN_LEAD_MINUTES = 120;

/** Bookable start times, IST, on the quarter hour. */
export const FIRST_SLOT = "08:00";
export const LAST_SLOT = "19:45";

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Today's date in IST, as YYYY-MM-DD. */
export function istToday(now: number): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Every slot between FIRST_SLOT and LAST_SLOT, "HH:MM". */
export function allSlots(): string[] {
  const out: string[] = [];
  for (let m = 8 * 60; m <= 19 * 60 + 45; m += 15) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return out;
}

/** The slots still bookable on an IST date: on today, only those at least MIN_LEAD_MINUTES away. */
export function slotsFor(date: string, now: number): string[] {
  const earliest = now + MIN_LEAD_MINUTES * 60 * 1000;
  return allSlots().filter((t) => new Date(`${date}T${t}:00+05:30`).getTime() >= earliest);
}
