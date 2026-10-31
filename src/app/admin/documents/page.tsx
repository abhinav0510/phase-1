import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/client/components/admin/ui/card";
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
import { listPendingDocs } from "@/server/data/admin";
import { formatDateTime } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDocuments() {
  await requireAdmin();
  const pending = await listPendingDocs();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Document verification queue"
          subtitle="Documents requested but not yet received"
        />
        <CardBody className="p-0">
          {pending.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Nothing in the queue"
                message="The docs table currently has no pending items. When onboarding documents are requested through the deal workflows, they will appear here for review."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Startup</TH>
                  <TH>Document</TH>
                  <TH>Requested</TH>
                  <TH>Chasers</TH>
                </tr>
              </THead>
              <TBody>
                {pending.map((d: any) => (
                  <TR key={d.id}>
                    <TD className="font-medium text-navy-800">
                      {d.startup ? (
                        <Link
                          href={`/admin/startups/${d.startup.id}`}
                          className="hover:underline"
                        >
                          {d.startup.name ?? `#${d.startup_id}`}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="text-navy-600">{d.doc_type ?? "—"}</TD>
                    <TD className="text-navy-500">
                      {formatDateTime(d.requested_at)}
                    </TD>
                    <TD className="text-navy-500">{d.chaser_count ?? 0}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
      <p className="text-xs text-navy-400">
        File viewing via short-lived signed URLs will be wired once a Storage
        bucket for startup documents is confirmed. No Storage bucket is currently
        exposed on this project, so file download is a flagged integration point
        rather than a broken button.
      </p>
    </div>
  );
}
