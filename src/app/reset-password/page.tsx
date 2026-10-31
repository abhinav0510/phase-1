"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/client/lib/supabase";
import {
  AuthError,
  AuthField,
  AuthHeading,
  AuthItem,
  AuthNotice,
  AuthShell,
  AuthSubmit,
} from "@/client/components/site/auth-shell";

// Landing page for the password-reset email link. Supabase sets a short-lived
// recovery session from the link; we then let the user choose a new password.
export default function ResetPassword() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    // The recovery token in the URL is exchanged for a session automatically.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        settled = true;
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true;
        setStatus("ready");
      } else {
        // Give the URL-token exchange a moment before declaring the link invalid.
        setTimeout(() => {
          if (!settled) setStatus("invalid");
        }, 1500);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setStatus("done");
    setTimeout(() => {
      router.replace("/dashboard"); // role-aware routing happens downstream
      router.refresh();
    }, 1200);
  }

  return (
    <AuthShell portalLabel="Account recovery">
      <AuthHeading
        eyebrow="Account recovery"
        title="Choose a new password."
        sub={status === "checking" ? "Verifying your reset link…" : undefined}
      />

      {status === "invalid" ? (
        <>
          <AuthNotice tone="err">This reset link is invalid or has expired. Request a new one.</AuthNotice>
          <AuthItem className="auth-foot">
            <p style={{ marginTop: "1.25rem" }}>
              <Link href="/forgot-password" className="auth-link">
                Request a new link
              </Link>
            </p>
          </AuthItem>
        </>
      ) : null}

      {status === "done" ? <AuthNotice tone="ok">Password updated. Taking you to your dashboard…</AuthNotice> : null}

      {status === "ready" ? (
        <form onSubmit={submit} className="auth-form">
          <AuthField
            label="New password"
            icon={Lock}
            password
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <AuthField
            label="Confirm new password"
            icon={Lock}
            password
            placeholder="Repeat your password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error ? <AuthError text={error} /> : null}
          <AuthSubmit pending={busy} label="Update password" pendingLabel="Saving…" />
        </form>
      ) : null}
    </AuthShell>
  );
}
