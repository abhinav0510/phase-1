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

export type ProfileStatus = "draft" | "submitted" | "approved" | "changes_requested";

export type BroadcastAudience = "all" | "selected" | "custom" | "test";
export type BroadcastStatus = "queued" | "sending" | "sent" | "partial" | "failed";

export type AnnouncementKind = "update" | "change" | "maintenance" | "info";
export type AnnouncementAudience = "all" | "founders" | "team";
