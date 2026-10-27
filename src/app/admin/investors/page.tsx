import Link from "next/link";
import { Card, CardBody } from "@/components/admin/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/components/admin/ui/table";
import { listInvestors } from "@/lib/data/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "engaged", "pending", "paused", "passed_all", "do_not_contact"];
const TYPES = [
  "angel",
  "angel_network",
  "syndicate",
  "micro_vc",
  "seed_fund",
  "institutional_vc",
  "family_office",
  "other",
];

export default async function AdminInvestors({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const pageSize = 25;
  const { rows, total } = await listInvestors({
    search: sp.q,
    status: sp.status,
    type: sp.type,
    page,
    pageSize,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const mk = (p: number) => {
    const u = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => v && u.set(k, v));
    u.set("page", String(p));
    return `/admin/investors?${u.toString()}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" action="/admin/investors">
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs font-medium text-navy-600">
                Search
              </label>
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Investor name…"
                className="w-full rounded-lg border border-navy-200 px-3 py-2 text-sm outline-none focus:border-navy-500"
              />
            </div>
            <Select name="status" label="Status" value={sp.status} options={STATUSES} />
            <Select name="type" label="Type" value={sp.type} options={TYPES} />
            <button className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">
              Apply
            </button>
            <Link
              href="/admin/investors"
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
            <span>{total.toLocaleString("en-IN")} investors</span>
            <span>
              Page {page} of {totalPages}
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No investors match" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Cheque (Cr)</TH>
                  <TH>Geography</TH>
                  <TH>Last contacted</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((inv) => (
                  <TR key={inv.id}>
                    <TD className="font-medium text-navy-800">
                      {inv.name ?? `#${inv.id}`}
                    </TD>
                    <TD className="text-navy-500">{inv.type ?? "—"}</TD>
                    <TD>
                      <StatusBadge value={inv.status} kind="investor" />
                    </TD>
                    <TD className="text-navy-600">
                      {inv.cheque_min_cr || inv.cheque_max_cr
                        ? `${inv.cheque_min_cr ?? "?"}–${inv.cheque_max_cr ?? "?"}`
                        : inv.cheque_as_written ?? "—"}
                    </TD>
                    <TD className="text-navy-500">{inv.geography ?? "—"}</TD>
                    <TD className="text-navy-500">
                      {formatDate(inv.last_contacted_on)}
                      {inv.do_not_contact ? (
                        <Badge tone="red" className="ml-2">
                          DNC
                        </Badge>
                      ) : null}
                    </TD>
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

function Select({
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
