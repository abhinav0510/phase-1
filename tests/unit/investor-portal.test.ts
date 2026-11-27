import { describe, expect, it } from "vitest";
import { hasThesis, matchStartups, NO_PROFILE, roomLeftCr, thesisOptions, toCr, type MatchStartup, type Thesis } from "@/shared/lib/thesis";
import { ANY_SECTOR, expandSector, sectorLabel, stageRange } from "@/shared/lib/sector-taxonomy";
import { decideInvestor, emailsInCell } from "@/server/auth/investor-access";
import { safeInvestorNext } from "@/server/auth/origin";
import { chatRule, istLabel, noticesNeeded } from "@/server/data/chat";
import { mergePortalMeetings } from "@/server/data/investor/engagement";
import { linkConclusion } from "@/server/data/conclusions";
import { parseIstSlot } from "@/server/validators/meeting-slot";
import { allSlots, istToday, slotsFor } from "@/shared/lib/meeting-rules";
import { validateThesis } from "@/server/validators/thesis";
import type { Meeting, PortalMeeting } from "@/shared/types/db";

// ---------------------------------------------------------------- F3 matching (clause 2.4)

// Shaped like live data: free-text STARTUPS sector, the agents' codes from STARTUP_PROFILE.
const s = (id: number, extra: Partial<MatchStartup> = {}): MatchStartup => ({
  id,
  name: `S${id}`,
  sector: "FinTech | SME Lending Marketplace",
  subsector: null,
  stage: "Traction",
  status: "live",
  ask_current_cr: 5,
  ask_amount: 5,
  ask_currency: "INR",
  allocation_left_amount: 2,
  revenue_inr_l: 100,
  sector_codes: ["FINTECH_SME_LENDING"],
  stage_code: "SEED",
  business_model: "B2B_MARKETPLACE",
  profile_active: true,
  raise_cr: 5,
  arr_cr: 1,
  ...extra,
});
const thesis = (extra: Partial<Thesis> = {}): Thesis => ({
  sectors: ["FINTECH_SME_LENDING"],
  stages: ["SEED"],
  chequeMinCr: null,
  chequeMaxCr: null,
  source: "sheet",
  ...extra,
});
const ids = (startups: MatchStartup[], t: Thesis | null) => matchStartups(startups, t).map((r) => r.startup.id);

describe("sector and stage codes", () => {
  it("expands the few legacy words still on INVESTORS rows", () => {
    expect(expandSector("FINTECH_INFRA")).toEqual(["FINTECH_INFRA"]);
    expect(expandSector("Fintech")).toContain("FINTECH_SME_LENDING");
    expect(expandSector("AI/ML")).toEqual(["AI_APPLIED_ENTERPRISE", "AI_FOUNDATIONAL"]);
    expect(expandSector("Something else")).toEqual([]);
  });
  it("turns a stage range into the agents' ladder, TRACTION between Seed and Pre-Series A", () => {
    expect(stageRange("SEED", "PRE_SERIES_A")).toEqual(["SEED", "TRACTION", "PRE_SERIES_A"]);
    expect(stageRange(null, "SEED")).toEqual(["PRE_SEED", "SEED"]);
    expect(stageRange(null, null)).toEqual([]);
  });
  it("gives every code a readable name", () => {
    expect(sectorLabel("FINTECH_SME_LENDING")).toBe("SME lending");
    expect(sectorLabel("NEW_CODE_LATER")).toBe("New code later");
  });
});

