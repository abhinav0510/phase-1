import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { Card, CardHeader, CardBody, StatCard } from "@/client/components/admin/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD } from "@/client/components/admin/ui/table";
import { AutoRefresh } from "@/client/components/ui/auto-refresh";
import { getBroadcastDetail } from "@/server/data/notifications";
import { formatDateTime } from "@/shared/lib/utils";
import { AUDIENCE_LABEL, BroadcastStatusBadge } from "../status";

export const dynamic = "force-dynamic";

const RECIPIENT_TONE = { pending: "amber", sent: "green", failed: "red" } as const;

export default async function BroadcastDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const broadcastId = Number(id);
  if (!Number.isInteger(broadcastId) || broadcastId <= 0) notFound();

  const { broadcast, recipients } = await getBroadcastDetail(broadcastId);
  if (!broadcast) notFound();
  const inFlight = broadcast.status === "sending" || broadcast.status === "queued";
  const pending = recipients.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <AutoRefresh active={inFlight} />
      <Link
        href="/admin/notifications"
        className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to notifications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">{broadcast.subject}</h2>
          <p className="mt-1 text-sm text-navy-500">
            {AUDIENCE_LABEL[broadcast.audience]} · sent by {broadcast.sent_by_email ?? "—"} ·{" "}
            {formatDateTime(broadcast.created_at)}
          </p>
        </div>
        <BroadcastStatusBadge status={broadcast.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Recipients" value={broadcast.recipient_count} accent />
        <StatCard label="Delivered" value={recipients.filter((r) => r.status === "sent").length} />
        <StatCard label="Failed" value={recipients.filter((r) => r.status === "failed").length} />
        <StatCard
          label="Pending"
          value={pending}
          hint={inFlight ? "Sending ~1 per second — updating live" : undefined}
        />
      </div>

      {broadcast.error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{broadcast.error}</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Delivery" subtitle="One email per startup, to every address on file" />
          <CardBody className="p-0">
            <Table>
              <THead>
                <tr>
                  <TH>Recipient</TH>
                  <TH>Addresses</TH>
                  <TH>Status</TH>
                  <TH>Sent</TH>
                </tr>
              </THead>
              <TBody>
                {recipients.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-navy-800">
                      {r.startup_id ? (
                        <Link href={`/admin/startups/${r.startup_id}`} className="hover:underline">
                          {r.startup_name ?? `#${r.startup_id}`}
                        </Link>
                      ) : (
                        r.startup_name ?? "Custom address"
                      )}
                    </TD>
                    <TD className="max-w-[280px] whitespace-normal text-xs text-navy-500">{r.emails}</TD>
                    <TD>
                      <Badge tone={RECIPIENT_TONE[r.status]}>{r.status}</Badge>
                      {r.error ? (
                        <p className="mt-1 max-w-[240px] whitespace-normal text-xs text-red-600">{r.error}</p>
                      ) : null}
                    </TD>
                    <TD className="text-navy-500">{formatDateTime(r.sent_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Message" subtitle="As written (merge fields filled per recipient)" />
          <CardBody>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-700">{broadcast.body}</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
