import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileBarChart,
  Handshake,
  ImagePlus,
  Target,
  Wallet,
} from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import {
  Card,
  CardHeader,
  CardBody,
  KpiCard,
  Chip,
  ButtonLink,
  EmptyState,
  ViewAll,
  Avatar,
  CompanyLogo,
  STARTUP_STATUS_TONE,
  label,
} from "@/client/components/founder/ui";
import { Stagger, Item, Reveal, ProgressBar } from "@/client/components/founder/motion";
import { ListDetail, type ListItem, type DetailSpec } from "@/client/components/founder/list-detail";
import { JoinLink } from "@/client/components/ui/join-link";
import {
  getFounderOverview,
  getOwnMeetings,
  getOwnMatches,
  getOwnProfile,
  getOwnWeeklyReports,
  getOwnBranding,
  logoUrlFor,
} from "@/server/data/founder";
import { profileProgress } from "@/shared/lib/profile-fields";
import { ProfileNudge } from "./_components/profile-nudge";
import { cn, formatCr, formatLakh, formatDate } from "@/shared/lib/utils";
import { ActivityBars, Donut } from "./_components/charts";
import { SERIES } from "./_components/palette";
import { Gauge, IconDisc, MeterRow, Ring } from "./_components/visuals";
import {
  activityFeed,
  investorMix,
  matchStateSlices,
  pipelineStages,
  relativeTime,
  weekPoints,
  type ActivityKind,
} from "./_components/model";

export const dynamic = "force-dynamic";

const ACTIVITY_META: Record<
  ActivityKind,
  { tone: "navy" | "teal" | "coral" | "gold"; Icon: typeof Handshake }
> = {
  match: { tone: "navy", Icon: Handshake },
  meeting: { tone: "teal", Icon: CalendarClock },
  held: { tone: "coral", Icon: CheckCircle2 },
  report: { tone: "gold", Icon: FileBarChart },
};

const STAGE_BLURB: Record<string, string> = {
  matched: "Investors our engine fit to you",
  queued: "Lined up for outreach",
  sent: "Introduced by Sidana",
  meetings: "Calls on the calendar",
  held: "Conversations completed",
};

