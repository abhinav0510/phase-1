"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROFILE_FIELDS,
  SECTIONS,
  isFilled,
  type Answers,
  type ProfileField,
  type SectionKey,
} from "@/lib/profile/fields";
import { saveProfile } from "./actions";

const inputCls =
  "w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none transition placeholder:text-navy-300 focus:border-navy-500 focus:ring-2 focus:ring-navy-100";

export function ProfileForm({
  initial,
  record,
  canSubmit,
}: {
  initial: Answers;
  /** Value on record per field key (null when nothing is on file). */
  record: Record<string, string | null>;
  /** False while a submission is already with the team and unchanged. */
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Answers>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const progress = useMemo(() => {
    const by = Object.fromEntries(SECTIONS.map((s) => [s.key, { done: 0, total: 0 }])) as Record<
      SectionKey,
      { done: number; total: number }
    >;
    let done = 0;
    for (const f of PROFILE_FIELDS) {
      by[f.section].total++;
      if (isFilled(values[f.key]) || isFilled(record[f.key])) {
        done++;
        by[f.section].done++;
      }
    }
    return { done, total: PROFILE_FIELDS.length, pct: Math.round((done / PROFILE_FIELDS.length) * 100), by };
  }, [values, record]);

  function set(key: string, v: string | string[]) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setDirty(true);
    setMsg(null);
  }

  function save(submit: boolean) {
    setMsg(null);
    startTransition(async () => {
      const r = await saveProfile(values, submit);
      if (r.ok) {
        setDirty(false);
        setMsg({
          ok: true,
          text: submit
            ? "Sent to the Sidana team. We'll review it and use it for your investor matching."
            : "Draft saved. You can come back and finish any time.",
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Section jump list with per-section progress */}
      <nav aria-label="Profile sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => {
          const p = progress.by[s.key];
          const complete = p.done === p.total;
          return (
            <a
              key={s.key}
              href={`#section-${s.key}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-navy-200 bg-white text-navy-700 hover:border-navy-400",
              )}
            >
              {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
              {s.title}
              <span className="tabular-nums text-navy-400">
                {p.done}/{p.total}
              </span>
            </a>
          );
        })}
      </nav>

      {SECTIONS.map((s) => (
        <section
          key={s.key}
          id={`section-${s.key}`}
          className="scroll-mt-24 rounded-xl border border-navy-100 bg-white shadow-card"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-navy-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-navy-900">{s.title}</h3>
              <p className="mt-0.5 text-xs text-navy-500">{s.blurb}</p>
            </div>
            <span className="text-xs tabular-nums text-navy-400">
              {progress.by[s.key].done} of {progress.by[s.key].total} complete
            </span>
          </header>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 px-5 py-5 md:grid-cols-2">
            {PROFILE_FIELDS.filter((f) => f.section === s.key).map((f) => (
              <Field
                key={f.key}
                field={f}
                value={values[f.key]}
                record={record[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-navy-100 bg-white/95 backdrop-blur md:left-60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-navy-100 sm:w-40">
              <div
                className="h-full rounded-full bg-[#B8893E] transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-navy-700">
              {progress.pct}% complete
            </span>
            {msg ? (
              <span
                role="status"
                className={cn("sr-only text-xs lg:not-sr-only lg:inline", msg.ok ? "text-emerald-700" : "text-red-600")}
              >
                {msg.text}
              </span>
            ) : dirty ? (
              <span className="hidden text-xs text-navy-400 lg:inline">Unsaved changes</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => save(false)}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm font-medium text-navy-700 transition hover:border-navy-400 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save draft
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={pending || (!canSubmit && !dirty)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {pending ? "Saving…" : "Submit for review"}
            </button>
          </div>
        </div>
        {msg ? (
          // Visual copy for small screens; the role="status" span above is announced once.
          <p
            aria-hidden="true"
            className={cn("px-4 pb-3 text-xs lg:hidden", msg.ok ? "text-emerald-700" : "text-red-600")}
          >
            {msg.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  field: f,
  value,
  record,
  onChange,
}: {
  field: ProfileField;
  value: string | string[] | undefined;
  record: string | null;
  onChange: (v: string | string[]) => void;
}) {
  const id = `pf-${f.key}`;
  const wide = f.type === "textarea" || f.type === "multi";
  const str = Array.isArray(value) ? "" : (value ?? "");
  const showRecord =
    record && (f.type === "select" ? !(f.options ?? []).includes(record) || str !== record : str !== record);

  return (
    <div className={cn(wide && "md:col-span-2")}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium text-navy-800">
          {f.label}
        </label>
        {f.matching ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fbf3e3] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a6f2a]">
            <Sparkles className="h-3 w-3" />
            Used for matching
          </span>
        ) : null}
      </div>

      {f.type === "textarea" ? (
        <textarea
          id={id}
          rows={3}
          value={str}
          placeholder={f.placeholder}
          maxLength={2000}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      ) : f.type === "select" ? (
        <select id={id} value={str} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          <option value="">Select…</option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : f.type === "multi" ? (
        <div id={id} role="group" aria-label={f.label} className="flex flex-wrap gap-2">
          {(f.options ?? []).map((o) => {
            const list = Array.isArray(value) ? value : [];
            const on = list.includes(o);
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  on
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-navy-200 bg-white text-navy-700 hover:border-navy-400",
                )}
              >
                {o}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          id={id}
          type={f.type === "number" ? "text" : f.type}
          inputMode={f.type === "number" ? "decimal" : undefined}
          value={str}
          placeholder={f.placeholder}
          maxLength={f.type === "url" ? 300 : 200}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}

      {showRecord ? (
        <p className="mt-1 text-xs text-navy-400">
          On record with Sidana: <span className="text-navy-600">{record}</span>
        </p>
      ) : null}
      {f.help ? <p className="mt-1 text-xs text-navy-400">{f.help}</p> : null}
    </div>
  );
}
