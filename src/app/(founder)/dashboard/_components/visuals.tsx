import { cn } from "@/shared/lib/utils";

// Server-safe SVG figures (no hooks) used by the founder dashboard.

/** Half-circle gauge: 0–100, the filled arc in the accent and the track in a lighter navy step. */
export function Gauge({
  pct,
  color = "#B8893E",
  label,
}: {
  pct: number;
  color?: string;
  label: string;
}) {
  const p = Math.max(0, Math.min(100, pct));
  // Semicircle of radius 80 centred at (100, 100); stroke 14.
  const r = 80;
  const half = Math.PI * r;
  const dash = (p / 100) * half;
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 112" className="block w-full" aria-hidden="true">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e8edf5"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${half}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-3xl font-semibold leading-none text-navy-900">{p}%</span>
        <span className="mt-1 text-[11px] text-navy-400">{label}</span>
      </div>
    </div>
  );
}

/** Small ring for a KPI tile (e.g. share of matches reached). */
export function Ring({
  pct,
  color = "#1B9E8A",
  size = 56,
}: {
  pct: number;
  color?: string;
  size?: number;
}) {
  const p = Math.max(0, Math.min(100, pct));
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className="shrink-0 -rotate-90"
      aria-hidden="true"
    >
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e8edf5" strokeWidth="6" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
      />
    </svg>
  );
}

/** Horizontal meter with a label and value, used for the investor-mix rows. */
export function MeterRow({
  label,
  value,
  max,
  color = "#2F5FA8",
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 truncate text-navy-700">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e8edf5]">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums text-navy-800">
        {value}
        {suffix ? <span className="text-navy-400"> {suffix}</span> : null}
      </span>
    </div>
  );
}

/** Coloured icon disc used on KPI tiles and timeline nodes. */
export function IconDisc({
  tone,
  children,
  size = "md",
}: {
  tone: "gold" | "navy" | "teal" | "coral" | "leaf";
  children: React.ReactNode;
  size?: "sm" | "md";
}) {
  const tones = {
    gold: "bg-[#fbf3e3] text-[#9a6f2a]",
    navy: "bg-[#e6eefb] text-[#2F5FA8]",
    teal: "bg-[#e1f5f1] text-[#157e6e]",
    coral: "bg-[#fdeae5] text-[#c04f37]",
    leaf: "bg-leaf-50 text-leaf-700",
  } as const;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "md" ? "h-12 w-12" : "h-9 w-9",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}
