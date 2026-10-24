"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, type SessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { callN8nWebhook } from "@/lib/n8n";
import { getStartupRecipients } from "@/lib/data/notifications";
import {
  cleanSubject,
  isValidEmail,
  parseEmailList,
  renderBroadcast,
} from "@/lib/email/render";
import type { BroadcastAudience } from "@/lib/types/db";

// Must match the cap enforced by the n8n ADMIN-BROADCAST "Validate" node.
const MAX_MESSAGES = 300;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

const ComposeSchema = z.object({
  mode: z.enum(["all", "selected"]),
  startupIds: z.array(z.number().int().positive()).max(1000),
  extraEmails: z.string().max(5000),
  subject: z.string().max(200),
  body: z.string().max(20000),
});
export type ComposeInput = z.infer<typeof ComposeSchema>;

export type SendResult =
  | { ok: true; broadcastId: number; count: number }
  | { ok: false; error: string };

interface PlannedMessage {
  startupId: number | null;
  label: string | null; // shown in the recipients table
  mergeStartupName: string | null; // fills {{startup_name}}
  founderName: string | null; // fills {{founder_name}}
  to: string[];
}

function contentError(input: ComposeInput): string | null {
  if (!cleanSubject(input.subject)) return "Add a subject.";
  if (!input.body.trim()) return "Write a message.";
  const { invalid } = parseEmailList(input.extraEmails);
  if (invalid.length) return `Not valid email address(es): ${invalid.slice(0, 5).join(", ")}`;
  return null;
}

/**
 * Recipients are resolved HERE from the database — the browser only sends
 * startup ids, never addresses for platform startups — so a tampered request
 * can't redirect a startup's email. One message per startup to all its emails.
 */
async function planRecipients(input: ComposeInput): Promise<PlannedMessage[]> {
  const startups = await getStartupRecipients();
  const wanted = new Set(input.startupIds);
  const chosen =
    input.mode === "all" ? startups : startups.filter((s) => wanted.has(s.id));
  const planned: PlannedMessage[] = [];
  const covered = new Set<string>();
  for (const s of chosen) {
    if (!s.emails.length) continue;
    planned.push({
      startupId: s.id,
      label: s.name,
      mergeStartupName: s.name,
      founderName: s.founderName,
      to: s.emails,
    });
    s.emails.forEach((e) => covered.add(e));
  }
  for (const e of parseEmailList(input.extraEmails).valid) {
    if (covered.has(e)) continue;
    covered.add(e);
    planned.push({ startupId: null, label: null, mergeStartupName: null, founderName: null, to: [e] });
  }
  return planned;
}

