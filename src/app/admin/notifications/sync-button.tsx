"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncContactsNow } from "./actions";

export function SyncContactsButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const r = await syncContactsNow();
      if (r.ok) {
        setMsg({
          ok: true,
          text: `Synced: ${r.matched} startups, ${r.emails} emails (${r.rowsRead} sheet rows read).`,
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.error });
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Syncing from Founders Info…" : "Sync now"}
      </button>
      {msg ? (
        <p className={`text-xs ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      ) : null}
    </div>
  );
}
