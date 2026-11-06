import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean-600">{eyebrow}</p>
          ) : null}
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-tide md:text-[30px]">
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm text-navy-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

type ButtonVariant = "primary" | "ghost" | "dark" | "white";

const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-ocean-600 text-white shadow-md shadow-ocean-600/30 hover:bg-ocean-700",
  ghost: "border border-navy-200 bg-white text-navy-800 hover:bg-navy-50",
  dark: "bg-tide text-white hover:bg-tide-2",
  white: "bg-white text-tide shadow hover:bg-white/90",
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
    "flex h-10 w-10 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-600 shadow-sm transition hover:bg-navy-50 hover:text-tide";
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

export function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-navy-100 px-3 py-1 text-xs font-medium text-navy-600 transition hover:bg-navy-50 hover:text-tide"
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export const inputClass =
  "w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-tide outline-none transition placeholder:text-navy-300 focus:border-ocean-600 focus:ring-4 focus:ring-ocean-600/15";
