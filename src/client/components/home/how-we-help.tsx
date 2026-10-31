import type { CSSProperties } from "react";
import { HELP_ROWS } from "./content";

const DOTS = Array.from({ length: 72 }, (_, i) => `${((i % 12) * 0.04 + Math.floor(i / 12) * 0.06).toFixed(2)}s`);

export function HowWeHelp() {
  return (
    <section className="help" id="services">
      <div className="wrap">
        <p className="eyebrow reveal">How we help</p>
        <h2 className="display accent reveal-lines">
          <span className="line-mask">
            <span className="line">You’re raising</span>
          </span>
          <span className="line-mask">
            <span className="line">in a hard market.</span>
          </span>
        </h2>
        <p className="intro reveal">We’ve run this process many times. The problems usually sound something like this.</p>

        <div className="help-rows" id="helpRows">
          {HELP_ROWS.map((r) => (
            <div className="help-row" key={r.service}>
              <p className="serif quote">“{r.quote}”</p>
              <div className="help-answer">
                <p>{r.answer}</p>
                <span className="service">{r.service}</span>
              </div>
              <a href="#contact" className="sq-btn" aria-label={r.aria}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      </div>
      <div className="dots" aria-hidden="true">
        {DOTS.map((d, i) => (
          <i key={i} style={{ "--d": d } as CSSProperties} />
        ))}
      </div>
    </section>
  );
}
