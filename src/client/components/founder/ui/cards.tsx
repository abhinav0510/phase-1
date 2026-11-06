import { ArrowUpRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function Card({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <div id={id} className={cn("rounded-[20px] border border-navy-100/70 bg-white shadow-soft", className)}>
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
        <h3 className="text-[15px] font-semibold tracking-tight text-tide">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export interface Gain {
  text: string;
  hint?: string;
}

export function gainIf(positive: boolean, gain: Gain): Gain | undefined {
  return positive ? gain : undefined;
}

export function Delta({ text, hint, onTint }: Gain & { onTint?: boolean }) {
  return (
    <p data-gain className="mt-1.5 flex items-center gap-1.5 text-xs">
      <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-500">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {text}
      </span>
      {hint ? <span className={onTint ? "text-tide/50" : "text-navy-400"}>{hint}</span> : null}
    </p>
  );
}

export type KpiTone = "white" | "dark" | "accent" | "soft";

const KPI_TONES: Record<KpiTone, string> = {
  white: "border border-navy-100/70 bg-white text-tide shadow-soft",
  soft: "bg-ocean-50 text-tide",
  dark: "bg-gradient-to-br from-leaf-100 to-leaf-50 text-tide ring-1 ring-leaf-200/70",
  accent: "bg-gradient-to-br from-ocean-100 to-ocean-50 text-tide ring-1 ring-ocean-200/70",
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
  delta?: Gain;
  hint?: string;
  visual?: React.ReactNode;
  tone?: KpiTone;
  className?: string;
}) {
  const tinted = tone === "dark" || tone === "accent";
  return (
    <div className={cn("relative flex flex-col overflow-hidden rounded-[20px] p-5", KPI_TONES[tone], className)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn("text-xs font-medium", tinted ? "text-tide/65" : "text-navy-500")}>{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              tinted ? "bg-white/80 text-ocean-700 shadow-sm" : "bg-navy-50 text-navy-600",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 truncate text-[28px] font-bold leading-none tracking-tight">{value}</p>
      {delta ? (
        <Delta {...delta} onTint={tinted} />
      ) : hint ? (
        <p className={cn("mt-1.5 text-xs", tinted ? "text-tide/55" : "text-navy-400")}>{hint}</p>
      ) : null}
      {visual ? <div className="mt-4">{visual}</div> : null}
    </div>
  );
}

export function TintPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[24px] bg-gradient-to-br from-ocean-50 via-white to-leaf-50 p-4 text-tide shadow-soft ring-1 ring-ocean-100 md:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AccentPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[20px] bg-gradient-to-br from-ocean-100 to-leaf-100 p-5 text-tide", className)}>
      {children}
    </div>
  );
}
