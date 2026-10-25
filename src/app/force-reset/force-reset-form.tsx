"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { completeForcedReset } from "./actions";
import { AuthError, AuthField, AuthSubmit } from "@/components/site/auth-shell";

export function ForceResetForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    // Set the new password AND clear must_reset server-side (service role);
    // the flag lives in app_metadata, which the browser cannot write.
    const result = await completeForcedReset(password);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    // Navigate past the gate; server now sees must_reset = false.
    router.replace(redirectTo);
    router.refresh();
  }

  return (
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
      <AuthSubmit pending={busy} label="Set password & continue" pendingLabel="Saving…" />
    </form>
  );
}
