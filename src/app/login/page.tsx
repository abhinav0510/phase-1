"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, User } from "lucide-react";
import { signInFounder } from "./actions";
import {
  AuthError,
  AuthField,
  AuthShell,
  authItem,
  authStagger,
} from "@/components/site/auth-shell";
import { SITE } from "@/components/site/site-config";

// Public founder sign-in. Team/admin sign-in lives at the unlisted /teamonly.
export default function LoginPage() {
  const [state, action, pending] = useActionState(signInFounder, undefined);

  return (
    <AuthShell portalLabel="Founder Portal">
      <motion.div variants={authStagger} initial="hidden" animate="show">
        <motion.p
          variants={authItem}
          className="mb-5 text-[11px] uppercase tracking-[0.35em] text-gold-dim"
        >
          Founder Portal
        </motion.p>
        <motion.h1
          variants={authItem}
          className="site-serif text-[44px] leading-none text-ink md:text-[54px]"
        >
          Welcome back
        </motion.h1>
        <motion.p variants={authItem} className="mt-3 text-[15px] text-ink-muted">
          Use the Login ID provided to you by Sidana.
        </motion.p>

        <form action={action} className="mt-9 space-y-5">
          <motion.div variants={authItem}>
            <AuthField
              label="Login ID"
              name="loginId"
              icon={User}
              placeholder="e.g. 42"
              autoComplete="username"
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

          <motion.p variants={authItem} className="pt-1 text-center text-[14px] text-ink-muted">
            Trouble signing in?{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="text-gold-dim hover:underline">
              Contact the Sidana team.
            </a>
          </motion.p>
        </form>
      </motion.div>
    </AuthShell>
  );
}
