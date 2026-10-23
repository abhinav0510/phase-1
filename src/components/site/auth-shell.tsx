"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { SITE } from "./site-config";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/* Cinematic architectural backdrop — cool light atrium (CSS + motion)  */
/* ------------------------------------------------------------------ */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,#FFFFFF_0%,#F2F4F7_60%)]" />

      {/* drifting cool haze */}
      <motion.div
        animate={{ x: [-30, 30, -30], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-[-10%] bg-[radial-gradient(ellipse_at_50%_55%,rgba(71,106,160,0.10),transparent_58%)]"
      />

      {/* stone floor */}
      <div className="absolute inset-x-0 bottom-0 h-[36%] border-t border-ink/[0.08] bg-[linear-gradient(to_bottom,#EEF0F3_0%,#E6E9EE_45%,#DFE3E9_100%)]" />
      {/* diagonal walkway catching the warm light */}
      <div
        className="absolute bottom-0 left-[26%] h-[36%] w-[66%] bg-[linear-gradient(to_right,rgba(11,23,40,0.02),rgba(216,176,120,0.12))]"
        style={{ clipPath: "polygon(0 100%, 52% 0, 100% 0, 100% 100%)" }}
      />
      {/* floor light pool under the light-slit */}
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 right-[2%] h-[34%] w-[46%] bg-[radial-gradient(ellipse_at_78%_100%,rgba(216,176,120,0.24),transparent_62%)]"
      />
      {/* soft shadow pooling under the card */}
      <div className="absolute bottom-[8%] left-1/2 h-24 w-[46%] -translate-x-1/2 rounded-[100%] bg-ink/5 blur-3xl" />

      {/* left slab */}
      <div
        className="absolute bottom-[14%] left-0 h-[38%] w-[32%] bg-[linear-gradient(135deg,#EAEDF2_0%,#DDE2E9_55%,#D3D9E1_100%)] shadow-[0_30px_60px_rgba(11,23,40,0.12)]"
        style={{ clipPath: "polygon(0 16%, 100% 0, 100% 100%, 0 100%)" }}
      />
      {/* left slab top-edge highlight */}
      <div
        className="absolute bottom-[14%] left-0 h-[38%] w-[32%] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.8),transparent_6%)]"
        style={{ clipPath: "polygon(0 16%, 100% 0, 100% 100%, 0 100%)" }}
      />

      {/* right door wedge */}
      <div
        className="absolute bottom-[12%] right-[13%] top-[30%] w-[9%] bg-[linear-gradient(to_left,#E5E9EF,#D8DDE5)] shadow-[-20px_0_40px_rgba(11,23,40,0.07)]"
        style={{ clipPath: "polygon(0 8%, 100% 0, 100% 100%, 0 100%)" }}
      />
      {/* right wall */}
      <div
        className="absolute bottom-0 right-0 top-[8%] w-[15%] bg-[linear-gradient(to_right,#E8EBF0,#DADFE7)]"
        style={{ clipPath: "polygon(0 12%, 100% 0, 100% 100%, 0 100%)" }}
      />
      {/* gold light-slit — the one warm accent */}
      <motion.div
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[10%] right-[15%] top-[18%] w-[3px] bg-[linear-gradient(to_bottom,transparent,#E8CFA0_18%,#D8B078_50%,#E8CFA0_82%,transparent)] shadow-[0_0_22px_6px_rgba(216,176,120,0.4),0_0_80px_22px_rgba(216,176,120,0.16)]"
      />
      {/* light spill on the wall beside the slit */}
      <div className="absolute bottom-[10%] right-[6%] top-[18%] w-[9%] bg-[linear-gradient(to_right,rgba(216,176,120,0.16),transparent)]" />

      {/* soft edge vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(11,23,40,0.08)_100%)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shell: backdrop + brand chrome + centred card                        */
/* ------------------------------------------------------------------ */
export function AuthShell({
  portalLabel,
  tagline = ["Backing", "ambitious", "founders"],
  children,
}: {
  portalLabel: string;
  tagline?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-paper-3 text-ink">
      <Backdrop />

      {/* brand — top left */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.1 }}
        className="absolute left-6 top-6 z-20 md:left-12 md:top-10"
      >
        <Link href="/" className="flex items-center gap-4">
          <span className="site-serif flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-3xl font-medium text-paper shadow-[0_10px_30px_rgba(11,23,40,0.25)] md:h-14 md:w-14">
            S
          </span>
          <span className="leading-tight">
            <span className="site-serif block text-2xl text-ink md:text-[30px]">
              Sidana Labs
            </span>
            <span className="block text-[10px] uppercase tracking-[0.32em] text-ink-muted">
              {SITE.tagline}
            </span>
          </span>
        </Link>
      </motion.div>

      {/* portal tag — top right */}
      <motion.div
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.2 }}
        className="absolute right-6 top-9 z-20 hidden items-center gap-3 md:right-12 md:top-12 md:flex"
      >
        <span className="h-px w-10 bg-gold-dim" />
        <span className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
          {portalLabel}
        </span>
      </motion.div>

      {/* tagline — bottom left */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease, delay: 0.35 }}
        className="absolute bottom-10 left-6 z-20 hidden gap-4 md:left-12 md:flex"
      >
        <span className="w-px self-stretch bg-gold-dim" />
        <div className="text-[11px] uppercase leading-[2] tracking-[0.35em] text-ink-muted">
          {tagline.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </div>
      </motion.div>

      {/* card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-28">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease, delay: 0.25 }}
          className="w-full max-w-[520px] rounded-2xl border border-gold-dim/40 bg-white/85 p-8 shadow-[0_30px_80px_rgba(11,23,40,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md md:p-12"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Staggered content helpers                                            */
/* ------------------------------------------------------------------ */
export const authStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } },
};
export const authItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

/* ------------------------------------------------------------------ */
/* Field with leading icon and optional password visibility toggle      */
/* ------------------------------------------------------------------ */
type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: LucideIcon;
  password?: boolean;
};

export function AuthField({ label, icon: Icon, password, className, type, ...rest }: FieldProps) {
  const [show, setShow] = useState(false);
  const inputType = password ? (show ? "text" : "password") : (type ?? "text");

  return (
    <div>
      <label className="mb-2 block text-[13px] font-medium text-ink">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-muted/80" />
        <input
          {...rest}
          type={inputType}
          className={`h-12 w-full rounded-lg border border-ink/15 bg-white pl-11 pr-11 text-[15px] text-ink outline-none transition placeholder:text-ink-muted/60 focus:border-gold-dim focus:shadow-[0_0_0_3px_rgba(168,134,90,0.15)] ${className ?? ""}`}
        />
        {password ? (
          <button
            type="button"
            aria-label={show ? "Hide password" : "Show password"}
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-ink-muted/80 transition hover:text-ink"
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AuthError({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-red-500/30 bg-red-50 px-3 py-2 text-xs text-red-700">
      {text}
    </p>
  );
}
