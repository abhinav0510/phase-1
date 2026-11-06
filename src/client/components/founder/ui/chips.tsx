import { cn } from "@/shared/lib/utils";

export type ChipTone = "neutral" | "ocean" | "green" | "amber" | "red" | "blue" | "teal" | "dark";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-navy-50 text-navy-700",
  ocean: "bg-ocean-50 text-ocean-800",
  green: "bg-leaf-50 text-leaf-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
  teal: "bg-teal-50 text-teal-700",
  dark: "bg-tide text-white",
};

export const CHIP_DOT: Record<ChipTone, string> = {
  neutral: "#98afd0",
  ocean: "#0a6ab0",
  green: "#4fb13b",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#0ea5e9",
  teal: "#14b8a6",
  dark: "#0d2c48",
};

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const STARTUP_STATUS_TONE: Record<string, ChipTone> = {
  live: "blue",
  a1_ready: "teal",
  a2_waiting: "amber",
  term_sheet: "green",
  closed: "green",
  silent: "neutral",
  blocked: "red",
  mandate_closed: "neutral",
};

export const MATCH_STATE_TONE: Record<string, ChipTone> = {
  queued: "amber",
  sent: "ocean",
  paused: "neutral",
  tracker_only: "teal",
  not_queued: "neutral",
};

export function label(v: string | null | undefined) {
  return v ? v.replace(/_/g, " ") : "—";
}
