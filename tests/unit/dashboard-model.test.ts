import { describe, expect, it } from "vitest";
import {
  activityFeed,
  initialsOf,
  investorMix,
  matchStateSlices,
  pipelineStages,
  relativeTime,
  weekPoints,
} from "@/app/(founder)/dashboard/_components/model";

const match = (id: number, state: string, name: string | null, type = "vc") =>
  ({ id, state, created_at: "2026-10-01T00:00:00Z", investor: { id, name, type } }) as never;
const meeting = (id: number, name: string | null, at: string | null, held: boolean | null = null) =>
  ({ id, investor_name: name, scheduled_at: at, held, created_at: "2026-10-01T00:00:00Z" }) as never;

describe("pipelineStages", () => {
  const stages = pipelineStages(
    [match(1, "sent", "A"), match(2, "queued", "B"), match(3, "sent", null)],
    [meeting(1, "C", "2026-10-02T00:00:00Z"), meeting(2, "D", "2026-10-03T00:00:00Z", true), meeting(3, "E", null)],
  );
  const by = Object.fromEntries(stages.map((s) => [s.key, s]));

  it("has the five stages in order", () => {
    expect(stages.map((s) => s.key)).toEqual(["matched", "queued", "sent", "meetings", "held"]);
  });
  it("counts each stage", () => {
    expect([by.matched.count, by.queued.count, by.sent.count, by.meetings.count, by.held.count]).toEqual([3, 1, 2, 2, 1]);
  });
  it("lists names and skips blanks", () => {
    expect(by.sent.names).toEqual(["A"]);
    expect(by.meetings.names).toEqual(["C", "D"]);
  });
});

describe("matchStateSlices", () => {
  it("adds up to the number of matches", () => {
    const slices = matchStateSlices([match(1, "sent", "A"), match(2, "sent", "B"), match(3, "queued", "C")]);
    expect(slices.reduce((n, s) => n + s.value, 0)).toBe(3);
    expect(slices.find((s) => s.key === "sent")?.value).toBe(2);
  });
  it("is all zeros with no matches, so the chart still draws its legend", () => {
    expect(matchStateSlices([]).every((s) => s.value === 0)).toBe(true);
  });
  it("never has a slice for paused matches", () => {
    expect(matchStateSlices([]).some((s) => s.key === "paused")).toBe(false);
  });
});

describe("investorMix", () => {
  it("does not throw and totals the matches", () => {
    const mix = investorMix([match(1, "sent", "A", "vc"), match(2, "sent", "B", "vc"), match(3, "sent", "C", "angel")]);
    expect(mix.reduce((n, s) => n + s.value, 0)).toBe(3);
  });
});

describe("weekPoints", () => {
  const r = (week_start: string, reached: number) => ({ week_start, reached, followups: 1, meetings: 0 }) as never;
  it("shows the newest n weeks, oldest first", () => {
    const pts = weekPoints([r("2026-10-19", 3), r("2026-10-12", 2), r("2026-10-05", 1)], 2);
    expect(pts.map((p) => p.reached)).toEqual([2, 3]);
  });
});

describe("activityFeed", () => {
  it("is newest first, capped at the limit, and labels upcoming meetings", () => {
    const now = new Date("2026-10-30T00:00:00Z");
    const feed = activityFeed(
      [match(1, "sent", "A"), match(2, "sent", "B")],
      [meeting(1, "Past", "2026-10-20T00:00:00Z"), meeting(2, "Future", "2026-12-20T00:00:00Z")],
      [],
      3,
      now,
    );
    expect(feed.length).toBeLessThanOrEqual(3);
    const times = feed.map((e) => e.at.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
    expect(feed.find((e) => e.title === "Future")?.detail).toBe("Meeting scheduled");
    expect(feed.find((e) => e.title === "Past")?.detail).toBe("Meeting");
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-10-30T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it("reads naturally", () => {
    expect(relativeTime(ago(10_000), now)).toBe("just now");
    expect(relativeTime(ago(5 * 60_000), now)).toBe("5 min ago");
    expect(relativeTime(ago(3600_000), now)).toBe("1 hr ago");
    expect(relativeTime(ago(2 * 86400_000), now)).toBe("2 days ago");
    expect(relativeTime(new Date(now.getTime() + 86400_000), now)).toBe("in 1 day");
    expect(relativeTime(ago(60 * 86400_000), now)).toBe("2 mo ago");
  });
});

describe("initialsOf", () => {
  it("handles names and blanks", () => {
    expect(initialsOf("Bon Cuisine Foods")).toBe("BC");
    expect(initialsOf(null)).toBe("?");
  });
});
