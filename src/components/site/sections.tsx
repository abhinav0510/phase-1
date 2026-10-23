"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Compass,
  Handshake,
  Layers,
  Rocket,
  TrendingUp,
  Users,
} from "lucide-react";
import { Reveal } from "./reveal";
import { NAV_LINKS, SITE } from "./site-config";

/* ---------- shared bits ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] uppercase tracking-[0.35em] text-gold-dim">{children}</p>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="site-serif text-[clamp(40px,4.6vw,68px)] leading-[1.02] text-ink">
      {children}
    </h2>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative scroll-mt-24 py-28 ${className}`}>
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">{children}</div>
    </section>
  );
}

const CARD =
  "rounded-xl border border-ink/10 bg-white transition duration-500 hover:-translate-y-1 hover:border-gold-dim/50 hover:shadow-[0_24px_60px_rgba(11,23,40,0.08)]";

/* ---------- What we do ---------- */

const SERVICES = [
  {
    icon: TrendingUp,
    title: "Investment Strategy",
    body: "Thesis development, round structuring, and a clear-eyed read on what the market will actually fund.",
  },
  {
    icon: Handshake,
    title: "Capital Advisory",
    body: "Investor targeting, warm introductions, and disciplined process management from first call to close.",
  },
  {
    icon: Rocket,
    title: "Venture Building",
    body: "Hands-on operating support for teams moving from traction to institutional readiness.",
  },
  {
    icon: Users,
    title: "Portfolio Support",
    body: "Ongoing counsel, follow-on preparation, and the relationships that compound over time.",
  },
];

