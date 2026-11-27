"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarPlus, Heart, Loader2, MessageSquare, Video, X } from "lucide-react";
import { buttonClass, inputClass } from "@/client/components/founder/ui";
import { cn } from "@/shared/lib/utils";
import { scheduleMeeting, setInterest } from "./actions";
import { allSlots, istToday, slotsFor } from "@/shared/lib/meeting-rules";
import { PassButton, type PassTarget } from "../../pass-dialog";

/**
 * The profile's action bar: I'm interested (2.5), Schedule a meet (2.7)
 * and Chat with founder (2.8). The chat button only renders when the server
 * says the pair may chat.
 */
export function ProfileActions({
  startupId,
  startupName,
  interested,
  upcoming,
  canChat,
  passTarget,
  passed,
}: {
  passTarget: PassTarget;
  passed: boolean;
  startupId: number;
  startupName: string;
  interested: boolean;
  upcoming: { when: string; link: string | null } | null;
  canChat: boolean;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const toggleInterest = () =>
    start(async () => {
      const res = await setInterest(startupId, !interested);
      setNotice(res.ok ? null : { tone: "err", text: res.error });
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={toggleInterest} disabled={pending} className={buttonClass(interested ? "ghost" : "primary")}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className={cn("h-4 w-4", interested && "fill-ocean-600 text-ocean-600")} />}
          {interested ? "Interested" : "I'm interested"}
        </button>

        {upcoming ? (
          upcoming.link ? (
            <a href={upcoming.link} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
              <Video className="h-4 w-4" /> {upcoming.when} · Join
            </a>
          ) : (
            <span className={buttonClass("ghost")}>
              <Video className="h-4 w-4" /> {upcoming.when}
            </span>
          )
        ) : (
          <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost")}>
            <CalendarPlus className="h-4 w-4" /> Schedule a meet
          </button>
        )}

        {canChat ? (
          <Link href={`/investor/chats/${startupId}`} className={buttonClass("ghost")}>
            <MessageSquare className="h-4 w-4" /> Chat with founder
          </Link>
        ) : null}

        {passed ? (
          <span className="rounded-full bg-navy-50 px-3 py-2 text-xs font-semibold text-navy-600">You passed · marking interest undoes it</span>
        ) : (
          <PassButton target={passTarget} size="md" />
        )}
      </div>

      {notice ? (
        <p role="status" className={cn("rounded-xl px-3 py-2 text-sm", notice.tone === "ok" ? "bg-leaf-50 text-leaf-700" : "bg-red-50 text-red-700")}>
          {notice.text}
        </p>
      ) : null}

      {open ? (
        <ScheduleDialog
          startupId={startupId}
          startupName={startupName}
          onClose={() => setOpen(false)}
          onDone={(text) => {
            setOpen(false);
            setNotice({ tone: "ok", text });
          }}
        />
      ) : null}
    </div>
  );
}

function ScheduleDialog({
  startupId,
  startupName,
  onClose,
  onDone,
}: {
  startupId: number;
  startupName: string;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Meetings must start at least 2 hours after booking (MIN_LEAD_MINUTES): on today's
  // date, earlier times aren't offered. The server checks the same rule.
  const today = istToday(Date.now());
  const times = date ? slotsFor(date, Date.now()) : allSlots();
  const chosen = times.includes(time) ? time : (times[0] ?? "");
  const pickDate = (d: string) => {
    setDate(d);
    const open = d ? slotsFor(d, Date.now()) : allSlots();
    if (!open.includes(time)) setTime(open[0] ?? "");
  };

  const submit = () =>
    start(async () => {
      setError(null);
      const res = await scheduleMeeting(startupId, date, chosen);
      if (res.ok) onDone(res.message ?? "Booked.");
      else setError(res.error);
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-tide/40 p-4 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="schedule-title" className="w-full max-w-md rounded-[20px] bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="schedule-title" className="text-lg font-semibold text-tide">
              Schedule a meet
            </h2>
            <p className="mt-0.5 text-sm text-navy-500">
              30 minutes with {startupName}. Times are in IST, at least 2 hours from now.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-navy-500 hover:bg-navy-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-medium text-navy-600">
            Date
            <input type="date" value={date} min={today} onChange={(e) => pickDate(e.target.value)} className={cn(inputClass, "mt-1")} />
          </label>
          <label className="text-xs font-medium text-navy-600">
            Time (IST)
            <select value={chosen} onChange={(e) => setTime(e.target.value)} disabled={!times.length} className={cn(inputClass, "mt-1")}>
              {times.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        {date && !times.length ? (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">No times left on this day. Pick a later date.</p>
        ) : null}
        {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={buttonClass("ghost", "sm")}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={pending || !date || !chosen} className={buttonClass("primary", "sm")}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
            Book meeting
          </button>
        </div>
      </div>
    </div>
  );
}
