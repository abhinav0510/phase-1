import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Minus } from "lucide-react";
import { cn, initials } from "@/lib/utils";

// Server-safe founder UI kit (no hooks). Animated pieces live in motion.tsx.

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[20px] border border-navy-100/70 bg-white shadow-soft", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pb-1 pt-5">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight text-obsidian">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  back,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-5 pt-1">
      <div className="flex min-w-0 items-center gap-3">
        {back ? (
          <Link
            href={back}
            aria-label="Back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-navy-100 bg-white text-navy-700 shadow-sm transition hover:bg-navy-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-iris">{eyebrow}</p>
          ) : null}
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-obsidian md:text-[30px]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-navy-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type DeltaTone = "good" | "bad" | "neutral";

export function Delta({
  text,
  tone = "neutral",
  arrow,
  hint,
  onDark,
}: {
  text: string;
  tone?: DeltaTone;
  arrow?: "up" | "down" | "flat";
  hint?: string;
  onDark?: boolean;
}) {
  const Icon = arrow === "up" ? ArrowUpRight : arrow === "down" ? ArrowDownRight : Minus;
  const color =
    tone === "good" ? "text-emerald-500" : tone === "bad" ? "text-red-500" : onDark ? "text-white/70" : "text-navy-500";
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", color)}>
        <Icon className="h-3.5 w-3.5" />
        {text}
      </span>
      {hint ? <span className={onDark ? "text-white/50" : "text-navy-400"}>{hint}</span> : null}
    </p>
  );
}

export type KpiTone = "white" | "dark" | "accent" | "soft";

const KPI_TONES: Record<KpiTone, string> = {
  white: "border border-navy-100/70 bg-white text-obsidian shadow-soft",
  soft: "bg-iris-soft text-obsidian",
  dark: "bg-obsidian text-white",
  accent: "bg-iris text-white shadow-lg shadow-iris/30",
};

export function KpiCard({
  label,
  value,
  icon,
  delta,
  hint,
  visual,
  tone = "white",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  delta?: { text: string; tone?: DeltaTone; arrow?: "up" | "down" | "flat"; hint?: string };
  hint?: string;
  visual?: React.ReactNode;
  tone?: KpiTone;
  className?: string;
}) {
  const dark = tone === "dark" || tone === "accent";
  return (
    <div className={cn("relative flex flex-col overflow-hidden rounded-[20px] p-5", KPI_TONES[tone], className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-xs font-medium", dark ? "text-white/65" : "text-navy-500")}>{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              dark ? "bg-white/15 text-white" : "bg-navy-50 text-navy-600",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 truncate text-[28px] font-bold leading-none tracking-tight">{value}</p>
      {delta ? (
        <Delta {...delta} onDark={dark} />
      ) : hint ? (
        <p className={cn("mt-1.5 text-xs", dark ? "text-white/55" : "text-navy-400")}>{hint}</p>
      ) : null}
      {visual ? <div className="mt-4">{visual}</div> : null}
    </div>
  );
}

export function DarkPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[24px] bg-obsidian p-4 text-white shadow-[0_30px_60px_-30px_rgba(21,22,31,0.6)] md:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AccentPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[20px] bg-iris p-5 text-white shadow-lg shadow-iris/30", className)}>
      {children}
    </div>
  );
}

export type ChipTone = "neutral" | "iris" | "green" | "amber" | "red" | "blue" | "violet" | "dark";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-navy-50 text-navy-700",
  iris: "bg-iris-soft text-iris-ink",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  dark: "bg-obsidian text-white",
};

export const CHIP_DOT: Record<ChipTone, string> = {
  neutral: "#98afd0",
  iris: "#5b5fe6",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#0ea5e9",
  violet: "#8b5cf6",
  dark: "#15161f",
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
  a1_ready: "violet",
  a2_waiting: "amber",
  term_sheet: "green",
  closed: "green",
  silent: "neutral",
  blocked: "red",
  mandate_closed: "neutral",
};

export const MATCH_STATE_TONE: Record<string, ChipTone> = {
  queued: "amber",
  sent: "iris",
  paused: "neutral",
  tracker_only: "violet",
  not_queued: "neutral",
};

export function label(v: string | null | undefined) {
  return v ? v.replace(/_/g, " ") : "—";
}

type ButtonVariant = "primary" | "ghost" | "dark" | "white";

const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-iris text-white shadow-md shadow-iris/30 hover:bg-iris-deep",
  ghost: "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50",
  dark: "bg-obsidian text-white hover:bg-obsidian-2",
  white: "bg-white text-obsidian shadow hover:bg-white/90",
};

export function buttonClass(variant: ButtonVariant = "primary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
    size === "sm" ? "px-3.5 py-2 text-xs" : "px-5 py-2.5 text-sm",
    BUTTON[variant],
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  external,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = cn(buttonClass(variant, size), className);
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export function IconButtonLink({
  href,
  label,
  children,
  external,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const cls =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-600 shadow-sm transition hover:bg-navy-50 hover:text-obsidian";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  );
}

const AVATAR_BG = ["#5b5fe6", "#1b9e8a", "#d9644a", "#b8893e", "#2f5fa8", "#7c6bd9", "#0ea5e9"];

export function avatarColor(name: string | null | undefined) {
  const s = name ?? "?";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

export function Avatar({
  name,
  size = "md",
  className,
  tone,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Force a tone instead of the name-derived colour. */
  tone?: "white" | "dark";
}) {
  const dim = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-xs";
  const style =
    tone === "white"
      ? { background: "#ffffff", color: "#15161f" }
      : tone === "dark"
        ? { background: "#15161f", color: "#ffffff" }
        : { background: avatarColor(name), color: "#ffffff" };
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold tracking-wide", dim, className)}
      style={style}
    >
      {initials(name)}
    </span>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-navy-50 text-left text-xs font-medium text-navy-400">{children}</thead>;
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-5 py-3 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-navy-50">{children}</tbody>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-canvas", className)}>{children}</tr>;
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-5 py-3.5 text-navy-700", className)}>{children}</td>;
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-navy-200 bg-canvas/60 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-obsidian">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-xs text-navy-500">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Label-over-value tile for detail grids. */
export function FieldRow({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-canvas px-4 py-3", wide && "sm:col-span-2 lg:col-span-3")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-obsidian">{value || "—"}</div>
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-navy-200 bg-white px-4 py-3 text-xs leading-relaxed text-navy-500">
      {children}
    </p>
  );
}

export function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-navy-100 px-3 py-1 text-xs font-medium text-navy-600 transition hover:bg-navy-50 hover:text-obsidian"
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export const inputClass =
  "w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-obsidian outline-none transition placeholder:text-navy-300 focus:border-iris focus:ring-4 focus:ring-iris/15";
