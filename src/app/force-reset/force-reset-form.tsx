"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthError, AuthField } from "@/components/site/auth-shell";

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
    const supabase = createClient();
    // Set the new password AND clear the must_reset flag in one call.
    const { error: err } = await supabase.auth.updateUser({
      password,
      data: { must_reset: false },
    });
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    // Navigate past the gate; server now sees must_reset = false.
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-9 space-y-5">
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
      <div className="pt-1">
        <button
          type="submit"
          disabled={busy}
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[16px] font-semibold text-paper shadow-[0_10px_30px_rgba(11,23,40,0.2)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? "Saving…" : "Set password & continue"}
          {!busy ? (
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          ) : null}
        </button>
      </div>
    </form>
  );
}
