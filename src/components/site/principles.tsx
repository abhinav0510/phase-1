"use client";

import { Reveal } from "./reveal";

const PRINCIPLES = [
  {
    n: "01",
    title: "Clarity",
    body: "We start by understanding the business precisely — the economics, the risks, and what the capital is actually for.",
  },
  {
    n: "02",
    title: "Conviction",
    body: "We back positions we believe in and say so plainly, to founders and to the investors we introduce.",
  },
  {
    n: "03",
    title: "Compounding",
    body: "We build relationships and structures designed to keep paying off well beyond a single transaction.",
  },
];

export function Principles() {
  return (
    <section className="relative bg-paper py-24">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-0">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.12} className="relative">
              <div className="flex items-center gap-5">
                <span className="site-serif text-5xl italic text-gold-dim">{p.n}</span>
                <span className="h-9 w-px bg-ink/20" />
                <span className="site-serif text-5xl text-ink">{p.title}</span>
                {i < PRINCIPLES.length - 1 ? (
                  <span className="ml-6 hidden h-px flex-1 bg-ink/10 md:block" />
                ) : null}
              </div>
              <p className="mt-5 max-w-[360px] text-[15px] leading-relaxed text-ink-muted">
                {p.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