export default async function FounderDashboard() {
  const { startupId } = await requireFounder();
  const [overview, meetings, matches, weeklyReports, profile, branding] = await Promise.all([
    getFounderOverview(startupId),
    getOwnMeetings(startupId),
    getOwnMatches(startupId),
    getOwnWeeklyReports(startupId),
    getOwnProfile(startupId),
    getOwnBranding(startupId),
  ]);
  const s = overview.startup;
  const logoUrl = logoUrlFor(branding);
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
    overview.matchCount > 0 ? Math.round((overview.matchSent / overview.matchCount) * 100) : 0;

  const askValue = s?.ask_as_written ?? formatCr(s?.ask_amount ?? s?.ask_current_cr);
  const allocValue = s?.allocation_left_as_written ?? formatCr(s?.allocation_left_amount);
  const todayLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const pipelineItems: ListItem[] = stages.map((st) => ({
    id: st.key,
    title: st.label,
    subtitle: STAGE_BLURB[st.key],
    avatar: st.label,
    value: String(st.count),
  }));
  const pipelineDetails: Record<string, DetailSpec> = Object.fromEntries(
    stages.map((st) => [
      st.key,
      {
        eyebrow: "Pipeline stage",
        heading: st.label,
        aside: { label: st.count === 1 ? "Investor" : "Investors", value: String(st.count) },
        stats: [
          { label: "Of all matches", value: matches.length ? `${Math.round((st.count / matches.length) * 100)}%` : "—" },
          { label: "Named here", value: String(st.names.length) },
          { label: "Total matches", value: String(matches.length) },
        ],
        lists: [{ title: "Investors", items: st.names.slice(0, 12), empty: "No investors at this stage yet." }],
        action: { label: st.key === "meetings" || st.key === "held" ? "See meetings" : "See all matches", href: st.key === "meetings" || st.key === "held" ? "/meetings" : "/funding" },
      } satisfies DetailSpec,
    ]),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div className="flex min-w-0 items-center gap-4">
          {logoUrl ? (
            <CompanyLogo src={logoUrl} name={s?.name} size="xl" />
          ) : (
            <Link
              href="/profile#logo"
              title="Add your company logo"
              className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-[20px] border-2 border-dashed border-navy-200 bg-white text-navy-400 transition hover:border-ocean-600 hover:bg-ocean-50 hover:text-ocean-600"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Add logo</span>
            </Link>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ocean-600">{todayLabel}</p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-tight text-tide md:text-[30px]">
              Welcome back, {s?.name ?? "founder"}
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              Here&apos;s where your raise stands today
              {s?.sector || s?.stage ? <> · {[s?.sector, s?.stage].filter(Boolean).join(" · ")}</> : null}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s?.status ? <Chip tone={STARTUP_STATUS_TONE[s.status] ?? "neutral"}>{label(s.status)}</Chip> : null}
          {progress.pct < 100 ? (
            <ButtonLink href="/complete-profile">
              Complete profile <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          ) : (
            <ButtonLink href="/funding">
              View matches <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          )}
        </div>
      </div>

      <ProfileNudge
        pct={progress.pct}
        missing={progress.missing.map((f) => ({ label: f.label, matching: !!f.matching }))}
        status={profile?.status ?? null}
        reviewNote={profile?.review_note ?? null}
      />

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Item>
          <KpiCard
            label="Current ask"
            value={askValue}
            icon={<Target className="h-4 w-4" />}
            hint={s?.ask_updated_on ? `Updated ${formatDate(s.ask_updated_on)}` : "As recorded with Sidana"}
          />
        </Item>
        <Item>
          <KpiCard
            label="Allocation left"
            value={allocValue}
            icon={<Wallet className="h-4 w-4" />}
            hint={s?.allocation_updated_on ? `Updated ${formatDate(s.allocation_updated_on)}` : "Of the current round"}
          />
        </Item>
        <Item>
          <KpiCard
            label="Investor matches"
            value={overview.matchCount}
            icon={<Handshake className="h-4 w-4" />}
            delta={{ text: `${overview.matchSent} reached out`, tone: overview.matchSent ? "good" : "neutral", arrow: overview.matchSent ? "up" : "flat", hint: `${reachedPct}% contacted` }}
            visual={
              <div className="flex items-center gap-3">
                <Ring pct={reachedPct} color={SERIES.navy} size={44} />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100">
                  <ProgressBar pct={reachedPct} className="h-1.5 w-full" barClassName="h-full rounded-full bg-ocean-600" />
                </div>
              </div>
            }
          />
        </Item>
        <Item>
          <KpiCard
            tone="dark"
            label="Meetings"
            value={meetings.length}
            icon={<CalendarClock className="h-4 w-4" />}
            delta={{ text: `${overview.meetingsUpcoming} upcoming`, tone: overview.meetingsUpcoming ? "good" : "neutral", arrow: overview.meetingsUpcoming ? "up" : "flat", hint: `${overview.meetingsHeld} held` }}
            visual={
              upcoming[0] ? (
                <p className="truncate text-xs text-tide/60">
                  Next: <span className="font-semibold text-tide">{upcoming[0].investor_name ?? "Investor"}</span>{" "}
                  · {relativeTime(new Date(upcoming[0].scheduled_at!), now)}
                </p>
              ) : (
                <p className="text-xs text-tide/55">No meeting on the calendar yet.</p>
              )
            }
          />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Outreach pipeline"
          subtitle="Investors Sidana has matched, contacted and met for you"
          listLabel="Stages"
          items={pipelineItems}
          details={pipelineDetails}
          emptyTitle="No pipeline yet"
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal>
          <Card className="h-full">
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
                        <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-tide">
                          {sl.value}
                          <span className="font-normal text-navy-400">
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
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader
              title="Weekly activity"
              subtitle={latestReport ? `Latest week ${formatDate(latestReport.week_start)}` : "From your Saturday reports"}
              action={<ViewAll href="/weekly-reports" />}
            />
            <CardBody className="pb-3">
              {weeks.length === 0 ? (
                <EmptyState title="No weekly reports yet" message="Your first report lands after the next Saturday run." />
              ) : (
                <ActivityBars data={weeks} />
              )}
            </CardBody>
          </Card>
        </Reveal>

        <Reveal delay={0.16}>
          <Card className="h-full">
            <CardHeader title="Upcoming meetings" action={<ViewAll href="/meetings" />} />
            <CardBody className="p-2 pt-3">
              {upcoming.length === 0 ? (
                <div className="p-3">
                  <EmptyState title="No upcoming meetings" />
                </div>
              ) : (
                <ul className="space-y-1">
                  {upcoming.map((m) => {
                    const d = new Date(m.scheduled_at!);
                    return (
                      <li key={m.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-canvas">
                        <div className="w-14 shrink-0 text-xs font-semibold text-tide">
                          {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          <div className="text-[10px] font-normal text-navy-400">
                            {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </div>
                        </div>
                        <Avatar name={m.investor_name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-tide">{m.investor_name ?? "Investor"}</p>
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
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Reveal>
          <Card className="h-full">
            <CardHeader title="Recent activity" subtitle="Matches, meetings and reports as they happen" />
            <CardBody className="pt-3">
              {feed.length === 0 ? (
                <EmptyState title="Nothing yet" message="Activity shows up here as Sidana works your raise." />
              ) : (
                <ol className="relative space-y-4">
                  <span className="absolute left-[17px] top-3 h-[calc(100%-1.5rem)] w-px bg-navy-100" aria-hidden="true" />
                  {feed.map((e) => {
                    const meta = ACTIVITY_META[e.kind];
                    return (
                      <li key={e.id} className="relative flex items-start gap-3">
                        <IconDisc tone={meta.tone} size="sm">
                          <meta.Icon className="h-4 w-4" />
                        </IconDisc>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-tide">{e.detail}</p>
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
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader
              title="Profile completeness"
              subtitle="Fields Sidana uses to match you"
              action={<ViewAll href="/complete-profile" label={progress.pct < 100 ? "Complete" : "Review"} />}
            />
            <CardBody>
              <Gauge pct={progress.pct} color={SERIES.navy} label="of profile complete" />
              <p className="mt-3 text-center text-xs text-navy-500">
                {progress.done} of {progress.total} details on file
              </p>
              <div className="mt-5 border-t border-navy-50 pt-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-navy-400">Investor mix</p>
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
        </Reveal>

        <Reveal delay={0.16}>
          <Card className="h-full">
            <CardHeader title="Snapshot" subtitle="Key financials on record" action={<ViewAll href="/financials" />} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Annual revenue (ARR)" value={formatLakh(s?.revenue_inr_l)} />
                <Metric label="Burn" value={formatLakh(s?.burn_inr_l)} />
                <Metric label="Score" value={s?.score?.toString() ?? "—"} />
                <Metric label="Rule tier" value={s?.rule_tier ?? "—"} />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-xs text-navy-400">Runway</p>
                  <p className="text-sm font-semibold text-tide">
                    {s?.runway_months ? `${s.runway_months} months` : "—"}
                  </p>
                </div>
                <RunwayMeter months={s?.runway_months ?? null} />
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-leaf-50 px-4 py-3 text-tide ring-1 ring-leaf-100">
                <Avatar name={s?.owner_name ?? "Sidana"} size="sm" />
                <div className="min-w-0">
                  <p className="text-[11px] text-tide/55">Your Sidana contact</p>
                  <p className="truncate text-sm font-semibold">{s?.owner_name ?? "Sidana deal desk"}</p>
                </div>
              </div>
              {latestReport ? (
                <div className="border-t border-navy-50 pt-4">
                  <p className="text-xs text-navy-400">Latest report · week of {formatDate(latestReport.week_start)}</p>
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
        </Reveal>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas px-3 py-2.5">
      <p className="text-[11px] text-navy-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-tide">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-bold leading-tight text-tide">{value}</p>
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
    <ProgressBar
      pct={pct}
      className="mt-2 h-2 w-full overflow-hidden rounded-full bg-navy-100"
      barClassName={cn("h-full rounded-full", tone)}
    />
  );
}
