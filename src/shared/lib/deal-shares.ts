// What happened each time Sidana shared a startup's deal with an investor, one row per
// investor, for the team's startup page. Plain functions (no I/O) so they are unit-tested.

export interface DealMail {
  investor_id: number | null;
  investor_name: string | null;
  sent_at: string | null;
  reply_kind: string | null;
  reply_gist: string | null;
  subject: string | null;
}

export interface DealMeeting {
  investor_id: number | null;
  scheduled_at: string | null;
}

export type DealStatus = "invite" | "interested" | "pass" | "no_reply";

export interface DealShare {
  investorId: number | null;
  investorName: string;
  firstSentAt: string | null;
  lastSentAt: string | null;
  emails: number;
  status: DealStatus;
  /** What the investor said in their latest reply. */
  gist: string | null;
  repliedAt: string | null;
  /** The investor's next meeting, or their latest one if none is coming up. */
  meetingAt: string | null;
  meetingPast: boolean;
}

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  invite: "Meeting",
  interested: "Interested",
  pass: "Passed",
  no_reply: "No reply yet",
};

const KNOWN = new Set(["invite", "interested", "pass"]);
const t = (s: string | null) => (s ? Date.parse(s) : NaN);

export function summarizeDealShares(mails: DealMail[], meetings: DealMeeting[], now = Date.now()): DealShare[] {
  const byInvestor = new Map<string, DealMail[]>();
  for (const m of mails) {
    const key = m.investor_id != null ? `i:${m.investor_id}` : `n:${(m.investor_name ?? "").toLowerCase()}`;
    byInvestor.set(key, [...(byInvestor.get(key) ?? []), m]);
  }

  const shares: DealShare[] = [];
  for (const rows of byInvestor.values()) {
    const sorted = [...rows].sort((a, b) => (t(a.sent_at) || 0) - (t(b.sent_at) || 0));
    // The newest reply decides the status: a pass after interest is a pass.
    const reply = [...sorted].reverse().find((r) => r.reply_kind && KNOWN.has(r.reply_kind)) ?? null;
    const id = sorted[0].investor_id;
    const theirs = meetings
      .filter((mt) => id != null && mt.investor_id === id && mt.scheduled_at)
      .map((mt) => t(mt.scheduled_at))
      .filter(Number.isFinite);
    const next = theirs.filter((x) => x >= now).sort((a, b) => a - b)[0];
    const last = theirs.filter((x) => x < now).sort((a, b) => b - a)[0];
    const meeting = next ?? last;
    shares.push({
      investorId: id,
      investorName: sorted.find((r) => r.investor_name)?.investor_name ?? (id != null ? `Investor #${id}` : "Unknown investor"),
      firstSentAt: sorted[0].sent_at,
      lastSentAt: sorted.at(-1)!.sent_at,
      emails: sorted.length,
      status: (reply?.reply_kind as DealStatus | undefined) ?? "no_reply",
      gist: reply?.reply_gist ?? null,
      repliedAt: reply?.sent_at ?? null,
      meetingAt: meeting != null ? new Date(meeting).toISOString() : null,
      meetingPast: meeting != null && meeting < now,
    });
  }
  // Newest activity first.
  return shares.sort((a, b) => (t(b.lastSentAt) || 0) - (t(a.lastSentAt) || 0));
}

export function dealShareCounts(shares: DealShare[]) {
  const by = (s: DealStatus) => shares.filter((x) => x.status === s).length;
  return {
    shared: shares.length,
    replied: shares.length - by("no_reply"),
    positive: by("invite") + by("interested"),
    passed: by("pass"),
    meetings: shares.filter((s) => s.meetingAt).length,
  };
}

/**
 * The same one-row-per-investor view, built from PIPELINE pairs (src/shared/lib/deal-sharing.ts)
 * instead of emails, so the admin startup page counts exactly what the founder dashboard and
 * the admin Deal sharing page count. "Meeting" covers a meeting held, booked or requested.
 */
export function sharesFromPairs(
  pairs: { investor: string; date: string; last: string; rows: number; category: string; response: string; status: string; investorId?: number | null }[],
  meetings: { investor_name: string | null; notes?: string | null; scheduled_at: string | null }[],
  now = Date.now(),
): DealShare[] {
  const key = (x: unknown) => String(x ?? "").toLowerCase().replace(/[’']/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  const STATUS: Record<string, DealStatus> = { meeting: "invite", tobook: "invite", interested: "interested", referred: "interested", other: "interested", passed: "pass", none: "no_reply", bounced: "no_reply" };
  return pairs.map((p) => {
    const firm = p.investor.split(/\s+-\s+/)[0].trim();
    const fk = key(firm);
    const times = fk.length < 4 ? [] : meetings
      .filter((m) => key(`${m.notes ?? ""} ${m.investor_name ?? ""}`).includes(fk) && m.scheduled_at)
      .map((m) => t(m.scheduled_at))
      .filter(Number.isFinite);
    const next = times.filter((x) => x >= now).sort((a, b) => a - b)[0];
    const last = times.filter((x) => x < now).sort((a, b) => b - a)[0];
    const meeting = next ?? last;
    return {
      investorId: p.investorId ?? null,
      investorName: firm,
      firstSentAt: p.date || null,
      lastSentAt: p.last || p.date || null,
      emails: p.rows,
      status: STATUS[p.category] ?? "no_reply",
      gist: [p.response, p.status].filter(Boolean).join(" · ") || null,
      repliedAt: null,
      meetingAt: meeting != null ? new Date(meeting).toISOString() : null,
      meetingPast: meeting != null && meeting < now,
    };
  }).sort((a, b) => ((a.firstSentAt ?? "") < (b.firstSentAt ?? "") ? 1 : -1));
}
