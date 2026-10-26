import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  FileBarChart,
  Handshake,
  Target,
  Wallet,
} from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/table";
import {
  getFounderOverview,
  getOwnMeetings,
  getOwnMatches,
  getOwnProfile,
  getOwnWeeklyReports,
} from "@/lib/data/founder";
import { profileProgress } from "@/lib/profile/fields";
import { ProfileNudge } from "./_components/profile-nudge";
import { JoinLink } from "@/components/ui/join-link";
import { cn, formatCr, formatLakh, formatDate } from "@/lib/utils";
import { ActivityBars, Donut } from "./_components/charts";
import { SERIES } from "./_components/palette";
import { Gauge, IconDisc, MeterRow, Ring } from "./_components/visuals";
import {
  activityFeed,
  initialsOf,
  investorMix,
  matchStateSlices,
  pipelineStages,
  relativeTime,
  weekPoints,
  type ActivityKind,
} from "./_components/model";

export const dynamic = "force-dynamic";

// Ordinal navy ramp for the pipeline chevrons (validated light→dark).
const STAGE_RAMP = ["#98afd0", "#6887b8", "#476aa0", "#2d436c", "#141f35"];

const ACTIVITY_META: Record<
  ActivityKind,
  { tone: "navy" | "teal" | "coral" | "gold"; Icon: typeof Handshake }
> = {
  match: { tone: "navy", Icon: Handshake },
  meeting: { tone: "teal", Icon: CalendarClock },
  held: { tone: "coral", Icon: CheckCircle2 },
  report: { tone: "gold", Icon: FileBarChart },
};

