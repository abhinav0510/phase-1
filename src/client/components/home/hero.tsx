"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import { SITE } from "@/client/components/site/site-config";
import { HERO } from "./content";
import { useHomeUi } from "./home-context";

/* Connection lines drawn behind the hero; comets run along them. */
const LINE_PATHS = [
  "M160 240 L420 300 L720 262 L1040 330 L1290 250",
  "M120 690 L430 600 L720 640 L1030 560 L1320 650",
  "M420 300 L430 600",
  "M1040 330 L1030 560",
  "M720 262 L720 640",
  "M160 240 L120 690",
  "M1290 250 L1320 650",
];
const COMETS: Array<[string, string]> = [
  ["9s", "0s"],
  ["11s", "-4s"],
  ["6s", "-2s"],
  ["7s", "-5s"],
  ["8s", "-1s"],
  ["10s", "-7s"],
  ["9.5s", "-3s"],
];
const NODES: Array<[number, number]> = [
  [160, 240], [420, 300], [720, 262], [1040, 330], [1290, 250],
  [120, 690], [430, 600], [720, 640], [1030, 560], [1320, 650],
];

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const v = (o: Record<string, string | number>) => o as Vars;

/** Pinned hero "runway": copy in the middle, deal artifacts drifting apart with scroll. */
export function HomeHero() {
  const runway = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const grain = useRef<HTMLCanvasElement>(null);
  const pill = useRef<HTMLAnchorElement>(null);
  const { setPastHero } = useHomeUi();

  /* Scroll progress → one CSS variable (--p) that the stylesheet animates against. */
  useEffect(() => {
    const rw = runway.current;
    const st = sticky.current;
    if (!rw || !st) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPastHero(false);
      return;
    }
    let ticking = false;
    const update = () => {
      ticking = false;
      const span = rw.offsetHeight - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, window.scrollY / span)) : 0;
      st.style.setProperty("--p", p.toFixed(4));
      setPastHero(p > 0.92);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [setPastHero]);

  /* Film grain: low-res noise at ~24 fps, paused when the hero is off-screen or the tab hidden. */
  useEffect(() => {
    const canvas = grain.current;
    const rw = runway.current;
    const st = sticky.current;
    if (!canvas || !rw || !st || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const SCALE = 0.33;
    let img: ImageData | undefined;
    let last = 0;
    let raf = 0;
    let running = false;
    let visible = true;
    const resize = () => {
      const w = Math.max(1, Math.round(st.clientWidth * SCALE));
      const h = Math.max(1, Math.round(st.clientHeight * SCALE));
      canvas.width = w;
      canvas.height = h;
      img = ctx.createImageData(w, h);
    };
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (!img || t - last < 42) return;
      last = t;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = n;
        d[i + 3] = 46;
      }
      ctx.putImageData(img, 0, 0);
    };
    const start = () => {
      if (!running && visible && !document.hidden) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (running) {
        cancelAnimationFrame(raf);
        running = false;
      }
    };
    resize();
    start();
    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(resize, 150);
    };
    const onVis = () => (document.hidden ? stop() : start());
    const io = new IntersectionObserver(
      (en) => {
        visible = en[0]?.isIntersecting ?? true;
        visible ? start() : stop();
      },
      { threshold: 0.02 },
    );
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    io.observe(rw);
    return () => {
      stop();
      clearTimeout(rt);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, []);

  /* The frosted pill's glow follows the cursor. */
  const onPillMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const el = pill.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <section className="hero-runway" aria-label="Introduction" ref={runway}>
      <div className="hero-sticky" ref={sticky}>
        <canvas className="grain" aria-hidden="true" ref={grain} />

        <svg className="lines" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <g className="lines-base">
            {LINE_PATHS.map((d) => (
              <path key={d} d={d} pathLength={1} />
            ))}
          </g>
          <g className="lines-comet">
            {LINE_PATHS.map((d, i) => (
              <path key={d} d={d} pathLength={1} style={v({ "--dur": COMETS[i][0], "--delay": COMETS[i][1] })} />
            ))}
          </g>
          <g className="lines-nodes">
            {NODES.map(([cx, cy]) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4} />
            ))}
          </g>
        </svg>

        {/* Deal artifacts live in the side columns, copy in the middle, so they can never overlap. */}
        <div className="hero-grid">
          <div className="art art-match" style={v({ "--depth": 0.35, "--x": -1 })} aria-hidden="true">
            <p className="art-k">Investor match</p>
            <p className="art-v">
              92<span>/100</span>
            </p>
            <div className="art-bars">
              <i style={v({ "--w": "96%" })} />
              <i style={v({ "--w": "88%" })} />
              <i style={v({ "--w": "81%" })} />
            </div>
            <p className="art-f">Sector · Stage · Cheque size</p>
          </div>
          <div className="art art-meet" style={v({ "--depth": 0.6, "--x": 1 })} aria-hidden="true">
            <p className="art-k">Meeting confirmed</p>
            <p className="art-t">Thu · 11:30 IST</p>
            <p className="art-f">Seed fund, Bengaluru · 45 min</p>
            <span className="art-dot" />
          </div>
          <div className="art art-report" style={v({ "--depth": 0.45, "--x": -1 })} aria-hidden="true">
            <p className="art-k">Weekly report</p>
            <div className="art-chart">
              {["40%", "55%", "48%", "70%", "64%", "92%"].map((h, i) => (
                <i key={i} style={v({ "--h": h, "--i": i })} />
              ))}
            </div>
            <p className="art-f">
              <b>+38%</b> investors reached
            </p>
          </div>
          <div className="art art-term" style={v({ "--depth": 0.8, "--x": 1 })} aria-hidden="true">
            <p className="art-k">Term sheet</p>
            <div className="art-doc">
              <i />
              <i />
              <i style={{ width: "60%" }} />
              <i />
              <i style={{ width: "45%" }} />
            </div>
            <span className="art-stamp">Signed</span>
          </div>

          <div className="hero-copy">
            <h1>
              <span className="line-mask">
                <span className="line">{HERO.headline[0]}</span>
              </span>
              <span className="line-mask">
                <span className="line accent">{HERO.headline[1]}</span>
              </span>
            </h1>
            <p className="hero-sub">{HERO.sub}</p>
            <Link href={SITE.loginPath} className="frosted" id="heroPrompt" ref={pill} onPointerMove={onPillMove}>
              <span className="frosted-glow" />
              <span className="frosted-label">Founder login</span>
              <span className="frosted-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <div className="swipe" aria-hidden="true">
              <div className="swipe-inner">
                <span className="swipe-label">
                  <b className="lbl-scroll">Scroll down</b>
                  <b className="lbl-swipe">Swipe down</b>
                </span>
                <span className="swipe-chevrons">
                  <i />
                  <i />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
