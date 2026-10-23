import Link from "next/link";
import {
  Building2,
  Users,
  Handshake,
  CalendarClock,
  FileText,
  TrendingUp,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardBody } from "@/components/ui/card";
import { SimpleBarChart } from "@/components/ui/bar-chart";
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
  getAdminKpis,
  getStartupStatusDistribution,
  getBucketDistribution,
  getRecentStartups,
  getUpcomingMeetings,
} from "@/lib/data/admin";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [kpis, statusDist, bucketDist, recent, upcoming] = await Promise.all([
    getAdminKpis(),
    getStartupStatusDistribution(),
    getBucketDistribution(),
    getRecentStartups(6),
    getUpcomingMeetings(6),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Startups"
          value={kpis.startupsTotal}
          hint={`${kpis.startupsLive} live · ${kpis.startupsTermSheet} term sheet`}
          icon={<Building2 className="h-5 w-5" />}
          accent
        />
        <StatCard
          label="Investors"
          value={kpis.investorsTotal}
          hint={`${kpis.investorsActive} active`}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Matches"
          value={kpis.matchesTotal.toLocaleString("en-IN")}
          hint={`${kpis.matchesQueued} queued`}
          icon={<Handshake className="h-5 w-5" />}
        />
        <StatCard
          label="Meetings"
          value={kpis.meetingsTotal.toLocaleString("en-IN")}
          hint={`${kpis.meetingsUpcoming} upcoming`}
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          label="Silent startups"
          value={kpis.startupsSilent}
          hint="No recent activity"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Docs pending"
          value={kpis.docsPending}
          hint="Requested, not received"
          icon={<FileText className="h-5 w-5" />}
        />
        <StatCard
          label="Upcoming meetings"
          value={kpis.meetingsUpcoming}
          hint="Scheduled & not held"
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Startups by status"
            subtitle="Current pipeline distribution"
          />
          <CardBody>
            <SimpleBarChart data={statusDist} xKey="status" yKey="count" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Startups by bucket"
            subtitle="Priority tiers"
          />
          <CardBody>
            <SimpleBarChart
              data={bucketDist}
              xKey="bucket"
              yKey="count"
              color="#476aa0"
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recently added startups"
            action={
              <Link
                href="/admin/startups"
                className="text-xs font-medium text-navy-600 hover:underline"
              >
                View all
              </Link>
            }
          />
          <CardBody className="p-0">
            {recent.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No startups yet" />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Name</TH>
                    <TH>Sector</TH>
                    <TH>Status</TH>
                    <TH>Added</TH>
                  </tr>
                </THead>
                <TBody>
                  {recent.map((s) => (
                    <TR key={s.id}>
                      <TD>
                        <Link
                          href={`/admin/startups/${s.id}`}
                          className="font-medium text-navy-800 hover:underline"
                        >
                          {s.name ?? `#${s.id}`}
                        </Link>
                      </TD>
                      <TD className="text-navy-500">{s.sector ?? "—"}</TD>
                      <TD>
                        <StatusBadge value={s.status} kind="startup" />
                      </TD>
                      <TD className="text-navy-500">
                        {formatDate(s.created_at)}
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
            title="Upcoming meetings"
            action={
              <Link
                href="/admin/meetings"
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
                    <TH>Startup</TH>
                    <TH>Investor</TH>
                    <TH>When</TH>
                  </tr>
                </THead>
                <TBody>
                  {upcoming.map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium text-navy-800">
                        {m.startup_name ?? "—"}
                      </TD>
                      <TD className="text-navy-500">
                        {m.investor_name ?? "—"}
                      </TD>
                      <TD className="text-navy-500">
                        {formatDateTime(m.scheduled_at)}
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
