"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Check, Copy } from "lucide-react";
import { resetUserPassword } from "./actions";

export function ResetPasswordButton({ userId, userName }: { userId: string; userName: string | null }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError(null);
    setResult(null);
    startTransition(async () => {
      const r = await resetUserPassword(userId);
      if (r.ok) {
        setResult({ tempPassword: r.tempPassword });
        setConfirming(false);
      } else {
        setError(r.error);
        setConfirming(false);
      }
    });
  }

  function copyPassword() {
    if (!result) return;
    navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (result) {
    return (
      <div className="flex items-center gap-2">
        <code className="rounded bg-amber-50 px-2 py-0.5 text-xs font-mono text-amber-800">
          {result.tempPassword}
        </code>
        <button
          type="button"
          onClick={copyPassword}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-navy-500 hover:bg-navy-50"
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    );
  }

  if (error) {
    return <span className="text-xs text-red-600">{error}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
        confirming
          ? "bg-red-600 text-white hover:bg-red-700"
          : "border border-navy-200 text-navy-600 hover:bg-navy-50"
      }`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <KeyRound className="h-3.5 w-3.5" />
      )}
      {confirming ? `Reset ${userName ?? "user"}?` : "Reset password"}
    </button>
  );
}
