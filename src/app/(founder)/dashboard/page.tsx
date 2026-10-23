import Link from "next/link";
import {
  Handshake,
  CalendarClock,
  Wallet,
  Target,
  FileBarChart,
} from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { StatCard, Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/components/ui/table";
import {
  getFounderOverview,
  getOwnMeetings,
  getOwnMatches,
  getOwnWeeklyReports,
} from "@/lib/data/founder";
import { JoinLink } from "@/components/ui/join-link";
import { formatCr, formatLakh, formatDateTime, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FounderDashboard() {
  const { startupId } = await requireFounder();
  const [overview, meetings, matches, weeklyReports] = await Promise.all([
    getFounderOverview(startupId),
    getOwnMeetings(startupId),
    getOwnMatches(startupId),
    getOwnWeeklyReports(startupId),
  ]);
  const s = overview.startup;
  const latestReport = weeklyReports[0] ?? null;
  const upcoming = meetings
    .filter((m) => m.scheduled_at && new Date(m.scheduled_at) >= new Date() && !m.held)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-navy-500">Welcome back</p>
            <h2 className="text-xl font-semibold text-navy-900">
              {s?.name ?? "Your startup"}
            </h2>
            <p className="mt-1 text-sm text-navy-500">
              {s?.sector ?? "—"} · {s?.stage ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={s?.bucket} kind="bucket" />
            <StatusBadge value={s?.status} kind="startup" />
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Current ask"
          value={s?.ask_as_written ?? formatCr(s?.ask_amount ?? s?.ask_current_cr)}
          icon={<Target className="h-5 w-5" />}
          accent
        />
        <StatCard
          label="Allocation left"
          value={s?.allocation_left_as_written ?? formatCr(s?.allocation_left_amount)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Investor matches"
          value={overview.matchCount}
          hint={`${overview.matchSent} reached out`}
          icon={<Handshake className="h-5 w-5" />}
        />
        <StatCard
          label="Meetings"
          value={overview.meetingsHeld + overview.meetingsUpcoming}
          hint={`${overview.meetingsUpcoming} upcoming`}
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Profile completeness" />
          <CardBody>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-semibold text-navy-900">
                {overview.profileCompletion}%
              </span>
              <Link
                href="/business-details"
                className="text-xs font-medium text-navy-600 hover:underline"
              >
                Complete profile
              </Link>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-navy-100">
              <div
                className="h-full rounded-full bg-navy-700"
                style={{ width: `${overview.profileCompletion}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-navy-400">
              Based on key profile and financial fields on record.
            </p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Snapshot"
            subtitle="Key financials on record with Sidana"
          />
          <CardBody className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Metric label="Revenue" value={formatLakh(s?.revenue_inr_l)} />
            <Metric label="Burn" value={formatLakh(s?.burn_inr_l)} />
            <Metric
              label="Runway"
              value={s?.runway_months ? `${s.runway_months} mo` : "—"}
            />
            <Metric label="Score" value={s?.score?.toString() ?? "—"} />
            <Metric label="Rule tier" value={s?.rule_tier ?? "—"} />
            <Metric label="Sidana contact" value={s?.owner_name ?? "—"} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Latest weekly report"
          subtitle={
            latestReport
              ? `Week of ${formatDate(latestReport.week_start)}${
                  latestReport.week_end
                    ? ` – ${formatDate(latestReport.week_end)}`
                    : ""
                }`
              : "Your weekly fundraising summary from Sidana"
          }
          action={
            <Link
              href="/weekly-reports"
              className="text-xs font-medium text-navy-600 hover:underline"
            >
              View all
            </Link>
          }
        />
        <CardBody>
          {latestReport ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <ReportMetric label="Investors reached" value={latestReport.reached} />
              <ReportMetric label="Follow-ups" value={latestReport.followups} />
              <ReportMetric label="Meetings" value={latestReport.meetings} />
              <ReportMetric label="Passed" value={latestReport.passed} />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-navy-500">
              <FileBarChart className="h-5 w-5 text-navy-400" />
              <span>
                Your first weekly report will appear here after the next
                Saturday run — and arrives by email too.
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Upcoming meetings"
            action={
              <Link
                href="/meetings"
                className="text-xs font-medium text-navy-600 hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="p-0">
            {upcoming.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No upcoming meetings" />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Investor</TH>
                    <TH>When</TH>
                    <TH>Join</TH>
                  </tr>
                </THead>
                <TBody>
                  {upcoming.map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium text-navy-800">
                        {m.investor_name ?? "—"}
                      </TD>
                      <TD className="text-navy-500">
                        {formatDateTime(m.scheduled_at)}
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
          <CardHeader
            title="Recent investor matches"
            action={
              <Link
                href="/funding"
                className="text-xs font-medium text-navy-600 hover:underline"
              >
                View all
              </Link>
            }
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
                    <TH>State</TH>
                  </tr>
                </THead>
                <TBody>
                  {matches.slice(0, 6).map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium text-navy-800">
                        {m.investor?.name ?? "Investor"}
                      </TD>
                      <TD className="text-navy-500">{m.investor?.type ?? "—"}</TD>
                      <TD>
                        <StatusBadge value={m.state} kind="match" />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-0.5 font-semibold text-navy-800">{value}</p>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-navy-900">{value}</p>
    </div>
  );
}
