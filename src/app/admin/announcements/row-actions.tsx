"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAnnouncement, setAnnouncementActive } from "./actions";

export function AnnouncementRowActions({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && r.error) alert(r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-3 text-xs font-medium">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setAnnouncementActive(id, !active))}
        className="text-navy-600 hover:underline disabled:opacity-50"
      >
        {active ? "Deactivate" : "Activate"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this announcement permanently?")) run(() => deleteAnnouncement(id));
        }}
        className="text-red-600 hover:underline disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
