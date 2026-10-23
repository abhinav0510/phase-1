import { Handshake, CalendarClock, XCircle, PhoneForwarded } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnStartup, getOwnWeeklyReports } from "@/lib/data/founder";
import { StatCard, Card, CardHeader, CardBody } from "@/components/ui/card";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { WeeklyReport } from "@/lib/types/db";

export const dynamic = "force-dynamic";

function weekLabel(r: WeeklyReport): string {
  const start = formatDate(r.week_start);
  const end = r.week_end ? formatDate(r.week_end) : null;
  return end ? `${start} – ${end}` : start;
}

export default async function WeeklyReportsPage() {
  const { startupId } = await requireFounder();
  const startup = await getOwnStartup(startupId);
  const reports = await getOwnWeeklyReports(startupId, startup?.name);

  const latest = reports[0];
  const earlier = reports.slice(1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Weekly fundraising reports"
          subtitle="The same weekly update Sidana emails you, kept here week by week"
        />
        <CardBody className="text-sm text-navy-500">
          Each Saturday we summarise the week&apos;s fundraising activity for{" "}
          <span className="font-medium text-navy-800">
            {startup?.name ?? "your startup"}
          </span>
          : investors reached, follow-ups, meetings scheduled, passes, and any
          feedback from investor meetings.
        </CardBody>
      </Card>

      {!latest ? (
        <Card>
          <CardBody className="p-8">
            <EmptyState
              title="No weekly reports yet"
              message="Your first weekly report will appear here after the next Saturday run. Reports are also emailed to you."
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-navy-900">
                Latest report
              </h2>
              <span className="text-sm text-navy-500">
                Week of {weekLabel(latest)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Investors reached"
                value={latest.reached}
                icon={<Handshake className="h-5 w-5" />}
                accent
              />
              <StatCard
                label="Follow-ups"
                value={latest.followups}
                icon={<PhoneForwarded className="h-5 w-5" />}
              />
              <StatCard
                label="Meetings scheduled"
                value={latest.meetings}
                icon={<CalendarClock className="h-5 w-5" />}
              />
              <StatCard
                label="Passed deals"
                value={latest.passed}
                icon={<XCircle className="h-5 w-5" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ListCard
                title="Meetings scheduled with investors"
                items={latest.meeting_list}
                empty="No meetings scheduled this week."
              />
              <ListCard
                title="Investors who passed"
                items={latest.passed_list}
                empty="No investor passed this week."
              />
              <ListCard
                title="Feedback after meetings"
                items={latest.feedback_list}
                empty="No post-meeting feedback this week."
              />
            </div>
          </div>

          {earlier.length > 0 ? (
            <Card>
              <CardHeader
                title="Previous weeks"
                subtitle="Earlier weekly reports on record"
              />
              <CardBody className="p-0">
                <Table>
                  <THead>
                    <tr>
                      <TH>Week</TH>
                      <TH>Reached</TH>
                      <TH>Follow-ups</TH>
                      <TH>Meetings</TH>
                      <TH>Passed</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {earlier.map((r) => (
                      <TR key={r.id}>
                        <TD className="font-medium text-navy-800">
                          {weekLabel(r)}
                        </TD>
                        <TD className="text-navy-600">{r.reached}</TD>
                        <TD className="text-navy-600">{r.followups}</TD>
                        <TD className="text-navy-600">{r.meetings}</TD>
                        <TD className="text-navy-600">{r.passed}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function ListCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty: string;
}) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        {list.length === 0 ? (
          <p className="text-sm text-navy-400">{empty}</p>
        ) : (
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-navy-700">
            {list.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
