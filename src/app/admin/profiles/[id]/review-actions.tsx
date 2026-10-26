"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquareWarning } from "lucide-react";
import { reviewProfile } from "../actions";
import type { ProfileStatus } from "@/lib/types/db";

export function ReviewActions({ startupId, status }: { startupId: number; status: ProfileStatus }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: "approve" | "changes") {
    setMsg(null);
    startTransition(async () => {
      const r = await reviewProfile({ startupId, decision, note });
      if (r.ok) {
        setNote("");
        setMsg({
          ok: true,
          text: decision === "approve" ? "Approved." : "Sent back to the founder with your note.",
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <div className="space-y-3">
      {status === "draft" ? (
        <p className="text-xs text-navy-500">
          The founder hasn&apos;t submitted this yet. You can still approve it or leave a note.
        </p>
      ) : null}
      <label htmlFor="review-note" className="block text-xs font-semibold uppercase tracking-wide text-navy-400">
        Note to the founder (required when asking for changes)
      </label>
      <textarea
        id="review-note"
        rows={3}
        value={note}
        maxLength={1000}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Please add your ARR basis and the amount already committed."
        className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
      />
      {msg ? (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
        >
          {msg.text}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("approve")}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve
        </button>
        <button
          type="button"
          onClick={() => decide("changes")}
          disabled={pending || note.trim().length < 3}
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-50"
        >
          <MessageSquareWarning className="h-4 w-4" />
          Request changes
        </button>
      </div>
    </div>
  );
}
