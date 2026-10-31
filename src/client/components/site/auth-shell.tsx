"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties, type ReactNode } from "react";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowRight, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { brandFontVars } from "@/client/lib/fonts";
import "@/app/auth.css";

/* Sign-in shell for /login, /teamonly, /forgot-password, /reset-password and
   /force-reset, in the homepage's visual language (navy runway, gold comets,
   Montserrat, cream card, gold pill button). Styles live in app/auth.css. */

const ease = [0.22, 1, 0.36, 1] as const;

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const v = (o: Record<string, string | number>) => o as Vars;

const LINE_PATHS = [
  "M160 240 L420 300 L720 262 L1040 330 L1290 250",
  "M120 690 L430 600 L720 640 L1030 560 L1320 650",
  "M420 300 L430 600",
  "M1040 330 L1030 560",
  "M160 240 L120 690",
  "M1290 250 L1320 650",
];
const COMETS: Array<[string, string]> = [
  ["10s", "0s"],
  ["12s", "-4s"],
  ["7s", "-2s"],
  ["8s", "-5s"],
  ["11s", "-7s"],
  ["9.5s", "-3s"],
];
const NODES: Array<[number, number]> = [
  [160, 240], [420, 300], [720, 262], [1040, 330], [1290, 250],
  [120, 690], [430, 600], [720, 640], [1030, 560], [1320, 650],
];

function Backdrop() {
  return (
    <svg className="auth-lines" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g className="base">
        {LINE_PATHS.map((d) => (
          <path key={d} d={d} pathLength={1} />
        ))}
      </g>
      <g className="comet">
        {LINE_PATHS.map((d, i) => (
          <path key={d} d={d} pathLength={1} style={v({ "--dur": COMETS[i][0], "--delay": COMETS[i][1] })} />
        ))}
      </g>
      {NODES.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.5} />
      ))}
    </svg>
  );
}

/* Floating "deal artifacts" beside the card on wide screens, as on the homepage hero. */
function Artifacts({ variant }: { variant: "founder" | "team" }) {
  const enter = (delay: number, rotate: number) => ({
    initial: { opacity: 0, y: 24, rotate },
    animate: { opacity: 1, y: 0, rotate },
    transition: { duration: 1, ease, delay },
  });
  if (variant === "team") {
    return (
      <>
        <motion.div className="auth-art a1" aria-hidden="true" {...enter(0.6, -3)}>
          <p className="art-k">Pipeline today</p>
          <div className="art-rows">
            <span>New matches <b>12</b></span>
            <span>Intros sent <b>24</b></span>
            <span>Replies owed <b>5</b></span>
          </div>
        </motion.div>
        <motion.div className="auth-art a2" aria-hidden="true" {...enter(0.75, 3)}>
          <p className="art-k">Follow-ups due</p>
          <p className="art-v">7<small> today</small></p>
          <p className="art-f">
            <b>3</b> meetings to debrief
          </p>
          <span className="art-dot" />
        </motion.div>
      </>
    );
  }
  return (
    <>
      <motion.div className="auth-art a1" aria-hidden="true" {...enter(0.6, -3)}>
        <p className="art-k">Investor match</p>
        <p className="art-v">92<small>/100</small></p>
        <div className="art-bars">
          <i style={v({ "--w": "96%" })} />
          <i style={v({ "--w": "88%" })} />
          <i style={v({ "--w": "81%" })} />
        </div>
        <p className="art-f">Sector · Stage · Cheque size</p>
      </motion.div>
      <motion.div className="auth-art a2" aria-hidden="true" {...enter(0.75, 3)}>
        <p className="art-k">Weekly report</p>
        <div className="art-chart">
          {["40%", "55%", "48%", "70%", "64%", "92%"].map((h, i) => (
            <i key={i} style={v({ "--h": h })} />
          ))}
        </div>
        <p className="art-f">
          <b>+38%</b> investors reached
        </p>
      </motion.div>
    </>
  );
}

export const authStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } },
};
export const authItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export function AuthShell({
  portalLabel,
  variant = "founder",
  tagline = ["Backing", "ambitious", "founders"],
  children,
}: {
  portalLabel: string;
  variant?: "founder" | "team";
  tagline?: string[];
  children: ReactNode;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className={`auth-v3 ${brandFontVars}`}>
        <Backdrop />

        <motion.div
          className="auth-top"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.1 }}
        >
          <Link href="/" className="auth-wordmark" aria-label="Sidana Ventures — home">
            <Image src="/images/logo-icon.png" alt="" width={32} height={32} className="auth-logo-icon" />
            <span>Sidana</span>
            <span>Ventures</span>
          </Link>
          <div className="auth-right">
            <span className="auth-portal">{portalLabel}</span>
            <Link href="/" className="auth-back">
              ← Back to site
            </Link>
          </div>
        </motion.div>

        <Artifacts variant={variant} />

        <motion.div
          className="auth-tagline"
          aria-hidden="true"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.35 }}
        >
          <div>
            {tagline.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
        </motion.div>

        <main className="auth-stage">
          <motion.div
            className="auth-card"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, ease, delay: 0.2 }}
          >
            <motion.div variants={authStagger} initial="hidden" animate="show">
              {children}
            </motion.div>
          </motion.div>
        </main>
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
