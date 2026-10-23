"use client";

import { Handshake, Rocket, TrendingUp, Users } from "lucide-react";
import { Reveal } from "./reveal";

const ITEMS = [
  { icon: TrendingUp, label: "Investment Strategy" },
  { icon: Handshake, label: "Capital Advisory" },
  { icon: Rocket, label: "Venture Building" },
  { icon: Users, label: "Portfolio Support" },
];

export function ServicesStrip() {
  return (
    <div className="border-y border-ink/10 bg-white">
      <div className="mx-auto grid max-w-[1600px] grid-cols-2 md:grid-cols-4">
        {ITEMS.map((it, i) => {
          const Icon = it.icon;
          return (
            <Reveal
              key={it.label}
              delay={i * 0.08}
              className={`group flex items-center justify-center gap-4 px-4 py-7 ${
                i < ITEMS.length - 1 ? "md:border-r md:border-ink/10" : ""
              } ${i % 2 === 0 ? "border-r border-ink/10 md:border-r-0" : ""} ${
                i < 2 ? "border-b border-ink/10 md:border-b-0" : ""
              }`}
            >
              <Icon className="h-6 w-6 text-gold-dim transition-transform duration-500 group-hover:-translate-y-0.5" />
              <span className="text-[12px] uppercase tracking-[0.3em] text-ink/80">
                {it.label}
              </span>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
