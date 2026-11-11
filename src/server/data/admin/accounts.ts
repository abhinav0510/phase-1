import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";

export interface FounderLogin {
  email: string | null;
  lastSignInAt: string | null;
  /** Still on the one-time password: must choose their own at next sign-in. */
  mustReset: boolean;
  active: boolean;
}

export interface FounderAccounts {
  /** Emails on file (Founders Info) that can be used to sign in. */
  emails: string[];
  logins: FounderLogin[];
}

/** A startup's founder logins and sign-in emails, for the team's startup page. Never returns passwords. */
export async function getFounderAccounts(startupId: number): Promise<FounderAccounts> {
  const admin = createAdminClient();
  const [usersRes, contactsRes] = await Promise.all([
    admin.from("app_users").select("id, email, active").eq("role", "founder").eq("startup_id", startupId),
    admin.from("startup_contacts").select("email").eq("startup_id", startupId).order("id"),
  ]);
  const users = (usersRes.data ?? []) as { id: string; email: string | null; active: boolean | null }[];
  const logins = await Promise.all(
    users.map(async (u): Promise<FounderLogin> => {
      const { data } = await admin.auth.admin.getUserById(u.id);
      const au = data?.user;
      return {
        email: au?.email ?? u.email,
        lastSignInAt: au?.last_sign_in_at ?? null,
        mustReset: au?.app_metadata?.must_reset === true,
        active: u.active !== false,
      };
    }),
  );
  return {
    emails: [...new Set(((contactsRes.data ?? []) as { email: string }[]).map((c) => c.email))],
    logins,
  };
}
