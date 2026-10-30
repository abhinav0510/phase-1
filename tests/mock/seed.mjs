// Demo data for the fake Supabase in server.mjs. Every name is made up and every
// address is on the reserved .test domain. Nothing here reaches the real database.
export const PASSWORD = "demo-password-1";

export const STARTUP = { alpha: 101, beta: 102, gamma: 103, delta: 104, epsilon: 105, zeta: 106, eta: 107 };
export const INVESTOR = { capital: 201, passed: 202, paused: 203, queued: 204, betaOnly: 205 };

/** Text that belongs only to Demo Beta. Founder Alpha must never see it. */
export const BETA_SECRET = "BETA-SECRET-MARKER";
/** Investor contact details that must never reach a founder. */
export const INVESTOR_CONTACTS = ["hidden.partner@demo-capital.test", "Hidden Partner", "linkedin.com/in/hidden-partner", "98765 43210"];

const iso = (daysFromNow, hour = 10) => {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
};
const date = (daysFromNow) => iso(daysFromNow).slice(0, 10);
const NOW = "2026-10-01T10:00:00Z";

const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const USER = {
  team: uid(1),
  alpha: uid(101),
  beta: uid(102),
  gamma: uid(103),
  delta: uid(104),
  epsilon: uid(105),
  inactive: uid(106),
  zeta: uid(107),
  eta: uid(108),
};

function startup(id, name, extra = {}) {
  return {
    id, name, sector: "FoodTech", subsector: "Demo niche", stage: "Seed", bucket: "HOT10", owner_name: "Demo Owner", status: "live",
    ask_current_cr: 5, ask_reset_cr: null, reset_written_at: null, revenue_note: null, revenue_inr_l: null, burn_inr_l: null,
    runway_months: null, score: null, scored_at: null, rule_tier: null, mandate_signed_on: "2026-01-15", mandate_closed_on: null,
    notes: null, created_at: NOW, updated_at: NOW, ask_currency: "INR", ask_amount: 5, ask_as_written: "INR 5 Cr", ask_source: "demo call",
    ask_updated_on: "2026-09-04", allocation_left_amount: null, allocation_left_as_written: null, allocation_source: null, allocation_updated_on: null,
    ...extra,
  };
}

function investor(id, name, extra = {}) {
  return {
    id, name, contact_person: "Hidden Partner", email: "hidden.partner@demo-capital.test", cc_email: null,
    linkedin_url: "https://linkedin.com/in/hidden-partner", type: "vc", status: "active", sectors: ["foodtech", "saas"],
    stage_pref: ["seed", "pre_series_a"], cheque_min_cr: 2, cheque_max_cr: 10, cheque_as_written: "INR 2-10 Cr", geography: "India",
    do_not_contact: false, suppressed: false, last_contacted_on: null, thesis_call_on: null, source: "demo", notes: "internal desk note",
    created_at: NOW, updated_at: NOW,
    ...extra,
  };
}

function meeting(id, startupId, title, at, extra = {}) {
  return {
    id, startup_id: startupId, investor_id: null, scheduled_at: at, held: null, is_second: false, source: "email", from_matcher: false,
    fireflies_id: null, meet_link: null, notes: title, created_at: NOW, startup_name: null, investor_name: null, in_book: true,
    ...extra,
  };
}

function report(id, startupId, weekStart, source, sentTo, extra = {}) {
  return {
    id, startup_id: startupId, startup_key: `s${startupId}`, startup_name: `S${startupId}`, week_start: weekStart, week_end: null,
    owner_name: "Demo Owner", founder_name: "Demo Founder", reached: 5, followups: 2, passed: 1, meetings: 1, feedback_count: 0,
    meeting_list: [], passed_list: [], feedback_list: [], subject: "Weekly update", report_html: null, sent_to: sentTo, source,
    created_at: NOW, updated_at: NOW,
    ...extra,
  };
}

