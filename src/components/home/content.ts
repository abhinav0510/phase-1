// Copy and data for the public homepage. Edit here, not inside components.
// Company names are deliberately absent: mandates are described by sector only.

export const HOME_NAV = [
  { label: "Selected mandates", href: "#work" },
  { label: "How we help", href: "#services" },
  { label: "From the deal desk", href: "#desk" },
  { label: "Start your raise", href: "#contact" },
] as const;

export const HERO = {
  headline: ["We’re the advisors", "you want in the room."] as const,
  sub:
    "Sidana Ventures is a fundraising advisory and investor-relations firm for startups. " +
    "We build your investment memo, match you to the investors who actually fit, " +
    "run the outreach and the meetings, and stay with you through to the term sheet.",
};

export const ASK_CHIPS = [
  "How does investor matching work?",
  "What stages and sectors do you work with?",
  "Show me startups you’ve worked with",
  "How is Sidana different from a broker?",
] as const;

export const SECTORS = [
  "IoT",
  "Mobility",
  "HealthTech",
  "EdTech",
  "HR Tech",
  "FoodTech",
  "Consumer",
  "AI & Deep Tech",
  "Cybersecurity",
  "SaaS",
  "Wellness",
] as const;

export type Mandate = {
  title: string;
  /** Lede split around the bold figure: [before, bold, after]. */
  lede: readonly [string, string, string];
  visual: "pipeline" | "meetings" | "memo";
};

export const MANDATES: readonly Mandate[] = [
  {
    title: "Smart-building access",
    lede: [
      "An IoT company selling wireless access control to commercial buildings. Sidana built the investment memo, ran the investor outreach, and managed ",
      "25 investor meetings",
      " for the round.",
    ],
    visual: "pipeline",
  },
  {
    title: "Doorstep vehicle care",
    lede: [
      "A mobility platform bringing vehicle care and ownership to the customer’s door. We ran a structured process — memo, matching, outreach and follow-ups — and ",
      "28 investor meetings",
      ", each prepped and debriefed.",
    ],
    visual: "meetings",
  },
  {
    title: "AI diagnostics",
    lede: [
      "A healthtech company building diagnostic intelligence for clinicians. We rebuilt the story as an investment memo an analyst could defend internally, then took it to market: ",
      "22 investor meetings",
      " and a live weekly report to the founders.",
    ],
    visual: "memo",
  },
];

export const HELP_ROWS = [
  {
    quote: "We’ve emailed two hundred investors and heard back from four.",
    answer: "We match you only to investors whose thesis actually fits — then follow up until they answer.",
    service: "Investor matching & outreach",
    aria: "Talk to us about investor matching",
  },
  {
    quote: "Our deck is fine. Investors just don’t seem to get it.",
    answer: "We rebuild the story as an investment memo an analyst can defend inside their own fund.",
    service: "Investment memo & deck",
    aria: "Talk to us about your memo",
  },
  {
    quote: "We don’t know what to ask for — or at what valuation.",
    answer: "We size the round and frame the terms on what investors are writing cheques for right now.",
    service: "Fundraising strategy",
    aria: "Talk to us about round strategy",
  },
  {
    quote: "Meetings happen. Then everything goes quiet.",
    answer: "We run the process end to end: prep, debrief, follow-up, and the push to a signed term sheet.",
    service: "Deal execution",
    aria: "Talk to us about deal execution",
  },
  {
    quote: "Our existing investors ask how the raise is going. We never have a good answer.",
    answer: "Every founder gets a live dashboard and a Saturday report: investors reached, meetings, passes and feedback.",
    service: "Investor relations & reporting",
    aria: "Talk to us about investor relations",
  },
] as const;

/** Size of the investor network shown on the deal-desk stat card. */
export const NETWORK_SIZE = 311;

export const DESK = {
  noteOne: {
    quote: "The best fundraising process is boring: predictable, measured, relentless.",
    more: "Why the founders who close fastest are rarely the ones with the flashiest decks.",
  },
  report: {
    title: "Why we send every founder a report on Saturday",
    more: "Reach, meetings, passes, feedback — the same four numbers every week, so nobody has to guess how the raise is going.",
  },
  network: {
    title: "active investors, tagged by sector, stage and cheque size.",
    more: "Angels, angel networks, syndicates, micro VCs, seed funds, institutional VCs and family offices.",
  },
  pass: {
    title: "Reading an investor pass: what “too early” actually means",
    more: "Most passes are about fit, not quality. Here’s how we read them — and what we change next.",
  },
  memo: {
    quote: "A good memo answers the question the investor hasn’t asked yet.",
    more: "The five sections every Sidana investment memo has, and why the order matters.",
  },
  event: {
    title: "Founder office hours",
    more: "Fortnightly, online. Thirty minutes on your raise with a Sidana deal owner — no pitch required.",
  },
} as const;

export const CTA = {
  headline: ["You’ve got a round to raise.", "We’re listening."] as const,
  sub: "Tell us where you are and we’ll take it from there.",
  mailSubject: "Starting a raise",
};

export const ASK_MAIL_SUBJECT = "Question about raising with Sidana";
