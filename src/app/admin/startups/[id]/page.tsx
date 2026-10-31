import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/card";
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
import { requireAdmin } from "@/lib/auth";
import { getStartupDetail } from "@/lib/data/admin";
import { JoinLink } from "@/components/ui/join-link";
import { formatCr, formatLakh, formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StartupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const startupId = Number(id);
  if (!Number.isInteger(startupId)) notFound();

  const { startup, matches, meetings, funding, docs } =
    await getStartupDetail(startupId);
  if (!startup) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/startups"
        className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to startups
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">
            {startup.name ?? `#${startup.id}`}
          </h2>
          <p className="text-sm text-navy-500">
            {startup.sector ?? "—"}
            {startup.subsector ? ` · ${startup.subsector}` : ""} ·{" "}
            {startup.stage ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={startup.bucket} kind="bucket" />
          <StatusBadge value={startup.status} kind="startup" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Company" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Owner / contact" value={startup.owner_name} />
            <Row label="Stage" value={startup.stage} />
            <Row label="Rule tier" value={startup.rule_tier} />
            <Row label="Score" value={startup.score?.toString()} />
            <Row label="Mandate signed" value={formatDate(startup.mandate_signed_on)} />
            <Row label="Mandate closed" value={formatDate(startup.mandate_closed_on)} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Financials" />
          <CardBody className="space-y-2 text-sm">
            <Row
              label="Ask"
              value={startup.ask_as_written ?? formatCr(startup.ask_amount ?? startup.ask_current_cr)}
            />
            <Row
              label="Allocation left"
              value={startup.allocation_left_as_written ?? formatCr(startup.allocation_left_amount)}
            />
            <Row label="Revenue" value={formatLakh(startup.revenue_inr_l)} />
            <Row label="Burn" value={formatLakh(startup.burn_inr_l)} />
            <Row
              label="Runway"
              value={startup.runway_months ? `${startup.runway_months} mo` : null}
            />
            {startup.revenue_note ? (
              <p className="pt-1 text-xs text-navy-500">{startup.revenue_note}</p>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Notes" />
          <CardBody className="text-sm text-navy-600">
            {startup.notes ? (
              <p className="whitespace-pre-wrap">{startup.notes}</p>
            ) : (
              <p className="text-navy-400">No notes recorded.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Investor matches"
          subtitle={`${matches.length} match${matches.length === 1 ? "" : "es"}`}
        />
        <CardBody className="p-0">
          {matches.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No matches yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Investor</TH>
                  <TH>Type</TH>
                  <TH>Match</TH>
                  <TH>State</TH>
                  <TH>Fit</TH>
                  <TH>Priority</TH>
                </tr>
              </THead>
              <TBody>
                {matches.slice(0, 50).map((m) => (
                  <TR key={m.id}>
                    <TD className="font-medium text-navy-800">
                      {m.investor?.name ?? `#${m.investor_id}`}
                    </TD>
                    <TD className="text-navy-500">{m.investor?.type ?? "—"}</TD>
                    <TD className="text-navy-500">{m.type ?? "—"}</TD>
                    <TD>
                      <StatusBadge value={m.state} kind="match" />
                    </TD>
                    <TD className="text-navy-500">
                      {[m.stage_fit && "stage", m.cheque_fit && "cheque"]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TD>
                    <TD className="text-navy-500">{m.priority ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Meetings" subtitle={`${meetings.length} total`} />
          <CardBody className="p-0">
            {meetings.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No meetings" />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Investor</TH>
                    <TH>When</TH>
                    <TH>Held</TH>
                    <TH>Join</TH>
                  </tr>
                </THead>
                <TBody>
                  {meetings.slice(0, 20).map((m) => (
                    <TR key={m.id}>
                      <TD className="text-navy-700">{m.investor_name ?? "—"}</TD>
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
                      <TD>
                        <JoinLink href={m.meet_link} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Funding & documents" />
          <CardBody className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Funding rounds
              </p>
              {funding.length === 0 ? (
                <p className="text-sm text-navy-400">
                  No funding rounds recorded.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {funding.map((f: any) => (
                    <li key={f.id} className="flex justify-between">
                      <span className="text-navy-700">
                        {f.round_name ?? f.instrument ?? "Round"}
                      </span>
                      <span className="text-navy-500">
                        {f.as_written ?? formatCr(f.amount)} ·{" "}
                        {formatDate(f.closed_on)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Documents
              </p>
              {docs.length === 0 ? (
                <p className="text-sm text-navy-400">
                  No documents recorded.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {docs.map((d: any) => (
                    <li key={d.id} className="flex justify-between">
                      <span className="text-navy-700">{d.doc_type ?? "Doc"}</span>
                      <span className="text-navy-500">
                        {d.classification ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <p className="text-xs text-navy-400">
        This view is read-only in Phase 1. Write actions (verification decisions,
        internal notes, information requests) are a flagged follow-up — they
        require either writes to existing columns or new additive tables, both
        pending your approval so no existing data is changed.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-navy-400">{label}</span>
      <span className="text-right font-medium text-navy-800">
        {value || "—"}
      </span>
    </div>
  );
}