export function buildSeed() {
  const startups = [
    startup(STARTUP.alpha, "Demo Alpha Foods", {
      revenue_inr_l: 250, burn_inr_l: 12, runway_months: 14, revenue_note: "Demo run-rate note",
      allocation_left_as_written: "INR 2 Cr", score: 80, rule_tier: "A",
    }),
    startup(STARTUP.beta, "Demo Beta Labs", { sector: "HealthTech", notes: BETA_SECRET, revenue_note: BETA_SECRET, status: "blocked", ask_as_written: "INR 99 Cr" }),
    startup(STARTUP.gamma, "Demo Gamma Robotics", { sector: "DeepTech" }),
    startup(STARTUP.delta, "Demo Delta Retail", { sector: "D2C" }),
    startup(STARTUP.epsilon, "Demo Epsilon Fintech", { sector: "FinTech", stage: "Series A" }),
    startup(STARTUP.zeta, "Demo Zeta Mobility", { sector: "Mobility" }),
    startup(STARTUP.eta, "Demo Eta Empty", { sector: null, stage: null, owner_name: null, ask_as_written: null, ask_amount: null, ask_current_cr: null, ask_updated_on: null }),
  ];

  const users = [
    { id: USER.team, email: "team@sidana.test", password: PASSWORD, app_metadata: {} },
    { id: USER.alpha, email: "s101@founders.sidana.local", password: PASSWORD, app_metadata: {} },
    { id: USER.beta, email: "s102@founders.sidana.local", password: PASSWORD, app_metadata: {} },
    { id: USER.gamma, email: "s103@founders.sidana.local", password: PASSWORD, app_metadata: { must_reset: true } },
    { id: USER.delta, email: "s104@founders.sidana.local", password: PASSWORD, app_metadata: {} },
    { id: USER.epsilon, email: "s105@founders.sidana.local", password: PASSWORD, app_metadata: {} },
    { id: USER.inactive, email: "inactive@sidana.test", password: PASSWORD, app_metadata: {} },
    { id: USER.zeta, email: "s106@founders.sidana.local", password: PASSWORD, app_metadata: {} },
    { id: USER.eta, email: "s107@founders.sidana.local", password: PASSWORD, app_metadata: {} },
  ];

  const appUser = (id, email, role, startupId, active = true) => ({
    id, email, full_name: email.split("@")[0], role, startup_id: startupId, investor_id: null, active, created_at: NOW,
  });

  return {
    users,
    tables: {
      startups,
      app_users: [
        appUser(USER.team, "team@sidana.test", "owner", null),
        appUser(USER.alpha, "s101@founders.sidana.local", "founder", STARTUP.alpha),
        appUser(USER.beta, "s102@founders.sidana.local", "founder", STARTUP.beta),
        appUser(USER.gamma, "s103@founders.sidana.local", "founder", STARTUP.gamma),
        appUser(USER.delta, "s104@founders.sidana.local", "founder", STARTUP.delta),
        appUser(USER.epsilon, "s105@founders.sidana.local", "founder", STARTUP.epsilon),
        appUser(USER.inactive, "inactive@sidana.test", "owner", null, false),
        appUser(USER.zeta, "s106@founders.sidana.local", "founder", STARTUP.zeta),
        appUser(USER.eta, "s107@founders.sidana.local", "founder", STARTUP.eta),
      ],
      investors: [
        investor(INVESTOR.capital, "Demo Capital"),
        investor(INVESTOR.passed, "Passed Partners", { type: "family_office", sectors: ["d2c"], geography: "Global" }),
        investor(INVESTOR.paused, "Paused Fund Internal"),
        investor(INVESTOR.queued, "Queue Ventures"),
        investor(INVESTOR.betaOnly, `Beta Only Ventures`),
      ],
      matches: [
        { id: 1, startup_id: STARTUP.alpha, investor_id: INVESTOR.capital, type: "exact", state: "sent", score: 90, stage_fit: true, cheque_fit: true, priority: 1, created_at: NOW },
        { id: 2, startup_id: STARTUP.alpha, investor_id: INVESTOR.passed, type: "exact", state: "sent", score: 70, stage_fit: true, cheque_fit: false, priority: 2, created_at: NOW },
        { id: 3, startup_id: STARTUP.alpha, investor_id: INVESTOR.paused, type: "stage_off", state: "paused", score: 40, stage_fit: false, cheque_fit: false, priority: 3, created_at: NOW },
        { id: 4, startup_id: STARTUP.alpha, investor_id: INVESTOR.queued, type: "exact", state: "queued", score: 60, stage_fit: true, cheque_fit: true, priority: 4, created_at: NOW },
        { id: 5, startup_id: STARTUP.beta, investor_id: INVESTOR.betaOnly, type: "exact", state: "sent", score: 60, stage_fit: true, cheque_fit: true, priority: 1, created_at: NOW },
      ],
      mail_log: [
        { id: 1, startup_id: STARTUP.alpha, investor_id: INVESTOR.capital, sent_at: iso(-3), reply_kind: "invite", subject: "Re: Demo Alpha", reply_gist: "Happy to meet. Write to hidden.partner@demo-capital.test, call +91 98765 43210 or see linkedin.com/in/hidden-partner" },
        { id: 2, startup_id: STARTUP.alpha, investor_id: INVESTOR.passed, sent_at: iso(-5), reply_kind: "pass", subject: "Re: Demo Alpha", reply_gist: "Too early for our fund right now" },
        { id: 3, startup_id: STARTUP.alpha, investor_id: INVESTOR.queued, sent_at: iso(-1), reply_kind: null, subject: "Outbound", reply_gist: null },
        { id: 4, startup_id: STARTUP.beta, investor_id: INVESTOR.betaOnly, sent_at: iso(-2), reply_kind: "pass", subject: "Re: Beta", reply_gist: BETA_SECRET },
      ],
      meetings: [
        // Upcoming, with a join link.
        meeting(1, STARTUP.alpha, "Demo Alpha Foods <> Demo Capital | Sidana Ventures", iso(5), { investor_id: INVESTOR.capital, meet_link: "https://meet.example.test/abc" }),
        // The same meeting stored twice: one named, one not.
        meeting(2, STARTUP.alpha, "Demo Alpha Foods <> Twice Saved Ventures and Sidana Ventures", iso(-10), { investor_id: INVESTOR.capital, investor_name: "Demo Capital" }),
        meeting(3, STARTUP.alpha, "Demo Alpha Foods <> Twice Saved Ventures and Sidana Ventures", iso(-10), { investor_id: INVESTOR.capital }),
        // Investor on the left of the title, with a stray "I" for the pipe.
        meeting(4, STARTUP.alpha, "Left Side Capital <> Demo Alpha Foods I Sidana Ventures", iso(-12), { investor_id: INVESTOR.capital }),
        // Real investor who is not in the investor list.
        meeting(5, STARTUP.alpha, "Demo Alpha Foods <> Not Listed Fund and Sidana Ventures", iso(-14), { in_book: false }),
        // No usable title: the name comes from the investor list.
        meeting(6, STARTUP.alpha, "", iso(-16), { investor_id: INVESTOR.queued }),
        // Never shown to a founder.
        meeting(7, STARTUP.alpha, "Demo Alpha Foods (Internal S.V Team Discussion) and Sidana Ventures", iso(-18), { in_book: false, investor_name: "Internal S.V Team" }),
        meeting(8, STARTUP.alpha, "Demo Alpha Foods and SV SHARKS 5.0", iso(-19), { in_book: false, investor_name: "SHARKS 5.0" }),
        meeting(9, STARTUP.alpha, "Canceled: Demo Alpha Foods <> Cancelled Capital and Sidana Ventures", iso(-20), { investor_id: INVESTOR.capital }),
        meeting(10, STARTUP.alpha, "Demo Alpha Foods <> Mr. Rakesh Sidana", iso(-21), { in_book: false }),
        // Held meeting.
        meeting(11, STARTUP.alpha, "Demo Alpha Foods <> Held Ventures", iso(-25), { investor_id: INVESTOR.capital, held: true }),
        // Belongs to another startup.
        meeting(12, STARTUP.beta, `Demo Beta Labs <> ${BETA_SECRET}`, iso(-2), { investor_id: INVESTOR.betaOnly }),
      ],
      weekly_reports: [
        report(1, STARTUP.alpha, "2026-10-19", "weekly", "alpha.founder@demo.test", {
          week_end: "2026-10-23", reached: 12, followups: 3, passed: 1, meetings: 2, feedback_count: 1,
          meeting_list: ["Demo Capital"], passed_list: ["Passed Partners"], feedback_list: ["Liked the traction"],
        }),
        report(2, STARTUP.alpha, "2026-10-05", "backfill-recomputed", null, { week_end: "2026-10-09", reached: 7 }),
        report(3, STARTUP.alpha, "2026-10-26", "weekly-dashboard-only", null, { reached: 999 }),
        report(4, STARTUP.alpha, "2026-09-28", "backfill-dashboard-only", null, { reached: 998 }),
        report(5, STARTUP.beta, "2026-10-19", "weekly", "beta@demo.test", { reached: 777, feedback_list: [BETA_SECRET] }),
      ],
      startup_decks: [
        { id: 1, startup_id: STARTUP.alpha, sheet_name: "Demo Alpha Foods", deck_link: "https://bit.ly/demo-alpha", resolved_url: "https://drive.google.com/file/d/DEMOFILEID12345/view", drive_file_id: "DEMOFILEID12345", link_kind: "google", synced_at: NOW, created_at: NOW },
        { id: 2, startup_id: STARTUP.delta, sheet_name: "Demo Delta", deck_link: "https://example.test/deck.pdf", resolved_url: null, drive_file_id: null, link_kind: "external", synced_at: NOW, created_at: NOW },
      ],
      startup_contacts: [
        { id: 1, startup_id: STARTUP.alpha, email: "alpha.founder@demo.test", founder_name: "Alpha Founder" },
        { id: 2, startup_id: STARTUP.alpha, email: "alpha.cofounder@demo.test", founder_name: "Alpha Founder" },
        { id: 3, startup_id: STARTUP.beta, email: "beta.founder@demo.test", founder_name: "Beta Founder" },
        { id: 4, startup_id: STARTUP.delta, email: "delta.founder@demo.test", founder_name: "Delta Founder" },
        // One address on two startups can't be used to sign in.
        { id: 5, startup_id: STARTUP.alpha, email: "shared@demo.test", founder_name: "Shared" },
        { id: 6, startup_id: STARTUP.beta, email: "shared@demo.test", founder_name: "Shared" },
      ],
      contact_sync_runs: [{ id: 1, ran_at: iso(-1), trigger: "schedule", rows_read: 6, matched_startups: 3, emails: 6, unmatched: [{ name: "Ghost Startup", emails: 1 }] }],
      startup_profiles: [
        {
          id: 1, startup_id: STARTUP.epsilon, status: "submitted", submitted_at: iso(-1), reviewed_at: null, reviewed_by: null, reviewed_by_email: null, review_note: null,
          updated_by: USER.epsilon, created_at: NOW, updated_at: NOW, approved_answers: null,
          answers: { one_liner: "Demo fintech one-liner", revenue_inr_l: "75", sector: "FinTech" },
        },
      ],
      startup_branding: [],
      funding_rounds: [
        { id: 1, startup_id: STARTUP.alpha, closed_on: "2025-06-01", amount: 1, currency: "INR", as_written: "INR 1 Cr", instrument: "SAFE", round_name: "Pre-seed", lead_investor_id: null, lead_investor_name: "Demo Lead Angel", notes: null, source: "demo", created_at: NOW },
        { id: 2, startup_id: STARTUP.beta, closed_on: "2025-06-01", amount: 9, currency: "INR", as_written: BETA_SECRET, instrument: "SAFE", round_name: "Beta round", lead_investor_id: null, lead_investor_name: null, notes: null, source: "demo", created_at: NOW },
      ],
      docs: [
        { id: 1, startup_id: STARTUP.alpha, investor_id: INVESTOR.capital, doc_type: "MIS", requested_at: iso(-4), received_at: null, classification: null, classify_note: null, chaser_count: 2, last_chased_at: iso(-1), created_at: NOW },
        { id: 2, startup_id: STARTUP.alpha, investor_id: INVESTOR.capital, doc_type: "Cap table", requested_at: iso(-9), received_at: iso(-2), classification: null, classify_note: null, chaser_count: 0, last_chased_at: null, created_at: NOW },
      ],
      announcements: [
        { id: 1, title: "Demo live announcement", body: "Visible to founders", kind: "info", audience: "all", is_active: true, publish_at: iso(-2), expires_at: null, created_by: USER.team, created_by_email: "team@sidana.test", created_at: NOW },
        { id: 2, title: "Demo expired announcement", body: "Should be hidden", kind: "info", audience: "all", is_active: true, publish_at: iso(-9), expires_at: iso(-1), created_by: USER.team, created_by_email: "team@sidana.test", created_at: NOW },
        { id: 3, title: "Demo team-only announcement", body: "Should be hidden from founders", kind: "info", audience: "team", is_active: true, publish_at: iso(-2), expires_at: null, created_by: USER.team, created_by_email: "team@sidana.test", created_at: NOW },
        { id: 4, title: "Demo inactive announcement", body: "Should be hidden", kind: "info", audience: "all", is_active: false, publish_at: iso(-2), expires_at: null, created_by: USER.team, created_by_email: "team@sidana.test", created_at: NOW },
      ],
      // Everyone has already seen the live notices, except Founder Beta, who tests the
      // popup. Otherwise the popup would sit on top of every other test's clicks.
      announcement_dismissals: [USER.team, USER.alpha, USER.gamma, USER.delta, USER.epsilon, USER.zeta, USER.eta, USER.inactive].flatMap((user_id, i) =>
        [1, 3].map((announcement_id) => ({ id: i * 10 + announcement_id, user_id, announcement_id })),
      ),
      email_broadcasts: [],
      email_broadcast_recipients: [],
    },
  };
}

export { date };
