"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type AnnouncementResult = { ok: true } | { ok: false; error: string };

const CreateSchema = z.object({
  title: z.string().trim().min(3, "Title is too short.").max(120, "Title is too long."),
  body: z.string().trim().min(3, "Message is too short.").max(4000, "Message is too long."),
  kind: z.enum(["update", "change", "maintenance", "info"]),
  audience: z.enum(["all", "founders", "team"]),
  // <input type="date"> value, optional: hide after the end of that day (IST).
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

function refresh() {
  revalidatePath("/admin/announcements");
  // Every dashboard renders the popup from its layout.
  revalidatePath("/", "layout");
}

export async function createAnnouncement(raw: unknown): Promise<AnnouncementResult> {
  const session = await requireAdmin();
  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid announcement." };
  }
  const { title, body, kind, audience, expiresOn } = parsed.data;

  let expiresAt: string | null = null;
  if (expiresOn) {
    const d = new Date(`${expiresOn}T23:59:59+05:30`);
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
      return { ok: false, error: "The hide-after date must be today or later." };
    }
    expiresAt = d.toISOString();
  }

  const admin = createAdminClient();
  const { error } = await admin.from("announcements").insert({
    title,
    body,
    kind,
    audience,
    is_active: true,
    publish_at: new Date().toISOString(),
    expires_at: expiresAt,
    created_by: session.authId,
    created_by_email: session.email,
  });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

const IdSchema = z.number().int().positive();

export async function setAnnouncementActive(
  id: number,
  active: boolean,
): Promise<AnnouncementResult> {
  await requireAdmin();
  if (!IdSchema.safeParse(id).success) return { ok: false, error: "Invalid id." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("announcements")
    .update({ is_active: active === true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function deleteAnnouncement(id: number): Promise<AnnouncementResult> {
  await requireAdmin();
  if (!IdSchema.safeParse(id).success) return { ok: false, error: "Invalid id." };
  const admin = createAdminClient();
  // Dismissals cascade via the foreign key.
  const { error } = await admin.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
