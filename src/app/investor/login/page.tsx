import { redirect } from "next/navigation";
import { AuthHeading, AuthItem, AuthNotice, AuthShell } from "@/client/components/site/auth-shell";
import { SITE } from "@/client/components/site/site-config";
import { getSessionUser, hasPortalAccess, INVESTOR_HOME, isAdmin } from "@/server/auth/session";
import { safeInvestorNext } from "@/server/auth/origin";
import { signInWithGoogle, signOutInvestor } from "./actions";
import { GoogleSignIn, SignOutButton } from "./google-button";

export const dynamic = "force-dynamic";

// Why a Google account couldn't get in. Set by /auth/callback and requireInvestor().
const ERRORS: Record<string, string> = {
  not_on_list:
    "That Google account isn't on Sidana's investor list. Sign in with the email address Sidana writes to you at.",
  no_access:
    "Your account isn't open yet. It opens once you ask Sidana for a startup's documents or fix a meeting by email.",
  ambiguous: "That email is listed for more than one investor. Please contact the Sidana team so we can fix it.",
  not_investor: "That Google account belongs to a founder or team login. Founders sign in on the founder portal.",
  inactive: "This account has been deactivated. Please contact the Sidana team.",
  google_unavailable: "Google sign-in isn't available right now. Please try again in a minute.",
  callback: "Google sign-in didn't complete. Please try again.",
};

/**
 * Investor sign-in (clause 2.1): Google only, no passwords. Reached from the
 * link in Sidana's email (?next=/investor/startup/<id>&hint=<email>).
 */
export default async function InvestorLogin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeInvestorNext(sp.next);
  const error = sp.error ? ERRORS[sp.error] ?? ERRORS.callback : null;

  // Already signed in with access: go straight in.
  const session = await getSessionUser();
  const role = session?.appUser?.role;
  if (session && !sp.error) {
    if (isAdmin(role)) redirect("/admin");
    if (role === "founder") redirect("/dashboard");
    const investorId = role === "investor" ? session.appUser?.investor_id : null;
    if (investorId && session.appUser?.active !== false && (await hasPortalAccess(investorId))) {
      redirect(next ?? INVESTOR_HOME);
    }
  }

  return (
    <AuthShell portalLabel="Investor Portal" variant="investor">
      <AuthHeading
        eyebrow="Investor portal"
        title="Welcome."
        sub="Sign in with the Google account for the email address Sidana writes to you at. No password needed."
      />
      <div className="auth-form">
        {error ? <AuthNotice tone="err">{error}</AuthNotice> : null}
        {session ? <SignOutButton action={signOutInvestor} /> : <GoogleSignIn action={signInWithGoogle} next={next} hint={sp.hint} />}
        {/* About a third of investors use Microsoft, Zoho or other company mail (checked 27 Nov). */}
        <AuthItem>
          <details className="auth-help" open={sp.error === "not_on_list"}>
            <summary>No Google account? (Zoho, Outlook or company email)</summary>
            <ol>
              <li>
                Go to{" "}
                <a href="https://accounts.google.com/signup" target="_blank" rel="noopener noreferrer" className="auth-link">
                  accounts.google.com/signup
                </a>{" "}
                and choose <b>Use your existing email</b>.
              </li>
              <li>Enter the email address Sidana writes to you at, and type in the code Google sends there.</li>
              <li>Come back here and choose Continue with Google. Your email stays where it is; nothing about it changes.</li>
            </ol>
            <p>Prefer a Gmail you already have? Ask the Sidana team to link it to your account.</p>
          </details>
        </AuthItem>
        <AuthItem className="auth-foot">
          <p>
            Trouble signing in?{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="auth-link">
              Contact the Sidana team
            </a>
          </p>
        </AuthItem>
      </div>
    </AuthShell>
  );
}
