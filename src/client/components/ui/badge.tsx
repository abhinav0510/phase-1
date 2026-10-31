import { cn } from "@/shared/lib/utils";

type Tone = "gray" | "green" | "amber" | "red" | "blue" | "violet";

const TONES: Record<Tone, string> = {
  gray: "bg-navy-100 text-navy-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700",
};

export function Badge({
  children,
  tone = "gray",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STARTUP_STATUS_TONE: Record<string, Tone> = {
  live: "blue",
  a1_ready: "violet",
  a2_waiting: "amber",
  term_sheet: "green",
  closed: "green",
  silent: "gray",
  blocked: "red",
  mandate_closed: "gray",
};

const INVESTOR_STATUS_TONE: Record<string, Tone> = {
  active: "green",
  engaged: "blue",
  pending: "amber",
  paused: "gray",
  passed_all: "gray",
  do_not_contact: "red",
};

const MATCH_STATE_TONE: Record<string, Tone> = {
  queued: "amber",
  sent: "blue",
  paused: "gray",
  tracker_only: "violet",
  not_queued: "gray",
};

const BUCKET_TONE: Record<string, Tone> = {
  HOT10: "red",
  A: "green",
  B: "blue",
  C: "gray",
  UNASSIGNED: "gray",
};

function label(v: string) {
  return v.replace(/_/g, " ");
}

export function StatusBadge({
  value,
  kind,
}: {
  value: string | null | undefined;
  kind: "startup" | "investor" | "match" | "bucket";
}) {
  if (!value) return <Badge tone="gray">—</Badge>;
  const map =
    kind === "startup"
      ? STARTUP_STATUS_TONE
      : kind === "investor"
        ? INVESTOR_STATUS_TONE
        : kind === "match"
          ? MATCH_STATE_TONE
          : BUCKET_TONE;
  return <Badge tone={map[value] ?? "gray"}>{label(value)}</Badge>;
}