describe("thesis matching", () => {
  it("shows nothing without a thesis (Sidana, 14 Nov)", () => {
    expect(hasThesis(thesis({ sectors: [] }))).toBe(false);
    expect(ids([s(1)], thesis({ sectors: [] }))).toEqual([]);
    expect(ids([s(1)], null)).toEqual([]);
  });

  it("matches on sector code, stage code and room for the minimum cheque", () => {
    const startups = [
      s(1),
      s(2, { sector_codes: ["HEALTHTECH_DIGITAL"] }),
      s(3, { stage_code: "SERIES_B" }),
      s(4, { allocation_left_amount: 0.5 }),
      s(5, { status: "closed" }),
      s(6, { sector_codes: [] }),
      s(7, { sector_codes: ["AI_APPLIED_ENTERPRISE", "FINTECH_SME_LENDING"] }),
      s(8, { profile_active: false }),
    ];
    expect(ids(startups, thesis({ chequeMinCr: 1 }))).toEqual([1, 7]);
  });

  it("never compares free text: a startup without STARTUP_PROFILE codes can't match", () => {
    expect(ids([s(1, { ...NO_PROFILE })], thesis())).toEqual([]);
  });

  it("treats no stage preference and ANY sector as open", () => {
    expect(ids([s(1, { stage_code: "SERIES_B" })], thesis({ stages: [] }))).toEqual([1]);
    expect(ids([s(1, { sector_codes: ["AGRITECH"] })], thesis({ sectors: [ANY_SECTOR] }))).toEqual([1]);
    expect(ids([s(1, { stage_code: null })], thesis())).toEqual([]);
  });

  it("applies the investor's own exclusions from the INVESTORS tab", () => {
    const t = thesis({ sectors: [ANY_SECTOR] });
    expect(ids([s(1, { sector_codes: ["D2C_BEAUTY_PERSONAL_CARE"] })], { ...t, blockedSectors: ["D2C_BEAUTY_PERSONAL_CARE"] })).toEqual([]);
    expect(ids([s(1, { business_model: "D2C_BRAND" })], { ...t, blockedModels: ["D2C_BRAND"] })).toEqual([]);
  });

  it("converts dollar rounds to ₹ Cr and falls back to the ask, then the profile's round", () => {
    expect(toCr(1.5, "USD")).toBe(15);
    expect(roomLeftCr(s(1, { allocation_left_amount: null, ask_amount: 3 }))).toBe(3);
    expect(roomLeftCr(s(1, { allocation_left_amount: null, ask_amount: null, ask_current_cr: null, raise_cr: 8 }))).toBe(8);
    expect(ids([s(1, { ask_currency: "USD", allocation_left_amount: 0.5 })], thesis({ chequeMinCr: 4 }))).toEqual([1]);
    expect(ids([s(1, { ask_currency: "USD", allocation_left_amount: 0.3 })], thesis({ chequeMinCr: 4 }))).toEqual([]);
  });

  it("sorts by revenue then name and says why each matched", () => {
    const res = matchStartups([s(1, { revenue_inr_l: 10 }), s(2, { revenue_inr_l: 90 })], thesis());
    expect(res.map((r) => r.startup.id)).toEqual([2, 1]);
    expect(res[0].reasons).toMatchObject({ sector: "SME lending", stage: "Seed", roomCr: 2 });
  });

  it("offers every agents' sector, grouped, and the stage ladder", () => {
    const o = thesisOptions();
    const codes = o.sectorGroups.flatMap((g) => g.options.map((x) => x.key));
    expect(codes).toContain("FINTECH_SME_LENDING");
    expect(new Set(codes).size).toBe(codes.length);
    expect(o.stages.map((x) => x.key)).toEqual(["PRE_SEED", "SEED", "TRACTION", "PRE_SERIES_A", "SERIES_A", "SERIES_B", "SERIES_C_PLUS"]);
  });
});

describe("thesis validation (clause 2.6)", () => {
  it("accepts the agents' codes", () => {
    expect(validateThesis({ sectors: ["fintech_infra"], stages: ["Seed"], chequeMinCr: 1, chequeMaxCr: 5 })).toMatchObject({
      ok: true,
      value: { sectors: ["FINTECH_INFRA"], stages: ["SEED"] },
    });
  });
  it("keeps ANY on its own", () => {
    expect(validateThesis({ sectors: ["ANY", "HRTECH"], stages: [], chequeMinCr: null, chequeMaxCr: null })).toMatchObject({ value: { sectors: ["ANY"] } });
  });
  it("rejects free text, unknown codes and min > max", () => {
    expect(validateThesis({ sectors: ["Crypto"], stages: [], chequeMinCr: null, chequeMaxCr: null }).ok).toBe(false);
    expect(validateThesis({ sectors: ["HRTECH"], stages: ["Series D"], chequeMinCr: null, chequeMaxCr: null }).ok).toBe(false);
    expect(validateThesis({ sectors: ["HRTECH"], stages: [], chequeMinCr: 9, chequeMaxCr: 2 }).ok).toBe(false);
    expect(validateThesis({ sectors: "HRTECH" }).ok).toBe(false);
  });
});

// ---------------------------------------------------------------- F1 sign-in (clause 2.1)

