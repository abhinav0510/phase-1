import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/server/integrations/supabase/server";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { resolveInvestorForEmail } from "@/server/auth/investor-access";
import { INVESTOR_HOME, isAdmin } from "@/server/auth/session";
import { publicOrigin, safeInvestorNext } from "@/server/auth/origin";
import { logActivity } from "@/server/data/activity";
import type { AppUser } from "@/shared/types/db";

export const dynamic = "force-dynamic";

/**
 * Google sign-in return (clause 2.1). Exchanges the code for a session, then
 * decides who this Google email is:
 *   existing investor app_users row → in;
 *   founder / team account → refused (they keep their own logins);
 *   otherwise an investor whose email is on file (or added by an admin) AND
 *   whose portal access is open → a new app_users row, then in;
 *   anyone else → signed out, never given an app_users row.
 */
export async function GET(request: NextRequest) {
  const origin = await publicOrigin();
  const url = request.nextUrl;
  const next = safeInvestorNext(url.searchParams.get("next")) ?? INVESTOR_HOME;
  const fail = async (reason: string) => {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(`/investor/login?error=${reason}`, origin));
  };

  const code = url.searchParams.get("code");
  if (!code) return fail("callback");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  const user = data?.user;
  if (error || !user?.email) return fail("callback");
  const email = user.email.toLowerCase();

  const admin = createAdminClient();
  const existing = await admin.from("app_users").select("*").eq("id", user.id).maybeSingle();
  if (existing.error) return fail("callback");
  const row = existing.data as AppUser | null;

  if (row && (isAdmin(row.role) || row.role === "founder")) return fail("not_investor");
  if (row && row.active === false) return fail("inactive");

  let investorId = row?.role === "investor" ? row.investor_id : null;
  if (!investorId) {
    const resolved = await resolveInvestorForEmail(email);
    if (resolved.kind !== "investor") return fail(resolved.kind);
    investorId = resolved.investorId;
  }

  const access = await admin
    .from("investor_portal_access")
    .select("investor_id, first_signin_at, revoked_at")
    .eq("investor_id", investorId)
    .maybeSingle();
  if (access.error || !access.data || access.data.revoked_at) return fail("no_access");

  const { data: inv } = await admin.from("investors").select("name, contact_person").eq("id", investorId).maybeSingle();
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const fullName = meta.full_name ?? meta.name ?? inv?.contact_person ?? null;

  if (!row) {
    const ins = await admin.from("app_users").insert({
      id: user.id,
      email,
      full_name: fullName,
      role: "investor",
      investor_id: investorId,
      active: true,
    });
    if (ins.error) return fail("callback");
  }

  if (!access.data.first_signin_at) {
    await admin.from("investor_portal_access").update({ first_signin_at: new Date().toISOString() }).eq("investor_id", investorId);
  }
  await logActivity({
    portal: "investor",
    action: "signed_in",
    actorUserId: user.id,
    actorLabel: [fullName, inv?.name].filter(Boolean).join(" · ") || email,
    investorId,
  });

  return NextResponse.redirect(new URL(next, origin));
}
