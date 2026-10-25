"use client";

import { useActionState } from "react";
import { Lock, User } from "lucide-react";
import { signInFounder } from "./actions";
import {
  AuthError,
  AuthField,
  AuthHeading,
  AuthItem,
  AuthShell,
  AuthSubmit,
} from "@/components/site/auth-shell";
import { SITE } from "@/components/site/site-config";

// Public founder sign-in. Team/admin sign-in lives at the unlisted /teamonly.
export default function LoginPage() {
  const [state, action, pending] = useActionState(signInFounder, undefined);

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

        {state?.error ? <AuthError text={state.error} /> : null}

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
