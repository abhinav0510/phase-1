"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AuthError,
  AuthField,
  AuthShell,
  authItem,
  authStagger,
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
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    // Always show the same confirmation — never reveal whether an account exists.
    if (err && !/rate limit/i.test(err.message)) {
      // Only surface genuine transport errors, not "user not found".
      setSent(true);
    } else {
      setSent(true);
    }
  }

  return (
    <AuthShell portalLabel="Team Access" tagline={["Sidana", "operations", "desk"]}>
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
          Reset your password
        </motion.h1>

        {sent ? (
          <motion.div variants={authItem} className="mt-5 space-y-5">
            <p className="rounded-lg border border-emerald-600/20 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              If an account exists for that email, a password reset link is on its
              way. Check your inbox and follow the link to choose a new password.
            </p>
            <Link
              href="/teamonly"
              className="inline-flex items-center gap-2 text-sm text-gold-dim hover:underline"
            >
              Back to sign in
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.p variants={authItem} className="mt-3 text-[15px] text-ink-muted">
              Enter your Sidana team email and we&apos;ll send a reset link.
            </motion.p>
            <form onSubmit={submit} className="mt-9 space-y-5">
              <motion.div variants={authItem}>
                <AuthField
                  label="Email"
                  name="email"
                  type="email"
                  icon={Mail}
                  placeholder="you@sidanaventures.com"
                  autoComplete="email"
                  autoFocus
                />
              </motion.div>
              {error ? <AuthError text={error} /> : null}
              <motion.div variants={authItem} className="pt-1">
                <button
                  type="submit"
                  disabled={busy}
                  className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[16px] font-semibold text-paper shadow-[0_10px_30px_rgba(11,23,40,0.2)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send reset link"}
                  {!busy ? (
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  ) : null}
                </button>
              </motion.div>
              <motion.div
                variants={authItem}
                className="space-y-1 pt-1 text-center text-[13px] text-ink-muted"
              >
                <p>
                  <Link href="/teamonly" className="text-gold-dim hover:underline">
                    Back to team sign in
                  </Link>
                </p>
                <p>
                  Founder? Your Login ID password is reset by the Sidana team —
                  please contact them.
                </p>
              </motion.div>
            </form>
          </>
        )}
      </motion.div>
    </AuthShell>
  );
}