describe("investor email resolution", () => {
  const investors = [
    { id: 1, email: "a@fund.com, partner@fund.com", cc_email: null },
    { id: 2, email: "b@other.com", cc_email: "Analyst@Other.com" },
    { id: 3, email: "dup@x.com", cc_email: null },
    { id: 4, email: "dup@x.com", cc_email: null },
    { id: 5, email: "noaccess@y.com", cc_email: null },
  ];
  const access = [
    { investor_id: 1, login_emails: [], revoked_at: null },
    { investor_id: 2, login_emails: ["personal@gmail.com"], revoked_at: null },
    { investor_id: 3, login_emails: [], revoked_at: null },
    { investor_id: 4, login_emails: [], revoked_at: null },
    { investor_id: 6, login_emails: [], revoked_at: "2026-11-01T00:00:00Z" },
  ];

  it("reads cells holding two addresses", () => {
    expect(emailsInCell("a@fund.com, partner@fund.com")).toEqual(["a@fund.com", "partner@fund.com"]);
    expect(emailsInCell("<X@Y.com>; z@w.in")).toEqual(["x@y.com", "z@w.in"]);
  });

  it("matches email, cc email and admin-added login emails", () => {
    expect(decideInvestor("partner@fund.com", investors, access)).toEqual({ kind: "investor", investorId: 1 });
    expect(decideInvestor("analyst@other.com", investors, access)).toEqual({ kind: "investor", investorId: 2 });
    expect(decideInvestor("PERSONAL@gmail.com", investors, access)).toEqual({ kind: "investor", investorId: 2 });
  });

  it("refuses unknown emails, investors without access and duplicates", () => {
    expect(decideInvestor("stranger@gmail.com", investors, access)).toEqual({ kind: "not_on_list" });
    expect(decideInvestor("noaccess@y.com", investors, access)).toEqual({ kind: "no_access" });
    expect(decideInvestor("dup@x.com", investors, access)).toEqual({ kind: "ambiguous", investorIds: [3, 4] });
  });

  it("ignores revoked access", () => {
    expect(decideInvestor("gone@z.com", [{ id: 6, email: "gone@z.com", cc_email: null }], access)).toEqual({ kind: "no_access" });
  });

  it("only allows investor paths after sign-in", () => {
    expect(safeInvestorNext("/investor/startup/12")).toBe("/investor/startup/12");
    expect(safeInvestorNext("//evil.com")).toBeNull();
    expect(safeInvestorNext("https://evil.com/investor/x")).toBeNull();
    expect(safeInvestorNext("/admin")).toBeNull();
    expect(safeInvestorNext("/investor/login")).toBeNull();
  });
});

// ---------------------------------------------------------------- F5–F8

const meeting = (id: number, extra: Partial<Meeting> = {}): Meeting =>
  ({ id, startup_id: 10, investor_id: 1, scheduled_at: "2026-11-20T10:30:00Z", held: false, is_second: false, source: "email", from_matcher: false, fireflies_id: null, meet_link: null, notes: null, created_at: "2026-11-01T00:00:00Z", startup_name: "LedgerLoop", investor_name: "Northbridge Capital", in_book: true, ...extra }) as Meeting;
const portal = (id: number, extra: Partial<PortalMeeting> = {}): PortalMeeting => ({
  id, investor_id: 1, startup_id: 10, scheduled_at: "2026-11-20T10:30:00Z", duration_min: 30, meet_link: null, calendar_event_id: null, ical_uid: null, status: "scheduled", created_by: null, created_at: "2026-11-14T00:00:00Z", ...extra,
});

describe("portal bookings are counted once (clauses 2.5, 2.7)", () => {
  it("drops a booking CAL-SYNC already brought in, by link or by time", () => {
    expect(mergePortalMeetings([meeting(1, { meet_link: "https://meet.google.com/abc" })], [portal(1, { meet_link: "https://meet.google.com/abc", scheduled_at: "2026-12-01T00:00:00Z" })])).toEqual([]);
    expect(mergePortalMeetings([meeting(1)], [portal(1, { scheduled_at: "2026-11-20T10:45:00Z" })])).toEqual([]);
  });
  it("keeps bookings not synced yet and drops cancelled ones", () => {
    expect(mergePortalMeetings([meeting(1)], [portal(2, { scheduled_at: "2026-11-25T10:30:00Z" })]).map((p) => p.id)).toEqual([2]);
    expect(mergePortalMeetings([], [portal(3, { status: "cancelled" })])).toEqual([]);
  });
});

