"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, User } from "lucide-react";
import { signInFounder } from "./actions";
import {
  AuthError,
  AuthField,
  AuthHeading,
  AuthItem,
  AuthShell,
  AuthSubmit,
} from "@/client/components/site/auth-shell";
import { SITE } from "@/client/components/site/site-config";

// Set by requireUser / requireFounder when a signed-in account can't enter the portal.
const ACCOUNT_ERRORS: Record<string, string> = {
  inactive: "This account has been deactivated. Please contact the Sidana team.",
  no_startup: "This account isn't linked to a startup yet. Please contact the Sidana team.",
};

// Public founder sign-in. Team/admin sign-in lives at the unlisted /teamonly.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, action, pending] = useActionState(signInFounder, undefined);
  const accountError = ACCOUNT_ERRORS[useSearchParams().get("error") ?? ""];
  const error = state?.error ?? accountError;

  return (
    <AuthShell portalLabel="Founder Portal">
      <AuthHeading
        eyebrow="Founder portal"
        title="Welcome back."
        sub="Sign in with your email on file with Sidana, or your Login ID."
      />

      <form action={action} className="auth-form">
        <AuthField
          label="Email or Login ID"
          name="loginId"
          icon={User}
          placeholder="you@startup.com or 42"
          autoComplete="username"
          autoFocus
        />
        <AuthField
          label="Password"
          name="password"
          icon={Lock}
          password
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        {error ? <AuthError text={error} /> : null}

        <AuthSubmit pending={pending} label="Sign in" pendingLabel="Signing in…" />

        <AuthItem className="auth-foot">
          <p>
            Trouble signing in?{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="auth-link">
              Contact the Sidana team
            </a>
          </p>
        </AuthItem>
      </form>
    </AuthShell>
  );
}
