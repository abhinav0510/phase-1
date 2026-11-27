"use server";

import { revalidatePath } from "next/cache";
import { requireInvestor } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { callN8nWebhook } from "@/server/integrations/n8n/client";
import { canViewStartup } from "@/server/data/investor/matches";
import { getInvestorMeetings } from "@/server/data/investor/engagement";
import { getInvestorSelf } from "@/server/data/investor/thesis";
import { getOwnSignInEmails, getOwnStartup } from "@/server/data/founder";
import { emailsInCell } from "@/server/auth/investor-access";
import { logActivity } from "@/server/data/activity";
import { postMeetingNotices } from "@/server/data/chat";
import { parseIstSlot } from "@/server/validators/meeting-slot";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function actorLabel(investorId: number, fullName: string | null | undefined) {
  const self = await getInvestorSelf(investorId);
  return { self, label: [fullName, self?.name].filter(Boolean).join(" · ") };
}

/** "I'm interested" on a startup profile (clauses 2.5, 2.8). Un-marking deletes the row. */
export async function setInterest(startupId: number, interested: boolean): Promise<Result> {
  const { investorId, authId, appUser } = await requireInvestor();
  if (!Number.isInteger(startupId) || !(await canViewStartup(investorId, startupId))) return { ok: false, error: "Not found." };

  const admin = createAdminClient();
  const res = interested
    ? await admin.from("investor_interest").upsert({ investor_id: investorId, startup_id: startupId, source: "portal" }, { onConflict: "investor_id,startup_id", ignoreDuplicates: true })
    : await admin.from("investor_interest").delete().eq("investor_id", investorId).eq("startup_id", startupId);
  if (res.error) return { ok: false, error: "Couldn't save that. Please try again." };
  // Coming back to a deal they passed on undoes the pass.
  if (interested) await admin.from("investor_passes").delete().eq("investor_id", investorId).eq("startup_id", startupId);

  const { label } = await actorLabel(investorId, appUser?.full_name);
  await logActivity({
    portal: "investor",
    action: interested ? "interest_added" : "interest_removed",
    actorUserId: authId,
    actorLabel: label,
    investorId,
    startupId,
  });
  revalidatePath(`/investor/startup/${startupId}`);
  revalidatePath("/investor/matches");
  revalidatePath("/investor/chats");
  revalidatePath("/investor/shared");
  revalidatePath("/investor/past-deals");
  return { ok: true };
}

interface MeetCreated {
  event_id?: string;
  ical_uid?: string;
  meet_link?: string;
  start?: string;
}

/**
 * Books a 30-minute Google Meet with the founder (clause 2.7). n8n creates the
 * event on a team calendar CAL-SYNC already reads, so the meeting later also
 * reaches public.meetings like every other call. Nothing is saved if booking fails.
 */
export async function scheduleMeeting(startupId: number, date: string, time: string): Promise<Result> {
  const { investorId, authId, appUser, email } = await requireInvestor();
  if (!Number.isInteger(startupId) || !(await canViewStartup(investorId, startupId))) return { ok: false, error: "Not found." };

  const slot = parseIstSlot(date, time, Date.now());
  if (!slot.ok) return slot;

  const upcoming = (await getInvestorMeetings(investorId)).some(
    (m) => m.startup_id === startupId && !!m.scheduled_at && Date.parse(m.scheduled_at) > Date.now(),
  );
  if (upcoming) return { ok: false, error: "You already have an upcoming meeting with this startup." };

  const [startup, founderEmails, { self, label }] = await Promise.all([
    getOwnStartup(startupId),
    getOwnSignInEmails(startupId),
    actorLabel(investorId, appUser?.full_name),
  ]);
  const investorEmails = [email, ...emailsInCell(self?.email)].filter((e): e is string => !!e);
  const attendees = [...new Set([...founderEmails, ...investorEmails].map((e) => e.toLowerCase()))];

  let created: MeetCreated;
  try {
    created = await callN8nWebhook<MeetCreated>("N8N_MEET_CREATE_WEBHOOK_URL", {
      startup_id: startupId,
      investor_id: investorId,
      start: slot.start.toISOString(),
      duration_min: 30,
      // The convention the meeting resolver and the founder meetings page already read.
      title: `${startup?.name ?? "Startup"} <> ${self?.name ?? "Investor"}`,
      attendees,
    });
  } catch (e) {
    console.error("PORTAL-MEET-CREATE failed:", e);
    return { ok: false, error: "Couldn't book the meeting just now. Please try again." };
  }
  if (!created?.meet_link && !created?.event_id) {
    return { ok: false, error: "Couldn't book the meeting just now. Please try again." };
  }

  const admin = createAdminClient();
  const ins = await admin.from("portal_meetings").insert({
    investor_id: investorId,
    startup_id: startupId,
    scheduled_at: created.start ?? slot.start.toISOString(),
    duration_min: 30,
    meet_link: created.meet_link ?? null,
    calendar_event_id: created.event_id ?? null,
    ical_uid: created.ical_uid ?? null,
    status: "scheduled",
    created_by: authId,
  });
  if (ins.error) console.error("portal_meetings insert failed after booking:", ins.error.code || ins.error.message);

  // The first message both sides see in their chat: when the call is and how to join.
  await postMeetingNotices(investorId, startupId, [{ scheduled_at: created.start ?? slot.start.toISOString(), meet_link: created.meet_link ?? null }]);

  await logActivity({
    portal: "investor",
    action: "meeting_scheduled",
    actorUserId: authId,
    actorLabel: label,
    investorId,
    startupId,
    meta: { at: slot.start.toISOString(), founder_invited: founderEmails.length > 0 },
  });
  revalidatePath(`/investor/startup/${startupId}`);
  revalidatePath("/investor/meetings");
  revalidatePath("/investor/chats");
  return {
    ok: true,
    message: founderEmails.length
      ? "Booked. Google has emailed the invite to you and the founder."
      : "Booked. Sidana will forward the invite to the founder.",
  };
}
