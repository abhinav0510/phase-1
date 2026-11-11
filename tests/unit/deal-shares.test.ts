import { describe, expect, it } from "vitest";
import { dealShareCounts, summarizeDealShares, type DealMail } from "@/shared/lib/deal-shares";

const NOW = Date.parse("2026-11-11T06:00:00Z");
const mail = (investor_id: number, sent_at: string, reply_kind: string | null = null, extra: Partial<DealMail> = {}): DealMail => ({
  investor_id, investor_name: `Investor ${investor_id}`, sent_at, reply_kind, reply_gist: reply_kind ? `${reply_kind} note` : null, subject: "Deal", ...extra,
});

describe("deals shared with investors", () => {
  const shares = summarizeDealShares(
    [
      mail(1, "2026-10-01T05:00:00Z"),
      mail(1, "2026-10-08T05:00:00Z", "interested"),
      mail(2, "2026-10-02T05:00:00Z", "interested"),
      mail(2, "2026-10-09T05:00:00Z", "pass"),
      mail(3, "2026-10-03T05:00:00Z"),
      mail(4, "2026-10-04T05:00:00Z", "invite"),
    ],
    [
      { investor_id: 4, scheduled_at: "2026-11-20T05:00:00Z" },
      { investor_id: 4, scheduled_at: "2026-10-20T05:00:00Z" },
      { investor_id: 1, scheduled_at: "2026-10-15T05:00:00Z" },
    ],
    NOW,
  );
  const of = (id: number) => shares.find((s) => s.investorId === id)!;

  it("keeps one row per investor, newest activity first", () => {
    expect(shares.map((s) => s.investorId)).toEqual([2, 1, 4, 3]);
    expect(of(1)).toMatchObject({ emails: 2, firstSentAt: "2026-10-01T05:00:00Z", lastSentAt: "2026-10-08T05:00:00Z" });
  });
  it("takes the status from the newest reply", () => {
    expect(of(1)).toMatchObject({ status: "interested", gist: "interested note", repliedAt: "2026-10-08T05:00:00Z" });
    expect(of(2)).toMatchObject({ status: "pass", gist: "pass note" });
    expect(of(3)).toMatchObject({ status: "no_reply", gist: null, repliedAt: null });
    expect(of(4).status).toBe("invite");
  });
  it("shows the next meeting, or the last one if none is coming up", () => {
    expect(of(4)).toMatchObject({ meetingAt: "2026-11-20T05:00:00.000Z", meetingPast: false });
    expect(of(1)).toMatchObject({ meetingAt: "2026-10-15T05:00:00.000Z", meetingPast: true });
    expect(of(3).meetingAt).toBeNull();
  });
  it("counts the totals", () => {
    expect(dealShareCounts(shares)).toEqual({ shared: 4, replied: 3, positive: 2, passed: 1, meetings: 2 });
  });
  it("treats an unknown reply type as no reply", () => {
    expect(summarizeDealShares([mail(9, "2026-10-01T05:00:00Z", "auto_reply")], [], NOW)[0].status).toBe("no_reply");
  });
});
