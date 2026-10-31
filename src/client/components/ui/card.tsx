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
        "rounded-xl border border-navy-100 bg-white shadow-card",
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
    <div className="flex items-start justify-between gap-4 border-b border-navy-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
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

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={cn(accent && "bg-navy-900 text-white")}>
      <CardBody className="flex items-start justify-between">
        <div>
          <p
            className={cn(
              "text-xs font-medium",
              accent ? "text-navy-200" : "text-navy-500",
            )}
          >
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? (
            <p
              className={cn(
                "mt-1 text-xs",
                accent ? "text-navy-300" : "text-navy-400",
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "rounded-lg p-2",
              accent ? "bg-white/10 text-white" : "bg-navy-50 text-navy-500",
            )}
          >
            {icon}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
