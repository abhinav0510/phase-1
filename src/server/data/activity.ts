import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { PortalName } from "@/shared/types/db";

/**
 * Portal activity log (clause 2.11). Every investor-portal action and the new
 * founder actions are written here for admins. Logging never blocks or fails
 * the action itself: a failed write is reported to the server log only.
 * Never pass chat text or other private content in `meta`.
 */
export type PortalAction =
  | "signed_in"
  | "access_granted"
  | "access_revoked"
  | "login_email_added"
  | "thesis_changed"
  | "interest_added"
  | "interest_removed"
  | "meeting_scheduled"
  | "chat_message"
  | "conclusion_linked"
  | "deal_passed"
  | "trigger_set"
  | "trigger_met"
  | "thesis_synced"
  | "thesis_sync_failed"
  | "profile_updated"
  | "figures_uploaded"
  | "founder_synced"
  | "founder_sync_failed";

export async function logActivity(entry: {
  portal: PortalName;
  action: PortalAction;
  actorUserId?: string | null;
  actorLabel?: string | null;
  investorId?: number | null;
  startupId?: number | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("portal_activity").insert({
      portal: entry.portal,
      action: entry.action,
      actor_user_id: entry.actorUserId ?? null,
      actor_label: entry.actorLabel ?? null,
      investor_id: entry.investorId ?? null,
      startup_id: entry.startupId ?? null,
      meta: entry.meta ?? {},
    });
    if (error) console.error("portal_activity insert failed:", error.code || error.message);
  } catch (e) {
    console.error("portal_activity insert failed:", e);
  }
}

/** Human wording for each action, shared by the admin activity page. */
export const ACTION_LABELS: Record<string, string> = {
  signed_in: "Signed in with Google",
  access_granted: "Platform access granted",
  access_revoked: "Platform access revoked",
  login_email_added: "Login email added",
  thesis_changed: "Changed thesis",
  interest_added: "Marked interested",
  interest_removed: "Withdrew interest",
  meeting_scheduled: "Scheduled a Google Meet",
  chat_message: "Sent a chat message",
  conclusion_linked: "Linked a Fireflies record",
  deal_passed: "Passed on a deal",
  trigger_set: "Set a revisit trigger",
  trigger_met: "Revisit trigger met",
  thesis_synced: "Thesis copied to INVESTOR_CRITERIA",
  thesis_sync_failed: "Thesis NOT copied to INVESTOR_CRITERIA",
  profile_updated: "Founder updated their profile",
  figures_uploaded: "Founder uploaded figures",
  founder_synced: "Founder's data copied to the Pilot sheet",
  founder_sync_failed: "Founder's data NOT copied to the Pilot sheet",
};
