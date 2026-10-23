"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AuthError,
  AuthField,
  AuthShell,
  authItem,
  authStagger,
} from "@/components/site/auth-shell";

// Landing page for the password-reset email link. Supabase sets a short-lived
// recovery session from the link; we then let the user choose a new password.
export default function ResetPassword() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">(
    "checking",
  );
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
      <motion.div variants={authStagger} initial="hidden" animate="show">
        <motion.p
          variants={authItem}
          className="mb-5 text-[11px] uppercase tracking-[0.35em] text-gold-dim"
        >
          Account recovery
        </motion.p>
        <motion.h1
          variants={authItem}
          className="site-serif text-[44px] leading-none text-ink md:text-[54px]"
        >
          Choose a new password
        </motion.h1>

        {status === "checking" ? (
          <motion.p variants={authItem} className="mt-4 text-[15px] text-ink-muted">
            Verifying your reset link…
          </motion.p>
        ) : null}

        {status === "invalid" ? (
          <motion.div variants={authItem} className="mt-4 space-y-4">
            <p className="rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700">
              This reset link is invalid or has expired. Request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-gold-dim hover:underline"
            >
              Request a new link <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        ) : null}

        {status === "done" ? (
          <motion.p
            variants={authItem}
            className="mt-4 rounded-lg border border-emerald-600/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            Password updated. Taking you to your dashboard…
          </motion.p>
        ) : null}

        {status === "ready" ? (
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
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[16px] font-semibold text-paper shadow-[0_10px_30px_rgba(11,23,40,0.2)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? "Saving…" : "Update password"}
                {!busy ? (
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                ) : null}
              </button>
            </div>
          </form>
        ) : null}
      </motion.div>
    </AuthShell>
  );
}
