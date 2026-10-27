"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FlaskConical, Search, Send, X } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/card";
import {
  cleanSubject,
  parseEmailList,
  renderBroadcast,
} from "@/lib/email/render";
import { sendBroadcast, sendTestEmail, type ComposeInput } from "./actions";

export interface ComposerStartup {
  id: number;
  name: string;
  emails: string[];
  founderName: string | null;
}

interface Planned {
  key: string;
  label: string;
  mergeStartupName: string | null;
  founderName: string | null;
  to: string[];
}

const SENDER = "Sidana Ventures <investors@sidanaventures.com>";

export function BroadcastComposer({
  startups,
  adminEmail,
}: {
  startups: ComposerStartup[];
  adminEmail: string | null;
}) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [extra, setExtra] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("Hi {{founder_name}},\n\n");
  const [previewIdx, setPreviewIdx] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const reachableCount = startups.filter((s) => s.emails.length).length;
  const parsedExtra = useMemo(() => parseEmailList(extra), [extra]);

  // Mirrors the server's planRecipients(); the server recomputes it on send.
  const planned = useMemo(() => {
    const chosen = mode === "all" ? startups : startups.filter((s) => selected.has(s.id));
    const list: Planned[] = [];
    const covered = new Set<string>();
    let skipped = 0;
    for (const s of chosen) {
      if (!s.emails.length) {
        skipped++;
        continue;
      }
      list.push({
        key: `s${s.id}`,
        label: s.name,
        mergeStartupName: s.name,
        founderName: s.founderName,
        to: s.emails,
      });
      s.emails.forEach((e) => covered.add(e));
    }
    for (const e of parsedExtra.valid) {
      if (covered.has(e)) continue;
      covered.add(e);
      list.push({ key: `e${e}`, label: e, mergeStartupName: null, founderName: null, to: [e] });
    }
    return { list, skipped };
  }, [mode, startups, selected, parsedExtra.valid]);

  const addressCount = planned.list.reduce((n, p) => n + p.to.length, 0);
  const current = planned.list[Math.min(previewIdx, Math.max(planned.list.length - 1, 0))];
  const rendered = renderBroadcast({
    subject: subject || "(no subject)",
    body,
    startupName: current?.mergeStartupName ?? null,
    founderName: current?.founderName ?? null,
  });

  const q = query.trim().toLowerCase();
  const visible = q ? startups.filter((s) => s.name.toLowerCase().includes(q)) : startups;

  const contentReady =
    !!cleanSubject(subject) && !!body.trim() && parsedExtra.invalid.length === 0;
  const canSend = contentReady && planned.list.length > 0 && !pending;

  const input = (): ComposeInput => ({
    mode,
    startupIds: Array.from(selected),
    extraEmails: extra,
    subject,
    body,
  });

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      visible.filter((s) => s.emails.length).forEach((s) => next.add(s.id));
      return next;
    });
  }

  function insertField(field: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + field);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + field + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + field.length, start + field.length);
    });
  }

  function onTest() {
    setNotice(null);
    startTransition(async () => {
      const r = await sendTestEmail(input());
      if (r.ok) {
        setNotice({ ok: true, text: `Test copy sent to ${adminEmail}. It should arrive within a minute.` });
        router.refresh();
      } else {
        setNotice({ ok: false, text: r.error });
      }
    });
  }

  function onConfirmSend() {
    setNotice(null);
    startTransition(async () => {
      const r = await sendBroadcast({ ...input(), confirmCount: planned.list.length });
      setConfirmOpen(false);
      setTyped("");
      if (r.ok) {
        router.push(`/admin/notifications/${r.broadcastId}`);
      } else {
        setNotice({ ok: false, text: r.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title="Email startups"
        subtitle={`Sent from ${SENDER} · one email per startup to every address on file`}
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* ------------------------------ Compose ------------------------------ */}
          <div className="space-y-5">
            <fieldset className="space-y-2">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Recipients
              </legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-navy-800">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "all"}
                  onChange={() => setMode("all")}
                />
                All platform startups{" "}
                <span className="text-navy-400">({reachableCount} with an email on file)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-navy-800">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "selected"}
                  onChange={() => setMode("selected")}
                />
                Choose startups
                {mode === "selected" ? (
                  <span className="text-navy-400">({selected.size} selected)</span>
                ) : null}
              </label>

              {mode === "selected" ? (
                <div className="rounded-lg border border-navy-100">
                  <div className="flex items-center gap-2 border-b border-navy-100 px-3 py-2">
                    <Search className="h-4 w-4 text-navy-400" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search startups…"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={selectVisible}
                      className="whitespace-nowrap text-xs font-medium text-navy-600 hover:underline"
                    >
                      Select shown
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="whitespace-nowrap text-xs font-medium text-navy-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="scroll-thin max-h-64 divide-y divide-navy-50 overflow-y-auto">
                    {visible.map((s) => {
                      const has = s.emails.length > 0;
                      return (
                        <li key={s.id}>
                          <label
                            className={`flex items-center gap-3 px-3 py-2 text-sm ${
                              has ? "cursor-pointer hover:bg-navy-50/60" : "cursor-not-allowed opacity-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!has}
                              checked={selected.has(s.id)}
                              onChange={() => toggle(s.id)}
                            />
                            <span className="font-medium text-navy-800">{s.name}</span>
                            <span className="ml-auto truncate text-xs text-navy-400">
                              {has ? `${s.emails.length} email${s.emails.length === 1 ? "" : "s"}` : "no email on file"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                    {!visible.length ? (
                      <li className="px-3 py-4 text-center text-sm text-navy-400">No startups match.</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </fieldset>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400">
                Also send to <span className="font-normal normal-case">(optional, comma-separated)</span>
              </label>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                rows={2}
                placeholder="founder@startup.com, another@company.com"
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
              {parsedExtra.invalid.length ? (
                <p className="mt-1 text-xs text-red-600">
                  Not valid: {parsedExtra.invalid.join(", ")}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 200))}
                placeholder="e.g. Platform update: your new founder dashboard"
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Message
                </label>
                <div className="flex gap-2">
                  {["{{founder_name}}", "{{startup_name}}"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => insertField(f)}
                      className="rounded border border-navy-200 px-2 py-0.5 font-mono text-[11px] text-navy-600 hover:bg-navy-50"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 20000))}
                rows={12}
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-navy-500"
              />
              <p className="mt-1 text-xs text-navy-400">
                Plain text. Blank lines start a new paragraph; links become clickable. The
                Sidana signature is added automatically.
              </p>
            </div>

            <div className="rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy-700">
              <strong>{planned.list.length}</strong> email{planned.list.length === 1 ? "" : "s"} to{" "}
              <strong>{addressCount}</strong> address{addressCount === 1 ? "" : "es"}
              {planned.skipped ? (
                <span className="text-navy-500">
                  {" "}· {planned.skipped} startup{planned.skipped === 1 ? "" : "s"} skipped (no email on file)
                </span>
              ) : null}
            </div>

            {notice ? (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  notice.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {notice.text}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onTest}
                disabled={!contentReady || pending || !adminEmail}
                className="inline-flex items-center gap-2 rounded-lg border border-navy-200 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
              >
                <FlaskConical className="h-4 w-4" />
                Send test to me
              </button>
              <button
                type="button"
                onClick={() => {
                  setTyped("");
                  setConfirmOpen(true);
                }}
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send to {planned.list.length} recipient{planned.list.length === 1 ? "" : "s"}…
              </button>
            </div>
            {adminEmail ? (
              <p className="text-xs text-navy-400">
                The test goes only to {adminEmail}, personalised as the first recipient.
              </p>
            ) : null}
          </div>

          {/* ------------------------------ Preview ------------------------------ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Preview</p>
              {planned.list.length > 1 ? (
                <select
                  value={Math.min(previewIdx, planned.list.length - 1)}
                  onChange={(e) => setPreviewIdx(Number(e.target.value))}
                  className="max-w-[60%] rounded-lg border border-navy-200 px-2 py-1 text-xs"
                >
                  {planned.list.slice(0, 300).map((p, i) => (
                    <option key={p.key} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-lg border border-navy-100">
              <div className="space-y-1 border-b border-navy-100 bg-navy-50/60 px-4 py-3 text-xs text-navy-600">
                <p>
                  <span className="text-navy-400">From:</span> {SENDER}
                </p>
                <p className="truncate">
                  <span className="text-navy-400">To:</span>{" "}
                  {current ? current.to.join(", ") : "—"}
                </p>
                <p className="truncate">
                  <span className="text-navy-400">Subject:</span>{" "}
                  <span className="font-semibold text-navy-800">{rendered.subject}</span>
                </p>
              </div>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={rendered.html}
                className="h-[460px] w-full bg-white"
              />
            </div>
          </div>
        </div>
      </CardBody>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 text-navy-900">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-semibold">Send this email?</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="text-navy-400 hover:text-navy-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-navy-600">
              <strong>{planned.list.length}</strong> email{planned.list.length === 1 ? "" : "s"} will
              go to <strong>{addressCount}</strong> address{addressCount === 1 ? "" : "es"} from{" "}
              {SENDER}. Sent emails can&apos;t be recalled.
            </p>
            <p className="mt-3 truncate text-sm text-navy-800">
              <span className="text-navy-400">Subject:</span> {cleanSubject(subject)}
            </p>
            <label className="mt-4 block text-sm text-navy-700">
              Type <strong>{planned.list.length}</strong> to confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmSend}
                disabled={typed.trim() !== String(planned.list.length) || pending}
                className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {pending ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