async function dispatch(
  session: SessionUser,
  input: ComposeInput,
  planned: PlannedMessage[],
  audience: BroadcastAudience,
  subjectPrefix = "",
): Promise<SendResult> {
  const admin = createAdminClient();
  const subject = cleanSubject(subjectPrefix + input.subject);

  // Recorded as 'sending' BEFORE calling n8n, so n8n's final status update can
  // never be overwritten by a later write from here.
  const { data: created, error: bErr } = await admin
    .from("email_broadcasts")
    .insert({
      subject,
      body: input.body,
      audience,
      recipient_count: planned.length,
      status: "sending",
      sent_by: session.authId,
      sent_by_email: session.email,
    })
    .select("id")
    .single();
  if (bErr || !created) {
    return { ok: false, error: `Could not record the broadcast: ${bErr?.message ?? "unknown error"}` };
  }
  const broadcastId = created.id as number;

  const fail = async (message: string): Promise<SendResult> => {
    await admin
      .from("email_broadcasts")
      .update({ status: "failed", error: message.slice(0, 500), completed_at: new Date().toISOString() })
      .eq("id", broadcastId);
    await admin
      .from("email_broadcast_recipients")
      .update({ status: "failed", error: `Not sent: ${message}`.slice(0, 500) })
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending");
    revalidatePath("/admin/notifications");
    return { ok: false, error: message };
  };

  const { data: rows, error: rErr } = await admin
    .from("email_broadcast_recipients")
    .insert(
      planned.map((p) => ({
        broadcast_id: broadcastId,
        startup_id: p.startupId,
        startup_name: p.label,
        emails: p.to.join(", "),
        status: "pending",
      })),
    )
    .select("id,startup_id,emails");
  if (rErr || !rows || rows.length !== planned.length) {
    return fail(`Could not record recipients: ${rErr?.message ?? "count mismatch"}`);
  }
  const idByKey = new Map(
    (rows as { id: number; startup_id: number | null; emails: string }[]).map((r) => [
      `${r.startup_id ?? ""}|${r.emails}`,
      r.id,
    ]),
  );

  const messages = planned.map((p) => {
    const rendered = renderBroadcast({
      subject,
      body: input.body,
      startupName: p.mergeStartupName,
      founderName: p.founderName,
    });
    return {
      recipient_id: idByKey.get(`${p.startupId ?? ""}|${p.to.join(", ")}`),
      to: p.to.join(", "),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };
  });
  if (messages.some((m) => !m.recipient_id)) {
    return fail("Could not match recipients to their records.");
  }

  try {
    await callN8nWebhook("N8N_BROADCAST_WEBHOOK_URL", {
      broadcast_id: broadcastId,
      dry: false,
      messages,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Sending failed.");
  }

  revalidatePath("/admin/notifications");
  return { ok: true, broadcastId, count: planned.length };
}

/** Send the broadcast to the chosen startups (+ any extra addresses). */
export async function sendBroadcast(raw: unknown): Promise<SendResult> {
  const session = await requireAdmin();
  const parsed = ComposeSchema.extend({ confirmCount: z.number().int() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const input = parsed.data;

  const problem = contentError(input);
  if (problem) return { ok: false, error: problem };

  const planned = await planRecipients(input);
  if (!planned.length) return { ok: false, error: "No recipients with an email address." };
  if (planned.length > MAX_MESSAGES) {
    return { ok: false, error: `Too many recipients (${planned.length}); the limit is ${MAX_MESSAGES} per broadcast.` };
  }
  if (input.confirmCount !== planned.length) {
    return {
      ok: false,
      error: `The recipient count is now ${planned.length} (contacts may have synced). Review and confirm again.`,
    };
  }

  // Guard against a double-click / resubmit sending the same broadcast twice.
  const admin = createAdminClient();
  const { data: recent } = await admin
    .from("email_broadcasts")
    .select("id")
    .eq("sent_by", session.authId)
    .eq("subject", cleanSubject(input.subject))
    .neq("audience", "test")
    .gte("created_at", new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString())
    .limit(1);
  if (recent?.length) {
    return { ok: false, error: "A broadcast with this subject was just sent. Wait 2 minutes before resending it." };
  }

  const audience: BroadcastAudience =
    input.mode === "all"
      ? "all"
      : planned.some((p) => p.startupId !== null)
        ? "selected"
        : "custom";
  return dispatch(session, input, planned, audience);
}

/**
 * Send ONE test copy to the signed-in admin's own address, personalised with the
 * first selected startup's merge values so the preview matches reality.
 */
export async function sendTestEmail(raw: unknown): Promise<SendResult> {
  const session = await requireAdmin();
  const parsed = ComposeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const input = parsed.data;
  const problem = contentError(input);
  if (problem) return { ok: false, error: problem };

  const self = (session.email ?? "").toLowerCase();
  if (!isValidEmail(self)) return { ok: false, error: "Your account has no deliverable email address." };

  const sample = (await planRecipients(input))[0];
  const planned: PlannedMessage[] = [
    {
      startupId: null,
      label: `Test copy${sample?.label ? ` (as ${sample.label})` : ""}`,
      mergeStartupName: sample?.mergeStartupName ?? null,
      founderName: sample?.founderName ?? null,
      to: [self],
    },
  ];
  return dispatch(session, input, planned, "test", "[TEST] ");
}

export type SyncResult =
  | { ok: true; matched: number; emails: number; rowsRead: number }
  | { ok: false; error: string };

/** Run the n8n SYNC-CONTACTS workflow now (it also runs hourly on its own). */
export async function syncContactsNow(): Promise<SyncResult> {
  await requireAdmin();
  try {
    const r = await callN8nWebhook<{
      ok?: boolean;
      matched_startups?: number;
      emails?: number;
      rows_read?: number;
    }>("N8N_CONTACTS_SYNC_WEBHOOK_URL", {}, 90000);
    if (!r?.ok) return { ok: false, error: "The sync did not complete." };
    revalidatePath("/admin/notifications");
    return {
      ok: true,
      matched: r.matched_startups ?? 0,
      emails: r.emails ?? 0,
      rowsRead: r.rows_read ?? 0,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed." };
  }
}
