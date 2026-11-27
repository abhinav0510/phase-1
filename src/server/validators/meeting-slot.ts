import "server-only";

import { MIN_LEAD_MINUTES } from "@/shared/lib/meeting-rules";

/**
 * A meeting slot picked as an IST date and time (clause 2.7). Must be a real
 * date, on a 15-minute boundary, at least 2 hours from now (MIN_LEAD_MINUTES, so the
 * founder and Sidana see it before it starts) and within 90 days.
 */
export function parseIstSlot(
  date: string,
  time: string,
  now: number,
): { ok: true; start: Date } | { ok: false; error: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "Pick a date and a time." };
  const [hh, mm] = time.split(":").map(Number);
  if (hh > 23 || mm > 59 || mm % 15 !== 0) return { ok: false, error: "Pick a time on the quarter hour." };
  const start = new Date(`${date}T${time}:00+05:30`);
  if (Number.isNaN(start.getTime())) return { ok: false, error: "Pick a valid date." };
  // Reject impossible dates like 2026-02-31, which JS rolls over.
  const ist = new Date(start.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);
  if (ist !== date) return { ok: false, error: "Pick a valid date." };
  if (start.getTime() < now + MIN_LEAD_MINUTES * 60 * 1000) {
    return { ok: false, error: "Pick a time at least 2 hours from now, so the founder and Sidana see the meeting before it starts." };
  }
  if (start.getTime() > now + 90 * 24 * 60 * 60 * 1000) return { ok: false, error: "Pick a date within the next 90 days." };
  return { ok: true, start };
}
