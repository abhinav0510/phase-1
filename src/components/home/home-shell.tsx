"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HomeHeader } from "./header";
import { HomeUiContext, type HomeUi } from "./home-context";

const WIPE_IN_MS = 580;
const WIPE_OUT_MS = 600;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animates a .dnum element from 0 to its data-count once. */
function countUp(el: Element | null, reduce: boolean) {
  if (!(el instanceof HTMLElement) || el.dataset.done) return;
  el.dataset.done = "1";
  const target = Number(el.dataset.count || 0);
  const fmt = new Intl.NumberFormat("en-IN");
  if (reduce) {
    el.textContent = fmt.format(target);
    return;
  }
  const t0 = performance.now();
  const dur = 1500;
  const tick = (now: number) => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt.format(Math.round(target * eased));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Wrapper for the public homepage. Owns the behaviours the mockup ran on
 * <body>: the load-in "is-ready" flag, the full-screen menu, the colour wipe
 * for in-page navigation, scroll reveals, the stat count-up and the
 * "How we help" focal-row highlight. Everything is scoped to this element.
 */
export function HomeShell({ className, children }: { className: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const wipe = useRef<HTMLDivElement>(null);
  const wiping = useRef(false);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  /* Load-in: play once fonts are available, but never wait on a slow font. */
  useEffect(() => {
    let done = false;
    const go = () => {
      if (!done) {
        done = true;
        setReady(true);
      }
    };
    const t = setTimeout(go, 900);
    document.fonts?.ready.then(go, go);
    return () => clearTimeout(t);
  }, []);

  /* Menu: lock page scroll while open, close on Escape. */
  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  const jumpTo = useCallback((hash: string) => {
    const el = root.current?.querySelector(hash);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "instant" as ScrollBehavior });
  }, []);

  /* Colour wipe for in-page navigation (links carrying data-wipe). */
  const navigateTo = useCallback(
    (hash: string) => {
      setMenuOpen(false);
      const w = wipe.current;
      if (prefersReducedMotion() || wiping.current || !w) {
        jumpTo(hash);
        return;
      }
      wiping.current = true;
      w.classList.remove("out");
      w.classList.add("in");
      setTimeout(() => {
        jumpTo(hash);
        w.classList.remove("in");
        w.classList.add("out");
        setTimeout(() => {
          w.classList.remove("out");
          wiping.current = false;
        }, WIPE_OUT_MS);
      }, WIPE_IN_MS);
    },
    [jumpTo],
  );

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[data-wipe]");
      const hash = a?.getAttribute("href");
      if (!hash || !hash.startsWith("#")) return;
      e.preventDefault();
      navigateTo(hash);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [navigateTo]);

  /* Scroll reveals (once), count-up, and the focal-row highlight. */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = prefersReducedMotion();

    const revealed = (t: Element) => {
      t.classList.add("in-view");
      if (t.classList.contains("dcard-stat")) countUp(t.querySelector(".dnum"), reduce);
    };
    const targets = Array.from(el.querySelectorAll(".reveal, .reveal-lines, .band, .dots"));
    let io: IntersectionObserver | undefined;
    if (!reduce && "IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              revealed(en.target);
              io?.unobserve(en.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
      );
      targets.forEach((t) => {
        const r = t.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) revealed(t);
        else io?.observe(t);
      });
    } else {
      targets.forEach(revealed);
    }

    const rows = Array.from(el.querySelectorAll<HTMLElement>(".help-row"));
    let ticking = false;
    const focusRow = () => {
      ticking = false;
      const focal = window.innerHeight * 0.5;
      let best: HTMLElement | null = null;
      let bestD = Infinity;
      rows.forEach((r) => {
        const b = r.getBoundingClientRect();
        const d = Math.abs(b.top + b.height / 2 - focal);
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      });
      rows.forEach((r) => r.classList.toggle("is-focus", r === best));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(focusRow);
      }
    };
    if (reduce || rows.length === 0) rows.forEach((r) => r.classList.add("is-focus"));
    else {
      window.addEventListener("scroll", onScroll, { passive: true });
      focusRow();
    }

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const ui = useMemo<HomeUi>(() => ({ setPastHero, closeMenu: () => setMenuOpen(false) }), []);

  return (
    <HomeUiContext.Provider value={ui}>
      <div ref={root} className={`${className} home-v3${ready ? " is-ready" : ""}`}>
        <a className="skip" href="#work">
          Skip to content
        </a>
        <HomeHeader open={menuOpen} pastHero={pastHero} onToggle={() => setMenuOpen((o) => !o)} />
        <div className="wipe" ref={wipe} aria-hidden="true" />
        <main id="top">{children}</main>
      </div>
    </HomeUiContext.Provider>
  );
}
