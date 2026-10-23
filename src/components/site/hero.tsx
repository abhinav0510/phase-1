"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

const ease = [0.22, 1, 0.36, 1] as const;
const up = (delay: number) => ({
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 1, delay, ease },
});

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-paper pt-[76px] md:pt-[100px]">
      {/* very soft cool glow behind the stage */}
      <div className="pointer-events-none absolute -right-32 top-20 z-0 h-[640px] w-[640px] rounded-full bg-[radial-gradient(circle,rgba(71,106,160,0.10),transparent_62%)]" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] max-w-[1600px] grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-[46%_54%] md:px-10 md:py-0">
        {/* Copy */}
        <div>
          <motion.p
            {...up(0.05)}
            className="mb-6 text-[11px] uppercase tracking-[0.35em] text-gold-dim"
          >
            Investment Banking / Venture Advisory
          </motion.p>

          <motion.h1
            {...up(0.15)}
            className="site-serif text-[clamp(56px,7vw,110px)] leading-[0.92] text-ink"
          >
            Capital meets
            <br />
            <span className="italic text-gold-dim">conviction.</span>
          </motion.h1>

          <motion.div {...up(0.35)} className="my-8 h-px w-[100px] bg-gold-dim" />

          <motion.p
            {...up(0.45)}
            className="site-serif max-w-[520px] text-[clamp(20px,1.6vw,26px)] leading-snug text-ink/80"
          >
            Strategic capital, institutional thinking,
            <br className="hidden sm:block" /> and hands-on execution for ambitious companies.
          </motion.p>

          <motion.div {...up(0.6)} className="mt-10 flex flex-wrap gap-4">
            <a
              href="#approach"
              className="group site-serif inline-flex items-center gap-3 rounded-md bg-ink px-7 py-3 text-[19px] text-paper transition hover:bg-ink/90"
            >
              Explore our approach
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#contact"
              className="site-serif inline-flex items-center rounded-md border border-ink/30 px-7 py-3 text-[19px] text-ink transition hover:border-ink hover:bg-ink/5"
            >
              Discuss a mandate
            </a>
          </motion.div>
        </div>

        {/* 3D scene inside a navy stage (desktop) */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease }}
          className="relative hidden h-[600px] overflow-hidden rounded-2xl border border-gold/30 bg-[linear-gradient(160deg,#0B1728_0%,#101D30_60%,#0B1728_100%)] shadow-[0_40px_90px_rgba(11,23,40,0.28)] md:block lg:h-[700px]"
        >
          {/* stage dressing */}
          <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(216,176,120,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(216,176,120,0.07)_1px,transparent_1px)] [background-size:72px_72px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_28%,rgba(71,106,160,0.35),transparent_58%)]" />
          <div className="pointer-events-none absolute inset-x-[12%] bottom-8 h-28 rounded-[100%] bg-gold/15 blur-3xl" />
          {/* scene */}
          <div className="absolute inset-0">
            <HeroScene />
          </div>
          {/* corner caption */}
          <div className="pointer-events-none absolute bottom-5 left-6 flex items-center gap-3">
            <span className="h-px w-8 bg-gold" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-ivory/70">
              Capital · Strategy · Venture
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