export function WhatWeDo() {
  return (
    <Section id="what-we-do" className="border-t border-ink/10 bg-white">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[38%_1fr]">
        <Reveal>
          <Eyebrow>What we do</Eyebrow>
          <Heading>
            Institutional discipline,{" "}
            <span className="italic text-gold-dim">founder pace.</span>
          </Heading>
          <p className="mt-6 max-w-[440px] text-[16px] leading-relaxed text-ink-muted">
            Sidana Labs works at the intersection of capital and operating reality — advising
            ambitious companies on how to raise, from whom, and what to build once the money
            lands.
          </p>
        </Reveal>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.title} delay={0.1 + i * 0.08}>
                <div className={`group h-full p-7 ${CARD}`}>
                  <Icon className="mb-6 h-7 w-7 text-gold-dim" />
                  <h3 className="site-serif text-3xl text-ink">{s.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{s.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Our approach ---------- */

const STEPS = [
  {
    icon: Compass,
    n: "01",
    title: "Diagnose",
    body: "A rigorous look at the business, the numbers, and the ask — before anyone is approached.",
  },
  {
    icon: Layers,
    n: "02",
    title: "Structure",
    body: "The right round, the right instrument, and a target list built on genuine fit — not volume.",
  },
  {
    icon: BarChart3,
    n: "03",
    title: "Execute",
    body: "Introductions, follow-through, and a managed process that respects everyone's time.",
  },
];

export function Approach() {
  return (
    <Section id="approach" className="border-t border-ink/10 bg-paper-3">
      <Reveal className="max-w-[720px]">
        <Eyebrow>Our approach</Eyebrow>
        <Heading>
          A process built on <span className="italic text-gold-dim">fit</span>, not noise.
        </Heading>
      </Reveal>
      <div className="relative mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
        <div className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-ink/10 md:block" />
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.n} delay={0.1 + i * 0.12}>
              <div className="relative">
                <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-gold-dim/50 bg-white shadow-[0_8px_24px_rgba(11,23,40,0.06)]">
                  <Icon className="h-6 w-6 text-gold-dim" />
                </div>
                <p className="site-serif mt-6 text-sm italic text-gold-dim">{s.n}</p>
                <h3 className="site-serif text-4xl text-ink">{s.title}</h3>
                <p className="mt-3 max-w-[340px] text-[15px] leading-relaxed text-ink-muted">
                  {s.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- Portfolio (focus sectors — no private company names) ---------- */

const SECTORS = [
  "EdTech",
  "Fintech",
  "HealthTech",
  "AgriTech",
  "Consumer",
  "Logistics & Supply Chain",
  "Industrial & IoT",
  "Recommerce",
];

export function Portfolio() {
  return (
    <Section id="portfolio" className="border-t border-ink/10 bg-white">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[38%_1fr]">
        <Reveal>
          <Eyebrow>Portfolio</Eyebrow>
          <Heading>
            Where we deploy <span className="italic text-gold-dim">conviction.</span>
          </Heading>
          <p className="mt-6 max-w-[440px] text-[16px] leading-relaxed text-ink-muted">
            We work across sectors where operating depth matters as much as capital. Company
            names are shared with investors and partners under mandate.
          </p>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SECTORS.map((s, i) => (
            <Reveal key={s} delay={0.05 + i * 0.05}>
              <div className={`flex h-32 items-end p-5 ${CARD}`}>
                <span className="site-serif text-2xl leading-tight text-ink">{s}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ---------- Insights (perspectives) ---------- */

const PERSPECTIVES = [
  {
    tag: "On capital",
    title: "Raise for the business you are, not the one in the deck.",
    body: "The strongest rounds we see are sized to real milestones. Over-raising buys time; it rarely buys clarity.",
  },
  {
    tag: "On conviction",
    title: "A warm introduction is a judgement, not a favour.",
    body: "Every intro we make carries our name. We only make the ones we would stand behind in the room.",
  },
  {
    tag: "On compounding",
    title: "The second cheque is won in the first year.",
    body: "Follow-on capital follows disciplined reporting and honest updates. We help teams build that habit early.",
  },
];

export function Insights() {
  return (
    <Section id="insights" className="border-t border-ink/10 bg-paper-3">
      <Reveal className="max-w-[720px]">
        <Eyebrow>Insights</Eyebrow>
        <Heading>
          Perspectives from the <span className="italic text-gold-dim">table.</span>
        </Heading>
      </Reveal>
      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
        {PERSPECTIVES.map((p, i) => (
          <Reveal key={p.title} delay={0.1 + i * 0.1}>
            <article className={`h-full p-8 ${CARD}`}>
              <p className="text-[11px] uppercase tracking-[0.3em] text-gold-dim">{p.tag}</p>
              <h3 className="site-serif mt-4 text-3xl leading-tight text-ink">{p.title}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">{p.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* ---------- Contact ---------- */

export function Contact() {
  return (
    <Section id="contact" className="border-t border-ink/10 bg-white">
      <Reveal className="relative mx-auto max-w-[880px] text-center">
        <Eyebrow>Contact</Eyebrow>
        <h2 className="site-serif text-[clamp(44px,6vw,88px)] leading-[0.98] text-ink">
          Let&apos;s discuss <span className="italic text-gold-dim">a mandate.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[520px] text-[16px] leading-relaxed text-ink-muted">
          Founders raising a round, and investors looking for well-prepared opportunities —
          we&apos;d like to hear from you.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="group site-serif inline-flex items-center gap-3 rounded-md bg-ink px-7 py-3 text-[19px] text-paper transition hover:bg-ink/90"
          >
            {SITE.contactEmail}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <Link
            href={SITE.loginPath}
            className="site-serif inline-flex items-center rounded-md border border-ink/30 px-7 py-3 text-[19px] text-ink transition hover:border-ink hover:bg-ink/5"
          >
            Founder login
          </Link>
        </div>
      </Reveal>
    </Section>
  );
}

/* ---------- Footer (navy) ---------- */

export function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-6 py-14 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-4">
          <span className="site-serif text-3xl italic text-paper">S</span>
          <span className="h-8 w-px bg-paper/30" />
          <div className="leading-tight">
            <p className="text-[15px] tracking-[0.18em] text-paper">SIDANA LABS</p>
            <p className="text-[9px] uppercase tracking-[0.32em] text-paper/60">
              {SITE.tagline}
            </p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="site-serif text-lg text-paper/80 transition hover:text-gold"
            >
              {l.label}
            </a>
          ))}
          <Link
            href={SITE.loginPath}
            className="site-serif text-lg text-paper/80 transition hover:text-gold"
          >
            Login
          </Link>
        </nav>
        <p className="text-xs text-paper/60">
          © {new Date().getFullYear()} {SITE.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
