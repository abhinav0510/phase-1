"use server";

import { requireAdmin } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";

type Result = { ok: true; tempPassword: string } | { ok: false; error: string };

export async function resetUserPassword(userId: string): Promise<Result> {
  await requireAdmin();

  if (typeof userId !== "string" || userId.length < 10) {
    return { ok: false, error: "Invalid user id." };
  }

  const admin = createAdminClient();

  const { data: target } = await admin.auth.admin.getUserById(userId);
  if (!target?.user) {
    return { ok: false, error: "Auth user not found." };
  }

  const tempPassword = generateTempPassword();

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
    app_metadata: { ...(target.user.app_metadata ?? {}), must_reset: true },
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true, tempPassword };
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < 12; i++) {
    pw += chars[Math.floor(Math.random() * chars.length)];
  }
  return pw;
}
