"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";
import { signInTeam } from "@/app/login/actions";
import {
  AuthError,
  AuthField,
  AuthHeading,
  AuthItem,
  AuthShell,
  AuthSubmit,
} from "@/client/components/site/auth-shell";

// Unlisted route — intentionally not linked from the public site.
// Sidana team members reach it directly at /teamonly.
export default function TeamOnlyLogin() {
  const [state, action, pending] = useActionState(signInTeam, undefined);

  return (
    <AuthShell portalLabel="Team Access" variant="team" tagline={["Sidana", "operations", "desk"]}>
      <AuthHeading eyebrow="Team access" title="Welcome back." sub="For Sidana operations and administrators." />

      <form action={action} className="auth-form">
        <AuthField
          label="Email"
          name="email"
          type="email"
          icon={Mail}
          placeholder="you@sidanaventures.com"
          autoComplete="email"
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

        <AuthItem className="auth-row-end">
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </AuthItem>

        <AuthSubmit pending={pending} label="Sign in" pendingLabel="Signing in…" />
      </form>
    </AuthShell>
  );
}