describe("chat visibility rule (clause 2.8)", () => {
  it("needs interest AND a meeting", () => {
    expect(chatRule({ interested: true, hasMeeting: true })).toBe(true);
    expect(chatRule({ interested: true, hasMeeting: false })).toBe(false);
    expect(chatRule({ interested: false, hasMeeting: true })).toBe(false);
  });
});

describe("Fireflies linking (mirror of link_meeting_conclusions)", () => {
  const meetings = [
    { id: 1, scheduled_at: "2026-11-10T10:00:00Z", fireflies_id: "ff-1", startup_name: "LedgerLoop", investor_name: "Peak Fund" },
    { id: 2, scheduled_at: "2026-11-10T11:00:00Z", fireflies_id: null, startup_name: "Kiln Climate", investor_name: "Orbit Angels" },
    { id: 3, scheduled_at: "2026-11-10T12:30:00Z", fireflies_id: null, startup_name: "Kiln Climate", investor_name: "Orbit Angels" },
  ];
  it("prefers the meeting's own fireflies_id", () => {
    expect(linkConclusion({ ff_id: "ff-1", meeting_date: null, startup_guess: null, investor_guess: null }, meetings)).toBe(1);
  });
  it("else the closest name match within 3 hours", () => {
    expect(linkConclusion({ ff_id: "x", meeting_date: "2026-11-10T12:00:00Z", startup_guess: "Kiln", investor_guess: null }, meetings)).toBe(3);
    expect(linkConclusion({ ff_id: "x", meeting_date: "2026-11-10T11:05:00Z", startup_guess: null, investor_guess: "orbit angels" }, meetings)).toBe(2);
  });
  it("leaves it unlinked otherwise", () => {
    expect(linkConclusion({ ff_id: "x", meeting_date: "2026-11-11T11:00:00Z", startup_guess: "Kiln", investor_guess: null }, meetings)).toBeNull();
    expect(linkConclusion({ ff_id: "x", meeting_date: "2026-11-10T11:00:00Z", startup_guess: "Nobody", investor_guess: "Else" }, meetings)).toBeNull();
  });
});

describe("meeting slots (clause 2.7)", () => {
  const now = Date.parse("2026-11-14T06:00:00Z"); // 11:30 IST
  it("reads the time as IST", () => {
    const r = parseIstSlot("2026-11-17", "16:00", now);
    expect(r.ok && r.start.toISOString()).toBe("2026-11-17T10:30:00.000Z");
  });
  it("refuses past, too-soon, far-off, off-grid and impossible slots", () => {
    expect(parseIstSlot("2026-11-14", "11:45", now).ok).toBe(false);
    expect(parseIstSlot("2026-11-13", "16:00", now).ok).toBe(false);
    expect(parseIstSlot("2027-06-01", "16:00", now).ok).toBe(false);
    expect(parseIstSlot("2026-11-17", "16:10", now).ok).toBe(false);
    expect(parseIstSlot("2026-11-31", "16:00", now).ok).toBe(false);
    expect(parseIstSlot("17/11/2026", "16:00", now).ok).toBe(false);
  });
  it("needs at least 2 hours' notice, so the founder and Sidana see it first", () => {
    // now is 11:30 IST: 13:15 is too soon, 13:30 is exactly 2 hours away.
    expect(parseIstSlot("2026-11-14", "13:15", now)).toMatchObject({ ok: false, error: expect.stringContaining("2 hours") });
    expect(parseIstSlot("2026-11-14", "13:30", now).ok).toBe(true);
  });
  it("offers only times at least 2 hours away today, and every time on later days", () => {
    expect(istToday(now)).toBe("2026-11-14");
    expect(slotsFor("2026-11-14", now)[0]).toBe("13:30");
    expect(slotsFor("2026-11-15", now)).toEqual(allSlots());
    expect(slotsFor("2026-11-14", Date.parse("2026-11-14T13:00:00Z"))).toEqual([]); // 18:30 IST: nothing left
  });
});

