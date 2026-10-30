import Link from "next/link";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import type { ProfileStatus } from "@/lib/types/db";
import { ProgressBar } from "@/components/founder/motion";

/**
 * Dashboard call-to-action asking the founder to complete their profile for
 * better matchmaking. Hidden once the profile is complete and approved.
 */
export function ProfileNudge({
  pct,
  missing,
  status,
  reviewNote,
}: {
  pct: number;
  missing: { label: string; matching: boolean }[];
  status: ProfileStatus | null;
  reviewNote: string | null;
}) {
  if (status === "submitted" && pct >= 100) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
        <Clock className="h-4 w-4 shrink-0" />
        Your profile is with the Sidana team for review. We&apos;ll use it to sharpen your investor matches.
      </div>
    );
  }
  if (pct >= 100 && status !== "changes_requested") return null;

  const shown = missing.slice(0, 4);
  const more = missing.length - shown.length;
  const matchingGaps = missing.filter((m) => m.matching).length;

  return (
    <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-ocean-100 via-ocean-50 to-leaf-100 text-tide ring-1 ring-ocean-200/60">
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/60 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="min-w-0 max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ocean-700">
            <Sparkles className="h-3.5 w-3.5" />
            {status === "changes_requested" ? "Changes requested" : "Complete your profile for the best matches"}
          </p>
          <h3 className="mt-1.5 text-lg font-semibold">
            {status === "changes_requested"
              ? "The Sidana team asked for a few updates"
              : `Your profile is ${pct}% complete`}
          </h3>
          <p className="mt-1 text-sm text-tide/70">
            {status === "changes_requested" && reviewNote
              ? `“${reviewNote}”`
              : matchingGaps > 0
                ? `${matchingGaps} detail${matchingGaps === 1 ? "" : "s"} our match engine relies on ${matchingGaps === 1 ? "is" : "are"} missing. Filling them helps us reach investors whose thesis fits you.`
                : "A complete profile gives investors the full picture and strengthens every introduction."}
          </p>
          {shown.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {shown.map((m) => (
                <li key={m.label} className="rounded-full bg-white/80 px-2.5 py-1 text-xs text-tide">
                  {m.label}
                </li>
              ))}
              {more > 0 ? <li className="rounded-full px-1 py-1 text-xs text-tide/55">+{more} more</li> : null}
            </ul>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
          <div className="flex w-48 items-center gap-2">
            <ProgressBar
              pct={pct}
              className="h-2 flex-1 overflow-hidden rounded-full bg-white/70"
              barClassName="h-full rounded-full bg-gradient-to-r from-ocean-500 to-leaf-500"
            />
            <span className="text-xs tabular-nums text-tide/70">{pct}%</span>
          </div>
          <Link
            href="/complete-profile"
            className="inline-flex items-center gap-2 rounded-full bg-ocean-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-ocean-600/30 transition hover:bg-ocean-700 active:scale-[0.98]"
          >
            {status === "changes_requested" ? "Update profile" : "Complete profile"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
