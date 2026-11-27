"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { emailsInCell } from "@/server/auth/investor-access";
import { logActivity } from "@/server/data/activity";

/**
 * Admin-only writes for the investor portal (clause 2.11): grant or revoke
 * access by hand (engaged replies the grant function couldn't resolve, or
 * misclassified ones), add extra Google login emails, and link a Fireflies
 * record to a meeting. Never touches agent tables.
 */

const PATH = "/admin/portal-access";
const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
};

async function investorExists(id: number) {
  const admin = createAdminClient();
  const { data } = await admin.from("investors").select("id").eq("id", id).maybeSingle();
  return !!data;
}

async function startupExists(id: number) {
  const admin = createAdminClient();
  const { data } = await admin.from("startups").select("id").eq("id", id).maybeSingle();
  return !!data;
}

export async function grantAccess(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const investorId = int(formData.get("investorId"));
  const startupId = int(formData.get("startupId"));
  if (!investorId || !(await investorExists(investorId))) return;
  if (startupId && !(await startupExists(startupId))) return;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("investor_portal_access").select("investor_id").eq("investor_id", investorId).maybeSingle();
  if (existing) {
    await admin.from("investor_portal_access").update({ revoked_at: null, revoked_by: null }).eq("investor_id", investorId);
  } else {
    await admin.from("investor_portal_access").insert({
      investor_id: investorId,
      granted_via: "admin",
      startup_id: startupId,
      granted_by: session.email,
    });
  }
  if (startupId) {
    await admin.from("investor_interest").upsert({ investor_id: investorId, startup_id: startupId, source: "admin" }, { onConflict: "investor_id,startup_id", ignoreDuplicates: true });
  }
  await logActivity({ portal: "admin", action: "access_granted", actorUserId: session.authId, actorLabel: session.email, investorId, startupId, meta: { via: "admin" } });
  revalidatePath(PATH);
}

export async function revokeAccess(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const investorId = int(formData.get("investorId"));
  if (!investorId) return;
  const admin = createAdminClient();
  await admin
    .from("investor_portal_access")
    .update({ revoked_at: new Date().toISOString(), revoked_by: session.email })
    .eq("investor_id", investorId);
  await logActivity({ portal: "admin", action: "access_revoked", actorUserId: session.authId, actorLabel: session.email, investorId });
  revalidatePath(PATH);
}

export async function addLoginEmail(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const investorId = int(formData.get("investorId"));
  const email = emailsInCell(String(formData.get("email") ?? ""))[0];
  if (!investorId || !email) return;
  const admin = createAdminClient();
  const { data } = await admin.from("investor_portal_access").select("login_emails").eq("investor_id", investorId).maybeSingle();
  if (!data) return;
  const list = [...new Set([...((data.login_emails as string[] | null) ?? []), email])];
  await admin.from("investor_portal_access").update({ login_emails: list }).eq("investor_id", investorId);
  await logActivity({ portal: "admin", action: "login_email_added", actorUserId: session.authId, actorLabel: session.email, investorId });
  revalidatePath(PATH);
}

export async function removeLoginEmail(formData: FormData): Promise<void> {
  await requireAdmin();
  const investorId = int(formData.get("investorId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!investorId || !email) return;
  const admin = createAdminClient();
  const { data } = await admin.from("investor_portal_access").select("login_emails").eq("investor_id", investorId).maybeSingle();
  if (!data) return;
  const list = ((data.login_emails as string[] | null) ?? []).filter((e) => e !== email);
  await admin.from("investor_portal_access").update({ login_emails: list }).eq("investor_id", investorId);
  revalidatePath(PATH);
}

export async function linkConclusion(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const ffId = String(formData.get("ffId") ?? "").trim();
  const meetingId = int(formData.get("meetingId"));
  if (!ffId || !meetingId) return;
  const admin = createAdminClient();
  const { data: meeting } = await admin.from("meetings").select("id,startup_id,investor_id").eq("id", meetingId).maybeSingle();
  if (!meeting) return;
  await admin.from("meeting_conclusions").update({ meeting_id: meetingId, linked_by: "admin" }).eq("ff_id", ffId);
  await logActivity({
    portal: "admin",
    action: "conclusion_linked",
    actorUserId: session.authId,
    actorLabel: session.email,
    investorId: meeting.investor_id as number | null,
    startupId: meeting.startup_id as number | null,
    meta: { ff_id: ffId, meeting_id: meetingId },
  });
  revalidatePath(PATH);
  revalidatePath("/admin/meetings");
}
