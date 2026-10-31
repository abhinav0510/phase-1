import Link from "next/link";
import { Card, CardBody } from "@/client/components/admin/ui/card";
import { Badge } from "@/client/components/ui/badge";
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
import { listMeetings } from "@/server/data/admin";
import { JoinLink } from "@/client/components/ui/join-link";
import { formatDateTime } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMeetings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const scope = (sp.scope as "upcoming" | "past" | "all") ?? "upcoming";
  const page = Number(sp.page ?? "1") || 1;
  const pageSize = 25;
  const { rows, total } = await listMeetings({ scope, page, pageSize });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tabs: { key: string; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/meetings?scope=${t.key}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              scope === t.key
                ? "bg-navy-900 text-white"
                : "border border-navy-200 text-navy-600 hover:bg-navy-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardBody className="p-0">
          <div className="flex items-center justify-between px-5 py-3 text-xs text-navy-500">
            <span>{total.toLocaleString("en-IN")} meetings</span>
            <span>
              Page {page} of {totalPages}
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No meetings in this view" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Startup</TH>
                  <TH>Investor</TH>
                  <TH>When</TH>
                  <TH>Status</TH>
                  <TH>Source</TH>
                  <TH>Join</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((m) => (
                  <TR key={m.id}>
                    <TD className="font-medium text-navy-800">
                      {m.startup_name ?? "—"}
                    </TD>
                    <TD className="text-navy-500">{m.investor_name ?? "—"}</TD>
                    <TD className="text-navy-500">
                      {formatDateTime(m.scheduled_at)}
                    </TD>
                    <TD>
                      {m.held ? (
                        <Badge tone="green">held</Badge>
                      ) : (
                        <Badge tone="amber">scheduled</Badge>
                      )}
                    </TD>
                    <TD className="text-navy-500">{m.source ?? "—"}</TD>
                    <TD>
                      <JoinLink href={m.meet_link} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <PageLink
              href={`/admin/meetings?scope=${scope}&page=${Math.max(1, page - 1)}`}
              disabled={page <= 1}
            >
              Previous
            </PageLink>
            <PageLink
              href={`/admin/meetings?scope=${scope}&page=${Math.min(totalPages, page + 1)}`}
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
