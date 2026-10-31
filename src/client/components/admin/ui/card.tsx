import { cn } from "@/shared/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-navy-100/80 bg-white shadow-soft",
        className,
      )}
    >
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
        <h3 className="text-base font-semibold tracking-tight text-navy-950">{title}</h3>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export type StatTone = "white" | "blue" | "lavender" | "mint" | "cream" | "dark";

const TONES: Record<StatTone, string> = {
  white: "border border-navy-100/80 bg-white text-navy-950 shadow-soft",
  blue: "bg-pastel-blue text-navy-950",
  lavender: "bg-pastel-lavender text-navy-950",
  mint: "bg-pastel-mint text-navy-950",
  cream: "bg-pastel-cream text-navy-950",
  dark: "bg-navy-950 text-white",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  /** Legacy alias for tone="blue". */
  accent?: boolean;
  tone?: StatTone;
}) {
  const t: StatTone = tone ?? (accent ? "blue" : "white");
  const dark = t === "dark";
  return (
    <div className={cn("flex flex-col justify-between rounded-2xl p-5", TONES[t])}>
      <div>
        <p className="text-[26px] font-bold leading-none tracking-tight">{value}</p>
        <p className={cn("mt-2 text-xs font-medium", dark ? "text-navy-300" : "text-navy-600")}>
          {label}
        </p>
      </div>
      {icon || hint ? (
        <div className="mt-5 flex items-center justify-between gap-3">
          {icon ? (
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full shadow-sm",
                dark ? "bg-white/10 text-white" : "bg-white text-navy-800",
              )}
            >
              {icon}
            </span>
          ) : (
            <span />
          )}
          {hint ? (
            <span className={cn("text-right text-[11px] font-medium", dark ? "text-navy-300" : "text-navy-500")}>
              {hint}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
