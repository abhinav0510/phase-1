"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowRight, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { brandFontVars } from "@/client/lib/fonts";
import { SITE } from "./site-config";
import "@/app/auth.css";

/* Sign-in shell for /login, /teamonly, /forgot-password, /reset-password and
   /force-reset, in the landing page's visual language: a white card for the
   form with a quiet product panel beside it. Styles live in app/auth.css. */

const ease = [0.22, 1, 0.36, 1] as const;

export const authStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};
export const authItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

const FOUNDER_FEATURES = ["Real-time updates", "Exact thesis matching", "Email notifications", "Meeting invites", "Financial track"];
const TEAM_POINTS = ["Review founder profiles", "Manage announcements and emails", "See every raise, match and meeting"];

/* What's behind the sign-in, so the screen isn't an empty form. Hidden on phones. */
function Aside({ variant }: { variant: "founder" | "team" }) {
  if (variant === "team") {
    return (
      <aside className="auth-aside auth-aside--team" aria-label="Sidana operations desk">
        <div>
          <h2>Sidana <span className="grad">operations desk.</span></h2>
          <ul>
            {TEAM_POINTS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </aside>
    );
  }
  return (
    <aside className="auth-aside" aria-label="What's inside the founder portal">
      <div>
        <h2>
          We do the Match. <span className="grad">You Get the Fund.</span>
        </h2>
        <ul>
          {FOUNDER_FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      <div className="auth-aside-shot" aria-hidden="true">
        <Image src="/images/portal/dashboard.jpg" alt="" width={2160} height={1350} />
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export function AuthShell({
  portalLabel,
  variant = "founder",
  children,
}: {
  portalLabel: string;
  variant?: "founder" | "team";
  children: ReactNode;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`auth-v4 ${brandFontVars}`}>
        <header className="auth-top">
          <div className="auth-top-inner">
            <Link href="/" className="auth-wordmark" aria-label="Sidana Ventures — home">
              <Image src="/images/logo-icon.png" alt="" width={36} height={36} />
              <span>
                <b>Sidana Ventures</b>
                <span className="auth-portal">{portalLabel}</span>
              </span>
            </Link>
            <Link href="/" className="auth-back">
              ← Back to site
            </Link>
          </div>
        </header>

        <main className="auth-stage">
          <div className="auth-panel">
            <motion.section
              className="auth-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease }}
            >
              <motion.div variants={authStagger} initial="hidden" animate="show">
                {children}
              </motion.div>
            </motion.section>
            <Aside variant={variant} />
          </div>
        </main>

        <footer className="auth-bottom">
          © 2026 Sidana Ventures LLP · {SITE.contactEmail}
        </footer>
      </div>
    </MotionConfig>
  );
}

/* ------------------------------------------------------------------ */
/* Building blocks used by every sign-in page                          */
/* ------------------------------------------------------------------ */
export function AuthHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: ReactNode }) {
  return (
    <>
      <motion.p variants={authItem} className="auth-eyebrow">
        {eyebrow}
      </motion.p>
      <motion.h1 variants={authItem} className="auth-title">
        {title}
      </motion.h1>
      {sub ? (
        <motion.p variants={authItem} className="auth-sub">
          {sub}
        </motion.p>
      ) : null}
    </>
  );
}

export function AuthItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={authItem} className={className}>
      {children}
    </motion.div>
  );
}

export function AuthSubmit({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <motion.div variants={authItem} style={{ paddingTop: "0.25rem" }}>
      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? pendingLabel : label}
        {!pending ? <ArrowRight aria-hidden="true" /> : null}
      </button>
    </motion.div>
  );
}

export function AuthNotice({ tone, children }: { tone: "ok" | "err"; children: ReactNode }) {
  return (
    <motion.p variants={authItem} className={`auth-notice ${tone}`} role={tone === "err" ? "alert" : "status"}>
      {children}
    </motion.p>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  password?: boolean;
};

export function AuthField({ label, icon: Icon, password, className, type, id, name, ...rest }: FieldProps) {
  const [show, setShow] = useState(false);
  const inputType = password ? (show ? "text" : "password") : (type ?? "text");
  const inputId = id ?? (name ? `auth-${name}` : `auth-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);

  return (
    <motion.div variants={authItem}>
      <label className="auth-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="auth-input-wrap">
        <Icon className="auth-input-icon" aria-hidden="true" />
        <input {...rest} id={inputId} name={name} type={inputType} className={`auth-input ${className ?? ""}`} />
        {password ? (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow((s) => !s)}
            className="auth-eye"
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

export function AuthError({ text }: { text: string }) {
  return (
    <p className="auth-notice err" role="alert">
      {text}
    </p>
  );
}
