"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { NAV_LINKS, SITE } from "./site-config";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b border-gold/30 transition-colors duration-500 ${
        scrolled ? "bg-paper/85 backdrop-blur-md" : "bg-paper/40 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-[76px] max-w-[1600px] items-center justify-between px-6 md:h-[100px] md:px-10">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-4">
          <span className="site-serif text-4xl italic leading-none text-ink">S</span>
          <span className="hidden h-9 w-px bg-ink/25 sm:block" />
          <span className="hidden leading-tight sm:block">
            <span className="block text-[17px] font-medium tracking-[0.18em] text-ink">
              SIDANA LABS
            </span>
            <span className="block text-[9px] uppercase tracking-[0.32em] text-ink-muted">
              {SITE.tagline}
            </span>
          </span>
        </Link>

        {/* Center links */}
        <nav className="hidden items-center gap-7 md:flex lg:gap-10">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="nav-link site-serif whitespace-nowrap text-[19px] text-ink/80 transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Right actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={SITE.loginPath}
            className="site-serif rounded-md border border-ink/50 px-5 py-2 text-[18px] text-ink transition hover:border-ink hover:bg-ink/5"
          >
            Login
          </Link>
          <a
            href="#contact"
            className="group site-serif inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2 text-[18px] text-paper transition hover:bg-ink/90"
          >
            Contact
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-ink/30 p-2 text-ink md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-gold/30 bg-paper/95 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="site-serif py-2 text-xl text-ink"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-3 flex gap-3">
                <Link
                  href={SITE.loginPath}
                  className="site-serif flex-1 rounded-md border border-ink/50 px-4 py-2 text-center text-lg text-ink"
                >
                  Login
                </Link>
                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className="site-serif flex-1 rounded-md bg-ink px-4 py-2 text-center text-lg text-paper"
                >
                  Contact →
                </a>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