describe("meeting notice in chat", () => {
  it("is posted once per call, matched by time", () => {
    const meetings = [{ scheduled_at: "2026-11-18T11:00:00Z" }, { scheduled_at: "2026-11-25T11:00:00Z" }];
    expect(noticesNeeded(meetings, [])).toHaveLength(2);
    // The portal booking and its calendar copy a few minutes apart are the same call.
    expect(noticesNeeded(meetings, [{ meeting_at: "2026-11-18T11:05:00Z" }])).toEqual([meetings[1]]);
  });
  it("shows the time in IST", () => {
    expect(istLabel("2026-11-18T11:00:00Z")).toMatch(/18 Nov 2026 · 4:30 pm IST/);
  });
});

import { cleanAttachmentName, sniffAttachment } from "@/server/validators/chat-attachment";

describe("chat attachments", () => {
  const bytes = (s: string) => new TextEncoder().encode(s);
  const zip = (part: string) => new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...bytes(`....${part}....`)]);
  const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
  it("accepts images, PDF, Office files and CSV by their bytes", () => {
    expect(sniffAttachment(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "a.png")).toMatchObject({ ext: "png", inline: true });
    expect(sniffAttachment(bytes("%PDF-1.7 ..."), "deck.pdf")?.ext).toBe("pdf");
    expect(sniffAttachment(zip("xl/workbook.xml"), "model.xlsx")?.ext).toBe("xlsx");
    expect(sniffAttachment(zip("word/document.xml"), "memo.docx")?.ext).toBe("docx");
    expect(sniffAttachment(zip("ppt/presentation.xml"), "deck.pptx")?.ext).toBe("pptx");
    expect(sniffAttachment(ole, "old.xls")?.ext).toBe("xls");
    expect(sniffAttachment(ole, "old.doc")?.ext).toBe("doc");
    expect(sniffAttachment(bytes("a,b\n1,2"), "cap-table.csv")?.ext).toBe("csv");
  });
  it("refuses macros, executables, HTML, SVG and renamed files", () => {
    expect(sniffAttachment(zip("xl/workbook.xml xl/vbaProject.bin"), "m.xlsm")).toBeNull();
    expect(sniffAttachment(bytes("MZ\x90\x00"), "setup.exe")).toBeNull();
    expect(sniffAttachment(bytes("<html><script>"), "page.html")).toBeNull();
    expect(sniffAttachment(bytes("<svg onload=x>"), "logo.svg")).toBeNull();
    expect(sniffAttachment(bytes("MZ\x90\x00"), "renamed.pdf")).toBeNull();
    expect(sniffAttachment(ole, "thing.msi")).toBeNull();
  });
  it("cleans names", () => {
    expect(cleanAttachmentName("../../etc/Q3 \"deck\".PDF", "pdf")).toBe("Q3 deck.pdf");
  });
});

import { classifyHistory } from "@/server/data/investor/history";

describe("past deals", () => {
  const status = (id: number) => (({ 1: "live", 2: "live", 3: "closed", 4: "live", 5: "closed", 6: "live" }) as Record<number, any>)[id];
  const row = (startup_id: number, days: number, reply_kind: string | null = null, reply_gist: string | null = null) => ({
    startup_id, sent_at: new Date(Date.UTC(2026, 9, days)).toISOString(), reply_kind, reply_gist,
  });
  const out = classifyHistory(
    [
      row(1, 1), row(1, 3, "pass", "Outside our mandate"),
      row(2, 1),
      row(3, 1), row(3, 2, "interested", "Send the deck"),
      row(4, 1), row(4, 2, "interested"),
      row(5, 1),
      row(6, 1), row(6, 2, "pass", "Too early"), row(6, 5, "interested", "Changed our mind"),
    ],
    status,
    new Set([7]),
  );
  const kindOf = (id: number) => out.find((o) => o.startupId === id)?.kind ?? "live";
  it("passes carry the reason from the reply", () => {
    expect(out.find((o) => o.startupId === 1)).toMatchObject({ kind: "passed", said: "Outside our mandate" });
  });
  it("interest in a round that ended didn't close; live interest is active", () => {
    expect(kindOf(3)).toBe("not_closed");
    expect(kindOf(4)).toBe("active");
    expect(kindOf(6)).toBe("active"); // the latest reply wins
  });
  it("deals never answered are no-reply, open or closed", () => {
    expect(out.filter((o) => o.kind === "no_reply").map((o) => [o.startupId, o.open])).toEqual(
      expect.arrayContaining([[2, true], [5, false]]),
    );
  });
});

import { metricValue, suggestThesisChange, triggerMet } from "@/shared/lib/deal-signals";

