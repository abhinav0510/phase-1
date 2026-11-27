"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/server/integrations/supabase/server";
import { publicOrigin, safeInvestorNext } from "@/server/auth/origin";

/**
 * Starts Google sign-in for an investor (clause 2.1). Supabase keeps the PKCE
 * verifier in a cookie; Google returns to /auth/callback, which decides whether
 * this Google account is an investor with portal access.
 * `hint` (from the invite link) pre-selects the right Google account.
 */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = safeInvestorNext(String(formData.get("next") ?? "")) ?? "";
  const hint = String(formData.get("hint") ?? "").trim().toLowerCase();
  const origin = await publicOrigin();
  const callback = new URL("/auth/callback", origin);
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: {
        prompt: "select_account",
        ...(/^[^@\s]+@[^@\s]+$/.test(hint) ? { login_hint: hint } : {}),
      },
    },
  });
  if (error || !data?.url) redirect("/investor/login?error=google_unavailable");
  redirect(data.url);
}

/** Signs out an account that can't use the investor portal, so another Google account can be tried. */
export async function signOutInvestor(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/investor/login");
}
