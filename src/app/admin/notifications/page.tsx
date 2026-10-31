import Link from "next/link";
import { Mail, Building2, RefreshCw } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { StatCard, Card, CardHeader, CardBody } from "@/client/components/admin/ui/card";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/client/components/admin/ui/table";
import {
  getLastContactSync,
  getStartupRecipients,
  listBroadcasts,
} from "@/server/data/notifications";
import { formatDateTime } from "@/shared/lib/utils";
import { BroadcastComposer } from "./composer";
import { SyncContactsButton } from "./sync-button";
import { AUDIENCE_LABEL, BroadcastStatusBadge } from "./status";

export const dynamic = "force-dynamic";

export default async function AdminNotifications() {
  const session = await requireAdmin();
  const [recipients, lastSync, broadcasts] = await Promise.all([
    getStartupRecipients(),
    getLastContactSync(),
    listBroadcasts(25),
  ]);
  const reachable = recipients.filter((r) => r.emails.length);
  const missing = recipients.filter((r) => !r.emails.length);
  const totalEmails = reachable.reduce((n, r) => n + r.emails.length, 0);
  // The sheet can list the same startup twice; show each name once.
  const unmatchedNames = Array.from(new Set((lastSync?.unmatched ?? []).map((u) => u.name)));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Startups reachable by email"
          value={`${reachable.length} / ${recipients.length}`}
          hint={missing.length ? `${missing.length} without an email on file` : "Every startup has an email"}
          icon={<Building2 className="h-5 w-5" />}
          accent
        />
        <StatCard
          label="Email addresses on file"
          value={totalEmails}
          hint="From the Founders Info sheet"
          icon={<Mail className="h-5 w-5" />}
        />
        <StatCard
          label="Contacts last synced"
          value={lastSync ? formatDateTime(lastSync.ran_at) : "Never"}
          hint={lastSync ? `${lastSync.trigger ?? "sync"} · runs hourly` : "Run a sync below"}
          icon={<RefreshCw className="h-5 w-5" />}
        />
      </div>

      <BroadcastComposer
        startups={recipients.map((r) => ({
          id: r.id,
          name: r.name,
          emails: r.emails,
          founderName: r.founderName,
        }))}
        adminEmail={session.email}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent broadcasts" subtitle="Every email sent from this panel, with delivery status" />
          <CardBody className="p-0">
            {broadcasts.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No emails sent yet"
                  message="Broadcasts and test copies you send appear here with per-startup delivery status."
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Subject</TH>
                    <TH>Audience</TH>
                    <TH>Delivered</TH>
                    <TH>Status</TH>
                    <TH>Sent</TH>
                  </tr>
                </THead>
                <TBody>
                  {broadcasts.map((b) => (
                    <TR key={b.id}>
                      <TD className="max-w-[260px] truncate">
                        <Link
                          href={`/admin/notifications/${b.id}`}
                          className="font-medium text-navy-800 hover:underline"
                        >
                          {b.subject}
                        </Link>
                      </TD>
                      <TD className="text-navy-500">{AUDIENCE_LABEL[b.audience]}</TD>
                      <TD className="text-navy-500">
                        {b.sent_count}/{b.recipient_count}
                        {b.failed_count ? <span className="text-red-600"> · {b.failed_count} failed</span> : null}
                      </TD>
                      <TD>
                        <BroadcastStatusBadge status={b.status} />
                      </TD>
                      <TD className="text-navy-500">{formatDateTime(b.created_at)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Contacts" subtitle="Mirrored hourly from the Founders Info sheet" />
          <CardBody className="space-y-4 text-sm">
            <SyncContactsButton />
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Startups without an email ({missing.length})
              </p>
              {missing.length ? (
                <ul className="space-y-0.5 text-navy-700">
                  {missing.map((m) => (
                    <li key={m.id}>
                      <Link href={`/admin/startups/${m.id}`} className="hover:underline">
                        {m.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-navy-400">None — every platform startup is reachable.</p>
              )}
              <p className="mt-2 text-xs text-navy-400">
                Add their emails to the Founders Info tab of the book; they are picked up on the next sync.
              </p>
            </div>
            {unmatchedNames.length ? (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  Sheet startups not on the platform ({unmatchedNames.length})
                </p>
                <p className="text-xs leading-relaxed text-navy-500">{unmatchedNames.join(", ")}</p>
                <p className="mt-1 text-xs text-navy-400">
                  Not included in &ldquo;All platform startups&rdquo;. Reach them via &ldquo;Also send to&rdquo;.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
