import { cn } from "@/shared/lib/utils";

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
      <p className="text-sm font-semibold text-tide">{title}</p>
      {message ? <p className="mt-1 max-w-sm text-xs text-navy-500">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function FieldRow({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("rounded-2xl bg-canvas px-4 py-3", wide && "sm:col-span-2 lg:col-span-3")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-navy-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-tide">{value || "—"}</div>
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
