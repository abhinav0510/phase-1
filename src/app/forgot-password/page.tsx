"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AuthError,
  AuthField,
  AuthHeading,
  AuthItem,
  AuthNotice,
  AuthShell,
  AuthSubmit,
} from "@/components/site/auth-shell";

// Email-based recovery — for Sidana team accounts (real inboxes).
// Founders sign in with a Login ID mapped to a synthetic email, so they
// recover via the Sidana team instead (noted below).
export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!email) {
      setError("Enter your email.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    // Always show the same confirmation — never reveal whether an account exists.
    setSent(true);
  }

  return (
    <AuthShell portalLabel="Team Access" variant="team" tagline={["Sidana", "operations", "desk"]}>
      <AuthHeading
        eyebrow="Account recovery"
        title="Reset your password."
        sub={sent ? undefined : "Enter your Sidana team email and we’ll send a reset link."}
      />

      {sent ? (
        <>
          <AuthNotice tone="ok">
            If an account exists for that email, a password reset link is on its way. Check your inbox and follow the
            link to choose a new password.
          </AuthNotice>
          <AuthItem className="auth-foot" >
            <p style={{ marginTop: "1.25rem" }}>
              <Link href="/teamonly" className="auth-link">
                Back to sign in
              </Link>
            </p>
          </AuthItem>
        </>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <AuthField
            label="Email"
            name="email"
            type="email"
            icon={Mail}
            placeholder="you@sidanaventures.com"
            autoComplete="email"
            autoFocus
          />
          {error ? <AuthError text={error} /> : null}
          <AuthSubmit pending={busy} label="Send reset link" pendingLabel="Sending…" />
          <AuthItem className="auth-foot">
            <p>
              <Link href="/teamonly" className="auth-link">
                Back to team sign in
              </Link>
            </p>
            <p>Founder? Your Login ID password is reset by the Sidana team. Please contact them.</p>
          </AuthItem>
        </form>
      )}
    </AuthShell>
  );
}
