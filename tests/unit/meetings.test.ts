import { describe, expect, it } from "vitest";
import { toFounderMeetings } from "@/server/data/meetings";
import type { Meeting } from "@/shared/types/db";

let nextId = 1;
function row(notes: string | null, extra: Partial<Meeting> = {}): Meeting {
  return {
    id: nextId++,
    startup_id: 4,
    investor_id: null,
    scheduled_at: "2026-10-01T05:30:00Z",
    held: null,
    is_second: false,
    source: "email",
    from_matcher: false,
    fireflies_id: null,
    meet_link: null,
    notes,
    created_at: "2026-10-01T00:00:00Z",
    startup_name: null,
    investor_name: null,
    in_book: true,
    ...extra,
  } as Meeting;
}

const names = new Map([[28, "Atomic Capital"], [99, "NORTHERN ARC"], [78, "India Accelerator - Vasu"]]);
const run = (rows: Meeting[], startup = "Bon Cuisine") => toFounderMeetings(rows, startup, names);
const nameOf = (notes: string | null, extra: Partial<Meeting> = {}, startup?: string) =>
  run([row(notes, extra)], startup)[0]?.investor_name;

describe("meeting names", () => {
  it("takes the investor from the right of the title", () => {
    expect(nameOf("Bon Cuisine <> Northern Arc | Sidana Ventures")).toBe("Northern Arc");
  });
  it("takes the investor from the left when the startup is on the right", () => {
    expect(nameOf("Lok Capital <> Bon Cuisine and Sidana Ventures")).toBe("Lok Capital");
  });
  it("copes with a stray I used as a pipe", () => {
    expect(nameOf("Northern Arc <> Bon cuisine I Sidana Ventures")).toBe("Northern Arc");
  });
  it("copes with a prefix like Meeting:", () => {
    expect(nameOf("Meeting: Bon Cuisine <> Atomic")).toBe("Atomic");
  });
  it("copes with no spaces and with < >", () => {
    expect(nameOf("Bon Cuisine<>Atomic Capital and Sidana Ventures")).toBe("Atomic Capital");
    expect(nameOf("Bon Cuisine < > Nabventures and Sidana Ventures")).toBe("Nabventures");
  });
  it("trusts the title over a wrong investor link", () => {
    expect(nameOf("Bon Cuisine <> Accel and Sidana Ventures", { investor_id: 78, investor_name: "India Accelerator - Vasu" })).toBe("Accel");
  });
  it("drops notes about the meeting but keeps names in brackets", () => {
    expect(nameOf("Bon Cuisine <> Atomic Capital (Office Physical Meeting) and Sidana Ventures")).toBe("Atomic Capital");
    expect(nameOf("Bon Cuisine <> IvyCap Ventures (2nd) and Sidana Ventures")).toBe("IvyCap Ventures");
    expect(nameOf("Bon Cuisine <> Aryan (Peak XV)")).toBe("Aryan (Peak XV)");
  });
  it("uses the saved name when the title has no <>", () => {
    expect(nameOf("Bon Cuisine and Mandeep Singh", { investor_id: 28, investor_name: "Mandeep Singh" })).toBe("Mandeep Singh");
  });
  it("falls back to the investor list by id", () => {
    expect(nameOf("Bon Cuisine and Someone", { investor_id: 99 })).toBe("NORTHERN ARC");
    expect(nameOf(null, { investor_id: 28 })).toBe("Atomic Capital");
  });
  it("matches the startup name ignoring case and spacing", () => {
    expect(nameOf("Vinners <> ServeAmigo", {}, "Serve Amigo")).toBe("Vinners");
  });
  it("uses the right side when no side is clearly the startup", () => {
    expect(nameOf("Foo <> Bar", {}, null as unknown as string)).toBe("Bar");
  });
});

describe("which meetings a founder sees", () => {
  const hidden = [
    "Bon Cuisine (Internal S.V Team Discussion) and Sidana Ventures",
    "Orbo AI <> Sidana Ventures | Internal Meeting",
    "Orbis Lives (Internal SV team meeting) and Sidana Ventures",
    "Bon-Cuisine (Final Rehearsal) and SV SHARKS 5.0",
    "Canceled: Bon Cuisine <> Atomic Capital and Sidana Ventures",
    "Cancelled: Bon Cuisine <> Atomic Capital",
    "Talent Recruit <> PR/Media and Sidana Ventures",
    "Talent Recruit <> Founder call (Alok Gupta) | Sidana Ventures",
    "MOU: Sidana Ventures <> Vira Jal",
    "Eosnox Health Labs <> Sidana Ventures and Sidana Ventures",
    "Xproguard <> Mr. Rakesh Sidana and Sidana Ventures",
    "Physical Office Meeting : SIDANA VENTURES <> SLICE DUBAI (AD SINGH)",
  ];
  it.each(hidden)("hides %s", (title) => {
    expect(run([row(title, { in_book: false })])).toHaveLength(0);
    expect(run([row(title, { in_book: true, investor_id: 28 })])).toHaveLength(0);
  });

  it("hides a meeting with no <> and no investor link", () => {
    expect(run([row("Vikash (Bon Cuisine) - Office Meeting and Sidana Ventures", { in_book: false })])).toHaveLength(0);
  });
  it("hides a linked investor row that is outside the book and has no <>", () => {
    expect(run([row("Paper Arizona and Sidana Ventures LLP", { in_book: false, investor_id: 28 })])).toHaveLength(0);
  });
  it("keeps a real investor who is not in the investor list", () => {
    expect(nameOf("CLIKD <> VINNERS and Sidana Ventures", { in_book: false }, "Clikd")).toBe("VINNERS");
  });
  it("keeps an office meeting with a real investor", () => {
    expect(run([row("Bon Cuisine <> Atomic Capital (Office Physical Meeting) and Sidana Ventures", { investor_id: 28 })])).toHaveLength(1);
  });
});

describe("duplicate meetings", () => {
  const title = "Bon Cuisine <> Atomic Capital and Sidana Ventures";

  it("collapses rows for the same meeting into one", () => {
    expect(run([row(title, { investor_id: 28 }), row(title, { investor_id: 28, investor_name: "Atomic Capital" })])).toHaveLength(1);
  });
  it("collapses rows linked to different investors but with the same title", () => {
    expect(run([row(title, { investor_id: 28 }), row(title, { investor_id: 78 })])).toHaveLength(1);
  });
  it("keeps the same investor at different times", () => {
    expect(run([row(title), row(title, { scheduled_at: "2026-10-02T05:30:00Z" })])).toHaveLength(2);
  });
  it("keeps different investors at the same time", () => {
    expect(run([row(title), row("Bon Cuisine <> Arkam Ventures")])).toHaveLength(2);
  });
  it("uses the flags from the row that had a saved name", () => {
    const [m] = run([row(title, { is_second: false }), row(title, { is_second: true, investor_name: "Atomic Capital" })]);
    expect(m.is_second).toBe(true);
    expect(m.investor_name).toBe("Atomic Capital");
  });
  it("marks a meeting held if any copy was held, and keeps the link and transcript", () => {
    const [m] = run([
      row(title, { held: true }),
      row(title, { meet_link: "https://meet.example.test/x", fireflies_id: "ff1" }),
    ]);
    expect(m.held).toBe(true);
    expect(m.meet_link).toBe("https://meet.example.test/x");
    expect(m.fireflies_id).toBe("ff1");
  });
  it("does not change the rows it was given", () => {
    const input = row(title);
    run([input]);
    expect(input.investor_name).toBeNull();
  });
});