export default async function FounderDashboard() {
  const { startupId } = await requireFounder();
  const [overview, meetings, matches, weeklyReports, profile] = await Promise.all([
    getFounderOverview(startupId),
    getOwnMeetings(startupId),
    getOwnMatches(startupId),
    getOwnWeeklyReports(startupId),
    getOwnProfile(startupId),
  ]);
  const s = overview.startup;
  const progress = profileProgress(s, profile?.answers ?? null);
  const now = new Date();
  const latestReport = weeklyReports[0] ?? null;
  const upcoming = meetings
    .filter((m) => m.scheduled_at && new Date(m.scheduled_at) >= now && !m.held)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
    .slice(0, 5);

  const stages = pipelineStages(matches, meetings);
  const slices = matchStateSlices(matches);
  const mix = investorMix(matches);
  const mixMax = Math.max(1, ...mix.map((m) => m.value));
  const weeks = weekPoints(weeklyReports);
  const feed = activityFeed(matches, meetings, weeklyReports, 5, now);
  const reachedPct =
    overview.matchCount > 0
      ? Math.round((overview.matchSent / overview.matchCount) * 100)
      : 0;

  const askValue = s?.ask_as_written ?? formatCr(s?.ask_amount ?? s?.ask_current_cr);
  const allocValue = s?.allocation_left_as_written ?? formatCr(s?.allocation_left_amount);
  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Greeting row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">
            Welcome back, {s?.name ?? "founder"}
          </h2>
          <p className="mt-1 text-sm text-navy-500">
            Here&apos;s where your raise stands today
            {s?.sector || s?.stage ? (
              <>
                {" · "}
                {[s?.sector, s?.stage].filter(Boolean).join(" · ")}
              </>
            ) : null}
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={s?.bucket} kind="bucket" />
          <StatusBadge value={s?.status} kind="startup" />
          <span className="inline-flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-3 py-2 text-xs font-medium text-navy-700 shadow-card">
            <CalendarDays className="h-4 w-4 text-navy-400" />
            {todayLabel}
          </span>
        </div>
      </div>

      <ProfileNudge
        pct={progress.pct}
        missing={progress.missing.map((f) => ({ label: f.label, matching: !!f.matching }))}
        status={profile?.status ?? null}
        reviewNote={profile?.review_note ?? null}
      />

      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          tone="gold"
          icon={<Target className="h-5 w-5" />}
          label="Current ask"
          value={askValue}
          hint={s?.ask_updated_on ? `Updated ${formatDate(s.ask_updated_on)}` : "As recorded with Sidana"}
        />
        <Kpi
          tone="navy"
          icon={<Wallet className="h-5 w-5" />}
          label="Allocation left"
          value={allocValue}
          hint={
            s?.allocation_updated_on
              ? `Updated ${formatDate(s.allocation_updated_on)}`
              : "Of the current round"
          }
        />
        <Kpi
          tone="teal"
          icon={<Handshake className="h-5 w-5" />}
          label="Investor matches"
          value={overview.matchCount}
          hint={`${overview.matchSent} reached out`}
          aside={<Ring pct={reachedPct} color={SERIES.teal} />}
          asideLabel={`${reachedPct}% contacted`}
        />
        <Kpi
          tone="coral"
          icon={<CalendarClock className="h-5 w-5" />}
          label="Meetings"
          value={meetings.length}
          hint={`${overview.meetingsUpcoming} upcoming · ${overview.meetingsHeld} held`}
        />
      </div>

      {/* Pipeline + profile gauge */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Outreach pipeline"
            subtitle="Investors Sidana has matched, contacted and met for you"
            action={<ViewAll href="/funding" />}
          />
          <CardBody>
            <div className="scroll-thin -mx-1 overflow-x-auto px-1 pb-1">
              <div className="grid min-w-[640px] grid-cols-5 gap-1">
                {stages.map((st, i) => (
                  <div key={st.key} className="min-w-0">
                    <div
                      className="relative h-12 text-white"
                      style={{
                        background: STAGE_RAMP[i],
                        clipPath:
                          i === 0
                            ? "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
                            : "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)",
                      }}
                    >
                      <div className={cn("flex h-full flex-col justify-center pr-4", i === 0 ? "pl-3" : "pl-5")}>
                        <span className="truncate text-xs font-semibold">{st.label}</span>
                        <span className="text-[11px] text-white/75">
                          {st.count} {st.count === 1 ? "investor" : "investors"}
                        </span>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-2 pl-1 pr-2">
                      {st.names.slice(0, 4).map((n, j) => (
                        <li key={`${st.key}-${j}`} className="flex items-center gap-2 text-xs text-navy-700">
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                            style={{ background: STAGE_RAMP[i] }}
                          >
                            {initialsOf(n)}
                          </span>
                          <span className="truncate">{n}</span>
                        </li>
                      ))}
                      {st.names.length === 0 ? (
                        <li className="text-xs text-navy-300">—</li>
                      ) : null}
                      {st.names.length > 4 ? (
                        <li className="text-[11px] text-navy-400">+{st.names.length - 4} more</li>
                      ) : null}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Profile completeness"
            subtitle="Fields Sidana uses to match you"
            action={
              <ViewAll href="/complete-profile" label={progress.pct < 100 ? "Complete" : "Review"} />
            }
          />
          <CardBody>
            <Gauge pct={progress.pct} label="of profile complete" />
            <p className="mt-3 text-center text-xs text-navy-500">
              {progress.done} of {progress.total} details on file
            </p>
            <div className="mt-6 border-t border-navy-100 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Investor mix
              </p>
              {mix.length === 0 ? (
                <p className="text-sm text-navy-400">No matches yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {mix.map((m) => (
                    <MeterRow key={m.label} label={m.label} value={m.value} max={mixMax} color={SERIES.navy} />
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Matches donut + weekly activity + upcoming meetings */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Matches by state" action={<ViewAll href="/funding" />} />
          <CardBody>
            {matches.length === 0 ? (
              <EmptyState title="No matches yet" message="As Sidana's match engine finds fits, they'll appear here." />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <Donut slices={slices} total={matches.length} centerLabel="matches" />
                <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-1">
                  {slices.map((sl) => (
                    <li key={sl.key} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sl.color }} />
                      <span className="flex-1 text-navy-700">{sl.label}</span>
                      <span className="whitespace-nowrap text-xs font-medium tabular-nums text-navy-800">
                        {sl.value}
                        <span className="text-navy-400">
                          {" "}
                          ({matches.length ? Math.round((sl.value / matches.length) * 100) : 0}%)
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Weekly activity"
            subtitle={latestReport ? `Latest week ${formatDate(latestReport.week_start)}` : "From your Saturday reports"}
            action={<ViewAll href="/weekly-reports" />}
          />
          <CardBody className="pb-3">
            {weeks.length === 0 ? (
              <EmptyState
                title="No weekly reports yet"
                message="Your first report lands after the next Saturday run."
              />
            ) : (
              <ActivityBars data={weeks} />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Upcoming meetings" action={<ViewAll href="/meetings" />} />
          <CardBody className="p-0">
            {upcoming.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No upcoming meetings" />
              </div>
            ) : (
              <ul className="divide-y divide-navy-50">
                {upcoming.map((m) => {
                  const d = new Date(m.scheduled_at!);
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-16 shrink-0 text-xs font-semibold text-navy-800">
                        {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        <div className="text-[10px] font-normal text-navy-400">
                          {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </div>
                      </div>
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                        style={{ background: SERIES.navy }}
                      >
                        {initialsOf(m.investor_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-navy-800">
                          {m.investor_name ?? "Investor"}
                        </p>
                        <p className="text-[11px] text-navy-400">
                          {m.is_second ? "Second meeting" : "Investor meeting"}
                          {m.source ? ` · ${m.source}` : ""}
                        </p>
                      </div>
                      <JoinLink href={m.meet_link} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Activity timeline + snapshot */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent activity" subtitle="Matches, meetings and reports as they happen" />
          <CardBody>
            {feed.length === 0 ? (
              <EmptyState title="Nothing yet" message="Activity shows up here as Sidana works your raise." />
            ) : (
              <ol className="relative grid grid-cols-1 gap-5 sm:grid-cols-5 sm:gap-3">
                <span
                  className="absolute left-[18px] top-2 h-[calc(100%-1rem)] w-px bg-navy-100 sm:left-[10%] sm:right-[10%] sm:top-[18px] sm:h-px sm:w-auto"
                  aria-hidden="true"
                />
                {feed.map((e) => {
                  const meta = ACTIVITY_META[e.kind];
                  return (
                    <li key={e.id} className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                      <IconDisc tone={meta.tone} size="sm">
                        <meta.Icon className="h-4 w-4" />
                      </IconDisc>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-navy-800">{e.detail}</p>
                        <p className="truncate text-xs text-navy-500">{e.title}</p>
                        <p className="mt-0.5 text-[11px] text-navy-400">{relativeTime(e.at, now)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Snapshot" subtitle="Key financials on record" action={<ViewAll href="/financials" />} />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Revenue" value={formatLakh(s?.revenue_inr_l)} />
              <Metric label="Burn" value={formatLakh(s?.burn_inr_l)} />
              <Metric label="Score" value={s?.score?.toString() ?? "—"} />
              <Metric label="Rule tier" value={s?.rule_tier ?? "—"} />
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-xs text-navy-400">Runway</p>
                <p className="text-sm font-semibold text-navy-800">
                  {s?.runway_months ? `${s.runway_months} months` : "—"}
                </p>
              </div>
              <RunwayMeter months={s?.runway_months ?? null} />
            </div>
            <div className="rounded-lg bg-navy-50 px-4 py-3">
              <p className="text-xs text-navy-400">Your Sidana contact</p>
              <p className="mt-0.5 text-sm font-medium text-navy-800">{s?.owner_name ?? "Sidana deal desk"}</p>
            </div>
            {latestReport ? (
              <div className="border-t border-navy-100 pt-4">
                <p className="text-xs text-navy-400">
                  Latest report · week of {formatDate(latestReport.week_start)}
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                  <Mini label="Reached" value={latestReport.reached} />
                  <Mini label="Follow-ups" value={latestReport.followups} />
                  <Mini label="Meetings" value={latestReport.meetings} />
                  <Mini label="Passed" value={latestReport.passed} />
                </div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  tone,
  icon,
  label,
  value,
  hint,
  aside,
  asideLabel,
}: {
  tone: "gold" | "navy" | "teal" | "coral";
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  aside?: React.ReactNode;
  asideLabel?: string;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <IconDisc tone={tone}>{icon}</IconDisc>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-navy-500">{label}</p>
          <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-navy-900">{value}</p>
          {hint ? <p className="mt-0.5 text-[11px] text-navy-400">{hint}</p> : null}
        </div>
        {aside ? (
          <div className="flex shrink-0 flex-col items-center">
            {aside}
            {asideLabel ? <span className="mt-1 text-[10px] text-navy-400">{asideLabel}</span> : null}
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function ViewAll({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-900"
    >
      {label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-navy-100 px-3 py-2.5">
      <p className="text-[11px] text-navy-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-navy-800">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold leading-tight text-navy-900">{value}</p>
      <p className="text-[10px] text-navy-400">{label}</p>
    </div>
  );
}

/** Runway meter: status colour by months left (≥12 fine, 6–12 watch, <6 urgent). */
function RunwayMeter({ months }: { months: number | null }) {
  if (months === null || months === undefined) {
    return <div className="mt-2 h-2 w-full rounded-full bg-navy-100" />;
  }
  const pct = Math.max(4, Math.min(100, Math.round((months / 24) * 100)));
  const tone = months >= 12 ? "bg-emerald-500" : months >= 6 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-100">
      <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
    </div>
  );
}
