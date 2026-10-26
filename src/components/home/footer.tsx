import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SITE } from "@/components/site/site-config";
import { AskForm } from "./ask-form";
import { HOME_NAV } from "./content";

/* Barcode band: a fixed, deterministic bar sequence so server and client render
   the same markup (the mockup used Math.random, which would mismatch on hydration). */
const BAR_COUNT = 110;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  // small LCG → repeatable pseudo-random in [0,1)
  const r1 = ((i * 9301 + 49297) % 233280) / 233280;
  const r2 = ((i * 7919 + 104729) % 233280) / 233280;
  const tall = r1 < 0.18;
  const h = tall ? 70 + r2 * 30 : 20 + r2 * 45;
  return { h: `${h.toFixed(1)}%`, d: `${Math.min(0.9, i * 0.008).toFixed(3)}s` };
});

const FOOTER_LINKS = [
  HOME_NAV[0],
  HOME_NAV[1],
  { label: "Deal desk", href: "#desk" },
  { label: "Contact", href: "#contact" },
];

export function HomeFooter() {
  return (
    <footer className="footer">
      <div className="band" id="band" aria-hidden="true">
        {BARS.map((b, i) => (
          <i key={i} style={{ "--h": b.h, "--d": b.d } as CSSProperties} />
        ))}
      </div>
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <Image src="/images/logo-full.png" alt="Sidana Ventures" width={160} height={138} className="footer-logo" />
        </div>
        <div className="footer-cols">
          <div>
            <p className="eyebrow">Explore</p>
            <ul>
              {FOOTER_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} data-wipe>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Founders</p>
            <ul>
              <li>
                <Link href={SITE.loginPath}>Founder login</Link>
              </li>
              <li>
                <a href="#services">Weekly reports</a>
              </li>
              <li>
                <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
              </li>
            </ul>
          </div>
          <div className="footer-ask">
            <p className="eyebrow">Ask Sidana</p>
            <AskForm id="askInputFooter" placeholder="Ask us anything…" light />
          </div>
        </div>
        <div className="footer-bottom">
          <small>© {new Date().getFullYear()} Sidana Ventures LLP. All rights reserved.</small>
          <div className="socials">
            <a href="#" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 9v9M6 5v.5M10 18v-5a3 3 0 0 1 6 0v5M10 9v9" />
              </svg>
            </a>
            <a href="#" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5l14 14M19 5 5 19" />
              </svg>
            </a>
            <a href={`mailto:${SITE.contactEmail}`} aria-label="Email">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </a>
          </div>
          <div className="legal">
            <a href="#">Privacy</a>
            <a href="#">Disclosures</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
