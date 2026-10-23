// Hand-authored types mirroring the live Supabase schema (inspected 2026-10-21).
// Source of truth is the database; keep in sync with migrations.

export type UserRole =
  | "owner"
  | "ops"
  | "deals_desk"
  | "angel_desk"
  | "founder"
  | "investor";

export const ADMIN_ROLES: UserRole[] = ["owner", "ops", "deals_desk", "angel_desk"];
export const FOUNDER_ROLES: UserRole[] = ["founder"];
export const INVESTOR_ROLES: UserRole[] = ["investor"];

export type StartupStatus =
  | "live"
  | "a1_ready"
  | "a2_waiting"
  | "term_sheet"
  | "closed"
  | "silent"
  | "blocked"
  | "mandate_closed";

export type Bucket = "HOT10" | "A" | "B" | "C" | "UNASSIGNED";

export type InvestorType =
  | "angel"
  | "angel_network"
  | "syndicate"
  | "micro_vc"
  | "seed_fund"
  | "institutional_vc"
  | "family_office"
  | "other";

export type InvestorStatus =
  | "active"
  | "engaged"
  | "pending"
  | "paused"
  | "passed_all"
  | "do_not_contact";

export type MatchType =
  | "strict"
  | "perfect"
  | "sector_only"
  | "stage_off"
  | "below_min_cheque";

export type MatchState = "queued" | "sent" | "paused" | "tracker_only" | "not_queued";

export type DocClass = "strong" | "weak" | "needs_review";

export type Channel = "email" | "linkedin" | "whatsapp" | "call" | "event" | "referral";

export interface AppUser {
  id: string; // uuid == supabase auth user id
  email: string | null;
  full_name: string | null;
  role: UserRole;
  startup_id: number | null;
  investor_id: number | null;
  active: boolean;
  created_at: string;
}

export interface Startup {
  id: number;
  name: string | null;
  sector: string | null;
  subsector: string | null;
  stage: string | null;
  bucket: Bucket | null;
  owner_name: string | null;
  status: StartupStatus | null;
  ask_current_cr: number | null;
  ask_reset_cr: number | null;
  reset_written_at: string | null;
  revenue_note: string | null;
  revenue_inr_l: number | null;
  burn_inr_l: number | null;
  runway_months: number | null;
  score: number | null;
  scored_at: string | null;
  rule_tier: string | null;
  mandate_signed_on: string | null;
  mandate_closed_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  ask_currency: string | null;
  ask_amount: number | null;
  ask_as_written: string | null;
  ask_source: string | null;
  ask_updated_on: string | null;
  allocation_left_amount: number | null;
  allocation_left_as_written: string | null;
  allocation_source: string | null;
  allocation_updated_on: string | null;
}

export interface Investor {
  id: number;
  name: string | null;
  contact_person: string | null;
  email: string | null;
  cc_email: string | null;
  linkedin_url: string | null;
  type: InvestorType | null;
  status: InvestorStatus | null;
  sectors: string[] | null;
  stage_pref: string[] | null;
  cheque_min_cr: number | null;
  cheque_max_cr: number | null;
  cheque_as_written: string | null;
  geography: string | null;
  do_not_contact: boolean | null;
  suppressed: boolean | null;
  last_contacted_on: string | null;
  thesis_call_on: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface FundingRound {
  id: number;
  startup_id: number;
  closed_on: string | null;
  amount: number | null;
  currency: string | null;
  as_written: string | null;
  instrument: string | null;
  round_name: string | null;
  lead_investor_id: number | null;
  lead_investor_name: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
}

export interface Doc {
  id: number;
  startup_id: number | null;
  investor_id: number | null;
  doc_type: string | null;
  requested_at: string | null;
  received_at: string | null;
  classification: DocClass | null;
  classify_note: string | null;
  chaser_count: number | null;
  last_chased_at: string | null;
  created_at: string;
}

export interface Match {
  id: number;
  startup_id: number;
  investor_id: number;
  type: MatchType | null;
  state: MatchState | null;
  score: number | null;
  stage_fit: boolean | null;
  cheque_fit: boolean | null;
  priority: number | null;
  created_at: string;
}

export interface Meeting {
  id: number;
  startup_id: number | null;
  investor_id: number | null;
  scheduled_at: string | null;
  held: boolean | null;
  is_second: boolean | null;
  source: Channel | null;
  from_matcher: boolean | null;
  fireflies_id: string | null;
  meet_link: string | null;
  notes: string | null;
  created_at: string;
  startup_name: string | null;
  investor_name: string | null;
  in_book: boolean | null;
}

// Weekly fundraising report, written by the n8n "Weekly Founder Update" workflow
// (one row per startup per completed work week). The workflow emails these to
// founders; this table is an additive mirror so the founder dashboard can show
// the same figures. Written only by the n8n service-role branch — the app reads.
export interface WeeklyReport {
  id: number;
  startup_id: number | null;
  startup_key: string;
  startup_name: string | null;
  week_start: string; // ISO date (Monday)
  week_end: string | null; // ISO date (Friday)
  owner_name: string | null;
  founder_name: string | null;
  reached: number;
  followups: number;
  passed: number;
  meetings: number;
  feedback_count: number;
  meeting_list: string[];
  passed_list: string[];
  feedback_list: string[];
  subject: string | null;
  report_html: string | null;
  sent_to: string | null;
  source: string | null;
  created_at: string;
  updated_at: string | null;
}
