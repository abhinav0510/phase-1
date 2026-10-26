import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/components/ui/table";
import { listProfileSubmissions } from "@/lib/data/admin";
import { profileProgress } from "@/lib/profile/fields";
import { formatDateTime } from "@/lib/utils";
import { PROFILE_STATUS_META as STATUS_META } from "./status";

export const dynamic = "force-dynamic";

export default async function AdminProfiles() {
  const rows = await listProfileSubmissions();
  const waiting = rows.filter((r) => r.status === "submitted").length;

  return (
    <Card>
      <CardHeader
        title="Founder profile reviews"
        subtitle={
          waiting
            ? `${waiting} profile${waiting === 1 ? "" : "s"} waiting for review`
            : "Profiles founders have filled in from the portal"
        }
      />
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No founder profiles yet"
              message="When founders complete their profile from the portal, their submissions appear here for review."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Startup</TH>
                <TH>Status</TH>
                <TH>Answered</TH>
                <TH>Submitted</TH>
                <TH>Last updated</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => {
                const meta = STATUS_META[r.status];
                const p = profileProgress(null, r.answers);
                return (
                  <TR key={r.startup_id}>
                    <TD className="font-medium text-navy-800">{r.startup_name ?? `#${r.startup_id}`}</TD>
                    <TD>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TD>
                    <TD className="tabular-nums text-navy-600">
                      {p.done}/{p.total}
                    </TD>
                    <TD className="text-navy-500">{formatDateTime(r.submitted_at)}</TD>
                    <TD className="text-navy-500">{formatDateTime(r.updated_at)}</TD>
                    <TD>
                      <Link
                        href={`/admin/profiles/${r.startup_id}`}
                        className="text-xs font-semibold text-navy-700 hover:underline"
                      >
                        {r.status === "submitted" ? "Review" : "Open"}
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
