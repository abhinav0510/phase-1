import type { CSSProperties } from "react";
import { DESK, NETWORK_SIZE } from "./content";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const v = (o: Record<string, string | number>) => o as Vars;

function More({ text, label }: { text: string; label: string }) {
  return (
    <div className="dreveal">
      <div>
        <p>{text}</p>
        <span className="arrow-link">
          {label} <span aria-hidden="true">→</span>
        </span>
      </div>
    </div>
  );
}

const RADAR_BLIPS: Array<[string, string, string]> = [
  ["62%", "30%", ".2s"],
  ["40%", "52%", "1.1s"],
  ["74%", "58%", "1.9s"],
  ["52%", "22%", "2.6s"],
  ["30%", "34%", "3.2s"],
  ["66%", "76%", ".7s"],
  ["48%", "70%", "2.2s"],
];
const MEMO_LINES: Array<[string, string]> = [
  ["88%", "0s"],
  ["70%", ".5s"],
  ["80%", "1s"],
  ["56%", "1.5s"],
  ["74%", "2s"],
];

export function DealDesk() {
  return (
    <section className="desk" id="desk">
      <div className="wrap center">
        <p className="eyebrow reveal">From the deal desk</p>
        <h2 className="display reveal-lines">
          <span className="line-mask">
            <span className="line">What we’re seeing</span>
          </span>
          <span className="line-mask">
            <span className="line">right now.</span>
          </span>
        </h2>
        <a href="#contact" className="btn btn-navy reveal">
          Read the desk notes <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="wrap desk-grid">
        {/* 1. Note — a process track */}
        <article className="dcard dcard-note reveal" tabIndex={0}>
          <div className="dart da-steps" aria-hidden="true">
            <span className="track" />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <b className="runner" />
          </div>
          <p className="dtag">Note</p>
          <h3 className="serif">“{DESK.noteOne.quote}”</h3>
          <More text={DESK.noteOne.more} label="Read" />
        </article>

        {/* 2. Thinking — the Saturday report */}
        <article className="dcard dcard-article reveal" tabIndex={0}>
          <div className="dmedia dm-a" aria-hidden="true">
            <div className="da-report">
              <span className="cal">
                <b>Sat</b>
                <i>weekly report</i>
              </span>
              <div className="bars">
                {["74%", "46%", "26%", "60%"].map((h) => (
                  <i key={h} style={v({ "--h": h })} />
                ))}
              </div>
              <div className="lbls">
                <span>Reach</span>
                <span>Meetings</span>
                <span>Passes</span>
                <span>Feedback</span>
              </div>
            </div>
          </div>
          <p className="dtag">Thinking</p>
          <h3>{DESK.report.title}</h3>
          <More text={DESK.report.more} label="Read" />
        </article>

        {/* 3. Network — radar */}
        <article className="dcard dcard-stat reveal" tabIndex={0}>
          <div className="dart da-radar" aria-hidden="true">
            <span className="ring r1" />
            <span className="ring r2" />
            <span className="ring r3" />
            <span className="beam" />
            {RADAR_BLIPS.map(([x, y, d]) => (
              <i key={`${x}-${y}`} style={v({ "--x": x, "--y": y, "--d": d })} />
            ))}
          </div>
          <p className="dtag">Network</p>
          <p className="dnum" data-count={NETWORK_SIZE}>
            0
          </p>
          <h3>{DESK.network.title}</h3>
          <More text={DESK.network.more} label="How matching works" />
        </article>

        {/* 4. Thinking — reading a pass */}
        <article className="dcard dcard-article reveal" tabIndex={0}>
          <div className="dmedia dm-b" aria-hidden="true">
            <div className="da-letter">
              <span className="from">
                <i />
                <em />
              </span>
              <span className="l" />
              <span className="l hl" />
              <span className="l short" />
              <span className="l" />
              <b className="stamp">Pass</b>
            </div>
          </div>
          <p className="dtag">Thinking</p>
          <h3>{DESK.pass.title}</h3>
          <More text={DESK.pass.more} label="Read" />
        </article>

        {/* 5. Note — the memo */}
        <article className="dcard dcard-note reveal" tabIndex={0}>
          <div className="dart da-memo" aria-hidden="true">
            <div className="page">
              <span className="h" />
              {MEMO_LINES.map(([w, d]) => (
                <i key={w} style={v({ "--w": w, "--d": d })} />
              ))}
              <b className="q">?</b>
              <b className="ok">✓</b>
            </div>
          </div>
          <p className="dtag">Note</p>
          <h3 className="serif">“{DESK.memo.quote}”</h3>
          <More text={DESK.memo.more} label="Read" />
        </article>

        {/* 6. Event — office hours */}
        <article className="dcard dcard-event reveal" tabIndex={0}>
          <div className="dart da-event" aria-hidden="true">
            <span className="ping" />
            <span className="ping p2" />
            <div className="tile">
              <b>Thu</b>
              <span>14</span>
              <i>Fortnightly</i>
            </div>
            <div className="clock">
              <i className="hour" />
              <i className="min" />
              <u />
            </div>
          </div>
          <p className="dtag">Event</p>
          <h3>{DESK.event.title}</h3>
          <More text={DESK.event.more} label="Book a slot" />
        </article>
      </div>
    </section>
  );
}
