"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { createAnnouncement } from "./actions";
import { AUDIENCE_META, KIND_META } from "@/components/announcements/kinds";
import type { AnnouncementAudience, AnnouncementKind } from "@/lib/types/db";

export function AnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<AnnouncementKind>("update");
  const [audience, setAudience] = useState<AnnouncementAudience>("all");
  const [expiresOn, setExpiresOn] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const r = await createAnnouncement({ title, body, kind, audience, expiresOn });
      if (r.ok) {
        setTitle("");
        setBody("");
        setExpiresOn("");
        setMsg({ ok: true, text: "Published. It pops up the next time each user opens their dashboard." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  const field =
    "w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500";
  const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-400";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={label}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder="e.g. New: weekly reports on your dashboard"
          className={field}
        />
      </div>
      <div>
        <label className={label}>Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 4000))}
          rows={5}
          placeholder="What changed, and what (if anything) users should do."
          className={field}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Type</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as AnnouncementKind)} className={field}>
            {(Object.keys(KIND_META) as AnnouncementKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Show to</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
            className={field}
          >
            {(Object.keys(AUDIENCE_META) as AnnouncementAudience[]).map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_META[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Hide after (optional)</label>
          <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} className={field} />
        </div>
      </div>
      {msg ? (
        <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || title.trim().length < 3 || body.trim().length < 3}
        className="inline-flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        <Megaphone className="h-4 w-4" />
        {pending ? "Publishing…" : "Publish announcement"}
      </button>
    </form>
  );
}
