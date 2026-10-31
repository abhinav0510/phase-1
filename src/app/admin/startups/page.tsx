import Link from "next/link";
import { Card, CardBody } from "@/client/components/admin/ui/card";
import { StatusBadge } from "@/client/components/ui/badge";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/client/components/admin/ui/table";
import { requireAdmin } from "@/server/auth/session";
import { listStartups } from "@/server/data/admin";
import { formatCr, formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = [
  "live",
  "a1_ready",
  "a2_waiting",
  "term_sheet",
  "closed",
  "silent",
  "blocked",
  "mandate_closed",
];
const BUCKETS = ["HOT10", "A", "B", "C", "UNASSIGNED"];

export default async function AdminStartups({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const pageSize = 20;
  const { rows, total } = await listStartups({
    search: sp.q,
    status: sp.status,
    bucket: sp.bucket,
    sector: sp.sector,
    page,
    pageSize,
    sort: sp.sort ?? "updated_at",
    dir: (sp.dir as "asc" | "desc") ?? "desc",
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const mk = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => v && u.set(k, v));
    u.set("page", String(p));
    return `/admin/startups?${u.toString()}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" action="/admin/startups">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-navy-600">
                Search
              </label>
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Startup name…"
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>
            <SelectFilter name="status" label="Status" value={sp.status} options={STATUSES} />
            <SelectFilter name="bucket" label="Bucket" value={sp.bucket} options={BUCKETS} />
            <div>
              <label className="mb-1 block text-xs font-medium text-navy-600">
                Sector
              </label>
              <input
                name="sector"
                defaultValue={sp.sector ?? ""}
                placeholder="e.g. Fintech"
                className="w-40 rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>
            <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              Apply
            </button>
            <Link
              href="/admin/startups"
              className="rounded-lg border border-navy-200 px-4 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50"
            >
              Reset
            </Link>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <div className="flex items-center justify-between px-5 py-3 text-xs text-navy-500">
            <span>
              {total.toLocaleString("en-IN")} startup{total === 1 ? "" : "s"}
            </span>
            <span>
              Page {page} of {totalPages}
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No startups match"
                message="Try clearing filters or a different search."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Sector</TH>
                  <TH>Stage</TH>
                  <TH>Bucket</TH>
                  <TH>Status</TH>
                  <TH>Ask</TH>
                  <TH>Updated</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      <Link
                        href={`/admin/startups/${s.id}`}
                        className="font-medium text-navy-800 hover:underline"
                      >
                        {s.name ?? `#${s.id}`}
                      </Link>
                    </TD>
                    <TD className="text-navy-500">{s.sector ?? "—"}</TD>
                    <TD className="text-navy-500">{s.stage ?? "—"}</TD>
                    <TD>
                      <StatusBadge value={s.bucket} kind="bucket" />
                    </TD>
                    <TD>
                      <StatusBadge value={s.status} kind="startup" />
                    </TD>
                    <TD className="text-navy-600">
                      {s.ask_as_written ?? formatCr(s.ask_amount ?? s.ask_current_cr)}
                    </TD>
                    <TD className="text-navy-500">{formatDate(s.updated_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <PageLink href={mk(Math.max(1, page - 1))} disabled={page <= 1}>
              Previous
            </PageLink>
            <PageLink
              href={mk(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
            </PageLink>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function SelectFilter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-navy-600">
        {label}
      </label>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="cursor-not-allowed rounded-lg border border-navy-100 px-3 py-1.5 text-sm text-navy-300">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-navy-200 px-3 py-1.5 text-sm text-navy-600 hover:bg-navy-50"
    >
      {children}
    </Link>
  );
}
