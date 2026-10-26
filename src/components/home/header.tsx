"use client";

import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/components/site/site-config";
import { HOME_NAV } from "./content";

export function HomeHeader({
  open,
  pastHero,
  onToggle,
}: {
  open: boolean;
  pastHero: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <header className={`site-header${pastHero ? " past-hero" : ""}`}>
        <a href="#top" className="wordmark" aria-label="Sidana Ventures — home">
          <Image src="/images/logo-icon.png" alt="" width={36} height={36} className="header-logo-icon" />
          <span className="line-mask">
            <span className="line">Sidana</span>
          </span>
          <span className="line-mask">
            <span className="line">Ventures</span>
          </span>
        </a>
        <button
          type="button"
          className="menu-btn"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="home-menu"
          onClick={onToggle}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <nav className={`menu${open ? " open" : ""}`} id="home-menu" aria-hidden={!open} aria-label="Site">
        <div className="menu-inner">
          <p className="eyebrow">Explore</p>
          <ul className="menu-links">
            {HOME_NAV.map((l) => (
              <li key={l.href}>
                <a href={l.href} data-wipe tabIndex={open ? 0 : -1}>
                  <span className="line-mask">
                    <span className="line">{l.label}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="menu-foot">
            <Link href={SITE.loginPath} className="btn btn-accent menu-login" tabIndex={open ? 0 : -1}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
              </svg>
              Founder login <span aria-hidden="true">→</span>
            </Link>
            <a href={`mailto:${SITE.contactEmail}`} className="menu-sub" tabIndex={open ? 0 : -1}>
              {SITE.contactEmail}
            </a>
          </div>
        </div>
      </nav>
    </>
  );
}
