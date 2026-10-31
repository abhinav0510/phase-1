"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
const v = (o: Record<string, string | number>) => o as Vars;

/* ---------- shared icon glyphs (inline so no icon library is needed) ---------- */
const Icon = {
  trend: (
    <svg viewBox="0 0 24 24">
      <path d="M4 17l5-6 4 4 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  ),
  sprout: (
    <svg viewBox="0 0 24 24">
      <path d="M12 21v-8" />
      <path d="M12 13c0-4-3-7-7-7 0 4 3 7 7 7z" />
      <path d="M12 13c0-4 3-7 7-7 0 4-3 7-7 7z" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M15 15c3 0 5 1.5 5 4" />
    </svg>
  ),
  bank: (
    <svg viewBox="0 0 24 24">
      <path d="M3 10l9-6 9 6" />
      <path d="M5 10v9M10 10v9M14 10v9M19 10v9" />
      <path d="M3 20h18" />
    </svg>
  ),
  wing: (
    <svg viewBox="0 0 24 24">
      <path d="M21 6c-5 0-9 2-12 6-2 3-3 6-3 8 3 0 6-1 9-3 4-3 6-7 6-11z" />
      <path d="M6 20c3-4 7-7 12-9" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24">
      <path d="M21 3 10 14" />
      <path d="M21 3l-7 18-4-7-7-4z" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 5-5" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h6" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24">
      <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </svg>
  ),
  bars: (
    <svg viewBox="0 0 24 24">
      <path d="M5 20V13M12 20V7M19 20v-4" />
    </svg>
  ),
  pie: (
    <svg viewBox="0 0 24 24">
      <path d="M12 3a9 9 0 1 0 9 9h-9z" />
      <path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
    </svg>
  ),
  up: (
    <svg viewBox="0 0 24 24">
      <path d="M6 18 18 6M9 6h9v9" />
    </svg>
  ),
};

/** Perspective tilt that follows the cursor over a mandate visual. */
export function Tilt({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const set = (rx: string, ry: string) => {
    const ui = wrap.current?.querySelector<HTMLElement>(".ui");
    ui?.style.setProperty("--rx", rx);
    ui?.style.setProperty("--ry", ry);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    set(`${-py * 8}deg`, `${px * 10}deg`);
  };
  return (
    <div className="mandate-visual tilt" ref={wrap} onPointerMove={onMove} onPointerLeave={() => set("0deg", "0deg")}>
      {children}
    </div>
  );
}

/* ---------- 1. Investor pipeline ---------- */
const PIPELINE = [
  { icon: Icon.sprout, tone: "ico-blue", name: "Seed fund", city: "Bengaluru", st: "meet" },
  { icon: Icon.people, tone: "ico-violet", name: "Family office", city: "Mumbai", st: "sent" },
  { icon: Icon.bank, tone: "ico-green", name: "Institutional VC", city: "Delhi", st: "meet" },
  { icon: Icon.wing, tone: "ico-red", name: "Angel network", city: "Pune", st: "pass" },
  { icon: Icon.globe, tone: "ico-blue", name: "Micro VC", city: "Singapore", st: "sent" },
] as const;
const STATUS = {
  meet: { cls: "st-meet", icon: Icon.calendar, label: "Meeting" },
  sent: { cls: "st-sent", icon: Icon.send, label: "Sent" },
  pass: { cls: "st-pass", icon: Icon.check, label: "Passed" },
} as const;

export function PipelineCard() {
  return (
    <div className="ui ui-pipeline">
      <div className="ui-title">
        <span className="ui-ico ico-blue">{Icon.trend}</span>
        <div>
          <b>Investor pipeline</b>
          <small>Track and manage your investor outreach</small>
        </div>
        <span className="ui-live">
          <i />
          Live
        </span>
      </div>
      {PIPELINE.map((r) => {
        const s = STATUS[r.st];
        return (
          <div className="ui-row" key={r.name}>
            <span className={`ui-ico ${r.tone}`}>{r.icon}</span>
            <span className="ui-name">
              <b>{r.name}</b>
              <small>{r.city}</small>
            </span>
            <span className={`ui-st ${s.cls}`}>
              {s.icon}
              {s.label}
            </span>
            <span className="ui-chev" />
          </div>
        );
      })}
      <div className="ui-stats">
        <div>
          <span className="ui-ico ico-blue">{Icon.calendar}</span>
          <span>
            <b>25</b>
            <small>Meetings</small>
          </span>
        </div>
        <div>
          <span className="ui-ico ico-green">{Icon.people}</span>
          <span>
            <b>62</b>
            <small>Reached</small>
          </span>
        </div>
        <div>
          <span className="ui-ico ico-violet">{Icon.check}</span>
          <span>
            <b>4</b>
            <small>Passes</small>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 2. Investor meetings ---------- */
export function MeetingsCard() {
  return (
    <div className="ui ui-cal">
      <div className="ui-title">
        <span className="ui-ico ico-blue">{Icon.calendar}</span>
        <div>
          <b>Investor meetings</b>
          <small>This week · 4 meetings booked</small>
        </div>
        <span className="ui-live">
          <i />4 booked
        </span>
      </div>
      <div className="cal-grid">
        <div className="cal-day">
          <b>Mon</b>
          <small>Oct 20</small>
        </div>
        <div className="cal-day">
          <b>Tue</b>
          <small>Oct 21</small>
          <div className="cal-ev ev-gold" style={v({ "--t": 0.12 })}>
            <time>11:00 AM</time>
            <b>Seed fund</b>
            <span>
              {Icon.sprout}Bengaluru
            </span>
          </div>
        </div>
        <div className="cal-day">
          <b>Wed</b>
          <small>Oct 22</small>
          <div className="cal-ev ev-blue" style={v({ "--t": 0.5 })}>
            <time>3:00 PM</time>
            <b>Family office</b>
            <span>
              {Icon.people}Mumbai
            </span>
          </div>
        </div>
        <div className="cal-day">
          <b>Thu</b>
          <small>Oct 23</small>
          <div className="cal-ev ev-green" style={v({ "--t": 0 })}>
            <time>10:30 AM</time>
            <b>Institutional VC</b>
            <span>
              {Icon.bank}Delhi
            </span>
          </div>
          <div className="cal-ev ev-red" style={v({ "--t": 0.62 })}>
            <time>4:00 PM</time>
            <b>Angel network</b>
            <span>
              {Icon.wing}Pune
            </span>
          </div>
        </div>
        <div className="cal-day">
          <b>Fri</b>
          <small>Oct 24</small>
          <span className="cal-add" aria-hidden="true">
            +
          </span>
        </div>
      </div>
      <div className="ui-stats cal-foot">
        <div>
          <span className="ui-ico ico-violet">{Icon.doc}</span>
          <span>
            <b>Prep notes sent</b>
            <small>For all upcoming meetings</small>
          </span>
        </div>
        <div>
          <span className="ui-ico ico-blue">{Icon.bolt}</span>
          <span>
            <b>Debrief in 24h</b>
            <small>Notes and next steps</small>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3. Investment memo ---------- */
const KPIS = [
  { tone: "kpi-gold", ico: "ico-gold", icon: Icon.bars, value: "3.4×", label: "YoY revenue", delta: "+42%", note: "vs last year",
    fill: "M0 30 C 40 10, 70 40, 110 22 S 170 10, 200 24 V40 H0 Z", line: "M0 30 C 40 10, 70 40, 110 22 S 170 10, 200 24" },
  { tone: "kpi-blue", ico: "ico-blue", icon: Icon.pie, value: "61%", label: "gross margin", delta: "+8%", note: "vs industry",
    fill: "M0 26 C 40 36, 70 8, 110 20 S 170 34, 200 18 V40 H0 Z", line: "M0 26 C 40 36, 70 8, 110 20 S 170 34, 200 18" },
  { tone: "kpi-violet", ico: "ico-violet", icon: Icon.people, value: "14", label: "enterprise clients", delta: "+40%", note: "in 12 months",
    fill: "M0 24 C 40 14, 70 34, 110 26 S 170 12, 200 28 V40 H0 Z", line: "M0 24 C 40 14, 70 34, 110 26 S 170 12, 200 28" },
];

export function MemoCard() {
  return (
    <div className="ui ui-memo">
      <div className="ui-title">
        <span className="ui-ico ico-gold">{Icon.doc}</span>
        <div>
          <small className="memo-eyebrow">Investment memo</small>
          <b>Market opportunity</b>
        </div>
        <span className="memo-pill">
          v3 · Approved<i />
        </span>
      </div>
      <p className="memo-sum">Large and growing market with strong tailwinds across key segments.</p>
      <div className="ui-lines">
        <i />
        <i style={{ width: "80%" }} />
        <i style={{ width: "62%" }} />
      </div>
      <div className="memo-sub">
        <span>Key investment highlights</span>
        <small>Based on latest analysis</small>
      </div>
      <div className="memo-kpi">
        {KPIS.map((k) => (
          <div className={`kpi ${k.tone}`} key={k.label}>
            <span className={`ui-ico ${k.ico}`}>{k.icon}</span>
            <div>
              <b>{k.value}</b>
              <span>{k.label}</span>
              <em>
                {Icon.up}
                {k.delta} <u>{k.note}</u>
              </em>
            </div>
            <svg className="kpi-wave" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
              <path d={k.fill} />
              <path className="kpi-wave-line" d={k.line} />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
