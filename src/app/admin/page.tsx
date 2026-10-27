import Link from "next/link";
import {
  Building2,
  Users,
  Handshake,
  CalendarClock,
  FileText,
  TrendingUp,
  ArrowRight,
  Mail,
  ClipboardCheck,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import { StatCard, Card, CardHeader, CardBody } from "@/components/admin/ui/card";
import { SimpleBarChart } from "@/components/admin/ui/bar-chart";
import { StatusBadge } from "@/components/ui/badge";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/components/admin/ui/table";
import {
  getAdminKpis,
  getStartupStatusDistribution,
  getBucketDistribution,
  getRecentStartups,
  getUpcomingMeetings,
  countProfilesAwaitingReview,
} from "@/lib/data/admin";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [kpis, statusDist, bucketDist, recent, upcoming, profilesWaiting] =
    await Promise.all([
      getAdminKpis(),
      getStartupStatusDistribution(),
      getBucketDistribution(),
      getRecentStartups(6),
      getUpcomingMeetings(6),
      countProfilesAwaitingReview(),
    ]);

  const attention = [
    {
      label: "Silent startups",
      value: kpis.startupsSilent,
      hint: "No recent activity",
      href: "/admin/startups?status=silent",
      icon: TrendingUp,
    },
    {
      label: "Docs pending",
      value: kpis.docsPending,
      hint: "Requested, not received",
      href: "/admin/documents",
      icon: FileText,
    },
    {
      label: "Profiles to review",
      value: profilesWaiting,
      hint: "Submitted by founders",
      href: "/admin/profiles",
      icon: ClipboardCheck,
    },
    {
      label: "Upcoming meetings",
      value: kpis.meetingsUpcoming,
      hint: "Scheduled & not held",
      href: "/admin/meetings?scope=upcoming",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          tone="blue"
          label="Startups"
          value={kpis.startupsTotal}
          hint={`${kpis.startupsLive} live · ${kpis.startupsTermSheet} term sheet`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          tone="lavender"
          label="Investors"
          value={kpis.investorsTotal}
          hint={`${kpis.investorsActive} active`}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          tone="mint"
          label="Matches"
          value={kpis.matchesTotal.toLocaleString("en-IN")}
          hint={`${kpis.matchesQueued} queued`}
          icon={<Handshake className="h-4 w-4" />}
        />
        <StatCard
          tone="cream"
          label="Meetings"
          value={kpis.meetingsTotal.toLocaleString("en-IN")}
          hint={`${kpis.meetingsUpcoming} upcoming`}
          icon={<CalendarClock className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Startups by status"
            subtitle="Current pipeline distribution"
            action={
              <Link
                href="/admin/reports"
                className="rounded-full border border-navy-100 px-3 py-1 text-xs font-medium text-navy-600 hover:bg-navy-50"
              >
                All reports
              </Link>
            }
          />
          <CardBody>
            <SimpleBarChart data={statusDist} xKey="status" yKey="count" height={260} />
          </CardBody>
        </Card>

        <div className="flex flex-col justify-between rounded-2xl bg-navy-950 p-6 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-300">
              Operations desk
            </p>
            <h3 className="mt-2 text-xl font-bold leading-snug">
              Keep founders moving this week
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-300">
              {profilesWaiting
                ? `${profilesWaiting} profile${profilesWaiting === 1 ? "" : "s"} waiting for review.`
                : "No profiles waiting for review."}{" "}
              {kpis.matchesQueued
                ? `${kpis.matchesQueued.toLocaleString("en-IN")} matches queued to send.`
                : ""}
            </p>
          </div>
          <div className="mt-6 space-y-2">
            <QuickAction href="/admin/notifications" icon={Mail} label="Email startups" />
            <QuickAction href="/admin/profiles" icon={ClipboardCheck} label="Review profiles" />
            <QuickAction href="/admin/users" icon={KeyRound} label="Users & access" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Needs attention" subtitle="Where the desk should look next" />
          <CardBody className="p-2 pt-3">
            <ul className="divide-y divide-navy-50">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link
                    href={a.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-navy-50/70"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700">
                      <a.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-navy-900">{a.label}</span>
                      <span className="block text-xs text-navy-400">{a.hint}</span>
                    </span>
                    <span className="text-lg font-bold tabular-nums text-navy-950">{a.value}</span>
                    <ChevronRight className="h-4 w-4 text-navy-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Startups by bucket" subtitle="Priority tiers" />
          <CardBody>
            <SimpleBarChart
              data={bucketDist}
              xKey="bucket"
              yKey="count"
              color="#6887b8"
              height={240}
            />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Recently added startups"
            action={<ViewAll href="/admin/startups" />}
          />
          <CardBody className="p-0 pt-2">
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
                          className="font-medium text-navy-900 hover:underline"
                        >
                          {s.name ?? `#${s.id}`}
                        </Link>
                      </TD>
                      <TD className="text-navy-500">{s.sector ?? "—"}</TD>
                      <TD>
                        <StatusBadge value={s.status} kind="startup" />
                      </TD>
                      <TD className="text-navy-500">{formatDate(s.created_at)}</TD>
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
            action={<ViewAll href="/admin/meetings" />}
          />
          <CardBody className="p-0 pt-2">
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
                      <TD className="font-medium text-navy-900">{m.startup_name ?? "—"}</TD>
                      <TD className="text-navy-500">{m.investor_name ?? "—"}</TD>
                      <TD className="text-navy-500">{formatDateTime(m.scheduled_at)}</TD>
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

function ViewAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-900"
    >
      View all <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12]"
    >
      <Icon className="h-4 w-4 text-navy-300" />
      <span className="flex-1">{label}</span>
      <ArrowRight className="h-4 w-4 text-navy-400" />
    </Link>
  );
}
