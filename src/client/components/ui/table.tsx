import { cn } from "@/shared/lib/utils";

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
      {children}
    </thead>
  );
}

export function TH({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("whitespace-nowrap px-4 py-3 font-medium", className)}>
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-navy-50">{children}</tbody>;
}

export function TR({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("hover:bg-navy-50/60", className)}>{children}</tr>
  );
}

export function TD({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("whitespace-nowrap px-4 py-3 text-navy-700", className)}>
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-navy-200 bg-navy-50/40 px-6 py-12 text-center">
      <p className="text-sm font-medium text-navy-700">{title}</p>
      {message ? (
        <p className="mt-1 max-w-sm text-xs text-navy-500">{message}</p>
      ) : null}
    </div>
  );
}
