"use client";

import { useState } from "react";
import { createClient } from "@/client/lib/supabase";
import { buttonClass, inputClass } from "@/client/components/founder/ui";

export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<null | { ok: boolean; msg: string }>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (password.length < 8) {
      setStatus({ ok: false, msg: "Use at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ ok: false, msg: "Passwords do not match." });
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setStatus({ ok: false, msg: error.message });
    } else {
      setPassword("");
      setConfirm("");
      setStatus({ ok: true, msg: "Password updated." });
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-navy-600">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-navy-600">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      {status ? (
        <p
          className={`rounded-xl px-3 py-2 text-xs ${
            status.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
          }`}
        >
          {status.msg}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className={buttonClass("primary")}>
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
