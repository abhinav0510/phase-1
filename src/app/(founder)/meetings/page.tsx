import { requireFounder } from "@/lib/auth";
import { getOwnMeetings } from "@/lib/data/founder";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/components/ui/table";
import { JoinLink } from "@/components/ui/join-link";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FounderMeetings() {
  const { startupId } = await requireFounder();
  const meetings = await getOwnMeetings(startupId);
  const now = new Date();
  const upcoming = meetings.filter(
    (m) => m.scheduled_at && new Date(m.scheduled_at) >= now && !m.held,
  );
  const past = meetings.filter(
    (m) => !m.scheduled_at || new Date(m.scheduled_at) < now || m.held,
  );

  return (
    <div className="space-y-6">
      <Section
        title="Upcoming"
        rows={upcoming}
        empty="No upcoming meetings scheduled."
        showJoin
      />
      <Section title="Past & completed" rows={past} empty="No past meetings." />
    </div>
  );
}

function Section({
  title,
  rows,
  empty,
  showJoin = false,
}: {
  title: string;
  rows: any[];
  empty: string;
  showJoin?: boolean;
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={`${rows.length} meeting${rows.length === 1 ? "" : "s"}`} />
      <CardBody className="p-0">
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState title={empty} />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Investor</TH>
                <TH>When</TH>
                <TH>Status</TH>
                <TH>Source</TH>
                {showJoin ? <TH>Join</TH> : null}
              </tr>
            </THead>
            <TBody>
              {rows.map((m) => (
                <TR key={m.id}>
                  <TD className="font-medium text-navy-800">
                    {m.investor_name ?? "—"}
                  </TD>
                  <TD className="text-navy-500">{formatDateTime(m.scheduled_at)}</TD>
                  <TD>
                    {m.held ? (
                      <Badge tone="green">held</Badge>
                    ) : (
                      <Badge tone="amber">scheduled</Badge>
                    )}
                  </TD>
                  <TD className="text-navy-500">{m.source ?? "—"}</TD>
                  {showJoin ? (
                    <TD>
                      <JoinLink href={m.meet_link} />
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
