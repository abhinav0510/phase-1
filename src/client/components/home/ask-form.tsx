"use client";

import { useRef, type FormEvent } from "react";
import { SITE } from "@/client/components/site/site-config";
import { ASK_CHIPS, ASK_MAIL_SUBJECT } from "./content";

function openMail(question: string) {
  const subject = encodeURIComponent(ASK_MAIL_SUBJECT);
  const body = encodeURIComponent(question ? `${question}\n\n` : "");
  window.location.href = `mailto:${SITE.contactEmail}?subject=${subject}&body=${body}`;
}

/** Single-line "Ask Sidana" form. Submitting opens a prefilled email; nothing is stored. */
export function AskForm({
  id,
  placeholder,
  light = false,
  inputRef,
}: {
  id: string;
  placeholder: string;
  light?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const local = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? local;
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    openMail((ref.current?.value || "").trim());
  };
  return (
    <form className={`ask-form${light ? " ask-form--light" : ""}`} onSubmit={onSubmit}>
      <label className="sr-only" htmlFor={id}>
        Your question
      </label>
      <input id={id} ref={ref} type="text" placeholder={placeholder} autoComplete="off" />
      <button type="submit" aria-label="Send">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>
    </form>
  );
}

/** The Ask Sidana card below the hero: suggested questions fill the box. */
export function AskSidana() {
  const input = useRef<HTMLInputElement>(null);
  const fill = (q: string) => {
    if (input.current) {
      input.current.value = q;
      input.current.focus();
    }
  };
  return (
    <section className="ask" id="ask">
      <div className="ask-card reveal">
        <p className="eyebrow">Ask Sidana</p>
        <div className="chips">
          {ASK_CHIPS.map((q) => (
            <button type="button" className="chip" key={q} onClick={() => fill(q)}>
              {q}
            </button>
          ))}
        </div>
        <AskForm id="askInput" placeholder="Ask us anything about your raise…" inputRef={input} />
        <p className="ask-note">Goes straight to the Sidana team — we reply within one working day.</p>
      </div>
    </section>
  );
}
