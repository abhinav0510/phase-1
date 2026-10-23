"use client";

import Link from "next/link";
import { useActionState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { signInTeam } from "@/app/login/actions";
import {
  AuthError,
  AuthField,
  AuthShell,
  authItem,
  authStagger,
} from "@/components/site/auth-shell";

// Unlisted route — intentionally not linked from the public site.
// Sidana team members reach it directly at /teamonly.
export default function TeamOnlyLogin() {
  const [state, action, pending] = useActionState(signInTeam, undefined);

  return (
    <AuthShell portalLabel="Team Access" tagline={["Sidana", "operations", "desk"]}>
      <motion.div variants={authStagger} initial="hidden" animate="show">
        <motion.p
          variants={authItem}
          className="mb-5 text-[11px] uppercase tracking-[0.35em] text-gold-dim"
        >
          Team Access
        </motion.p>
        <motion.h1
          variants={authItem}
          className="site-serif text-[44px] leading-none text-ink md:text-[54px]"
        >
          Welcome back
        </motion.h1>
        <motion.p variants={authItem} className="mt-3 text-[15px] text-ink-muted">
          Sidana operations and administrators.
        </motion.p>

        <form action={action} className="mt-9 space-y-5">
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
          <motion.div variants={authItem}>
            <AuthField
              label="Password"
              name="password"
              icon={Lock}
              password
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </motion.div>

          {state?.error ? <AuthError text={state.error} /> : null}

          <motion.div variants={authItem} className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[13px] text-gold-dim hover:underline"
            >
              Forgot password?
            </Link>
          </motion.div>

          <motion.div variants={authItem} className="pt-1">
            <button
              type="submit"
              disabled={pending}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink text-[16px] font-semibold text-paper shadow-[0_10px_30px_rgba(11,23,40,0.2)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
              {!pending ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              ) : null}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </AuthShell>
  );
}