describe("pass reasons and revisit triggers", () => {
  const months = ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month, i) => ({ month, revenue_inr_l: [10, 11, 12.1, 13.31, 14.641][i], mrr_inr_l: null }));
  it("measures monthly revenue, ARR and growth from uploaded figures", () => {
    expect(metricValue("mrr_l", months, null)).toBe(14.6);
    expect(metricValue("arr_cr", months, 250)).toBe(2.5);
    expect(metricValue("arr_cr", months, null)).toBe(1.8);
    expect(metricValue("growth_pct", months, null)).toBe(10);
    expect(metricValue("growth_pct", months.slice(0, 3), null)).toBeNull();
  });
  it("fires only once the target is reached", () => {
    expect(triggerMet(15, 14.6)).toBe(false);
    expect(triggerMet(14.6, 14.6)).toBe(true);
    expect(triggerMet(1, null)).toBe(false);
  });
  it("turns a reason into a thesis change the investor can tick", () => {
    const s = { sectorCodes: ["EV_CLEAN_MOBILITY", "IOT_SMART_HARDWARE"], stageCode: "PRE_SERIES_A", revenue_inr_l: 180 };
    expect(suggestThesisChange("sector", s)).toMatchObject({ key: "exclude_sector", value: "EV_CLEAN_MOBILITY", label: "Stop showing me EV & clean mobility startups" });
    expect(suggestThesisChange("stage", s)).toMatchObject({ key: "exclude_stage", value: "PRE_SERIES_A" });
    expect(suggestThesisChange("traction", s)).toMatchObject({ key: "min_revenue", value: 360 });
    expect(suggestThesisChange("valuation", s)).toBeNull();
  });
  it("learned rules keep startups out of matches", () => {
    const base = { sectors: ["FINTECH_PAYMENTS"], stages: [], chequeMinCr: null, chequeMaxCr: null, source: "portal" as const };
    const row = { name: "A", sector: "Fintech", subsector: null, status: "live", ask_current_cr: 5, ask_amount: 5, ask_currency: "INR", allocation_left_amount: 2, sector_codes: ["FINTECH_PAYMENTS"], business_model: null, profile_active: true, raise_cr: null, arr_cr: null };
    const st = [
      { ...row, id: 1, stage: "Seed", stage_code: "SEED", revenue_inr_l: 100 },
      { ...row, id: 2, stage: "Series A", stage_code: "SERIES_A", revenue_inr_l: 400 },
    ] as MatchStartup[];
    expect(matchStartups(st, { ...base, excludedStages: ["SEED"] }).map((r) => r.startup.id)).toEqual([2]);
    expect(matchStartups(st, { ...base, minRevenueL: 200 }).map((r) => r.startup.id)).toEqual([2]);
    expect(matchStartups(st, { ...base, excludedSectors: ["FINTECH_PAYMENTS"] })).toEqual([]);
  });
});

import { thesisDiff } from "@/server/data/investor/thesis-writeback";

describe("thesis write-back to INVESTOR_CRITERIA", () => {
  const base = { sectors: ["HRTECH", "SAAS_ENTERPRISE"], stages: ["SEED", "TRACTION"], chequeMinCr: 1, chequeMaxCr: 5 };
  it("sends only what the investor changed", () => {
    expect(thesisDiff(base, { ...base, sectors: ["HRTECH"] })).toEqual({ sector_mode: "LIST", sectors_in: ["HRTECH"] });
    expect(thesisDiff(base, { ...base, chequeMaxCr: 8 })).toEqual({ cheque_max_cr: 8 });
    expect(thesisDiff(base, { ...base, sectors: ["SAAS_ENTERPRISE", "HRTECH"] })).toEqual({});
  });
  it("turns picked stages into the sheet's min-max range, and none into no limit", () => {
    expect(thesisDiff(base, { ...base, stages: ["SERIES_A", "PRE_SEED"] })).toEqual({ stage_min: "PRE_SEED", stage_max: "SERIES_A" });
    expect(thesisDiff(base, { ...base, stages: [] })).toEqual({ stage_min: "", stage_max: "" });
  });
  it("maps 'any sector' to AGNOSTIC and leaves the researched list alone", () => {
    expect(thesisDiff(base, { ...base, sectors: ["ANY"] })).toEqual({ sector_mode: "AGNOSTIC" });
  });
});
