import { notFound } from "next/navigation";
import { ExternalLink, Repeat, TrendingUp, Users } from "lucide-react";
import { requireInvestor } from "@/server/auth/session";
import { canViewStartup } from "@/server/data/investor/matches";
import { getListedStartups } from "@/server/data/investor/thesis";
import { getStartupForInvestor } from "@/server/data/investor/profile";
import { getInterests, getInvestorMeetings } from "@/server/data/investor/engagement";
import { chatAllowed } from "@/server/data/chat";
import { currentMetrics, getPasses } from "@/server/data/investor/signals";
import { Card, CardBody, CardHeader, Chip, CompanyLogo, KpiCard, PageHeader, buttonClass } from "@/client/components/founder/ui";
import { Item, Stagger } from "@/client/components/founder/motion";
import { allocationDisplay, askDisplay, formatRupees } from "@/shared/lib/currency";
import { formatDate, formatDateTime } from "@/shared/lib/utils";
import { RevenueExpensesChart, YearlyRevenueChart } from "@/app/(founder)/financials/_components/financial-charts";
import { latestMrr, monthLabel, monthlySeries, yearRows, yearSeries } from "@/app/(founder)/financials/_components/financials-model";
import { SOURCE_HINT } from "@/shared/lib/startup-facts";
import { formatLakh } from "@/shared/lib/utils";
import { ProfileActions } from "./profile-actions";

export const dynamic = "force-dynamic";

/** Full startup profile for an investor (clause 2.5). 404 unless the investor may see it. */
export default async function InvestorStartup({ params }: { params: Promise<{ id: string }> }) {
  const { investorId } = await requireInvestor();
  const startupId = Number((await params).id);
  if (!Number.isInteger(startupId) || startupId <= 0) notFound();
  if (!(await canViewStartup(investorId, startupId))) notFound();

  const [p, interests, meetings, canChat, passes, metrics, listed] = await Promise.all([
    getStartupForInvestor(startupId),
    getInterests(investorId),
    getInvestorMeetings(investorId),
    chatAllowed(investorId, startupId),
    getPasses(investorId),
    currentMetrics(startupId),
    getListedStartups(),
  ]);
  if (!p) notFound();
  const codes = listed.find((x) => x.id === startupId);
  const s = p.startup;
  const name = s.name ?? "Startup";
  const next = meetings
    .filter((m) => m.startup_id === startupId && !!m.scheduled_at && Date.parse(m.scheduled_at) > Date.now())
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!))[0];
  const series = monthlySeries(p.months, 12);
  const years = yearRows(p.years, p.profileYear);
  const yearPoints = yearSeries(years);
  const mrr = latestMrr(p.months);
  // ARR as every portal shows it: the founder's uploads, else their answer, else Sidana's record.
  const arr = {
    value: s.revenue_inr_l != null ? formatLakh(Number(s.revenue_inr_l)) : "—",
    hint: s.facts.arr.from ? `${SOURCE_HINT[s.facts.arr.source]}: ${s.facts.arr.from}` : SOURCE_HINT[s.facts.arr.source],
  };
  const logo = p.logoVersion ? `/api/investor/logo/${startupId}?v=${encodeURIComponent(p.logoVersion)}` : null;

  return (
    <div className="space-y-5">
      <PageHeader
        back="/investor/matches"
        eyebrow={[s.sector, s.stage].filter(Boolean).join(" · ") || "Startup"}
        title={
          <span className="flex items-center gap-3">
            <CompanyLogo src={logo} name={name} size="lg" />
            {name}
          </span>
        }
        subtitle={p.oneLiner ?? undefined}
      />

      <ProfileActions
        startupId={startupId}
        startupName={name}
        interested={interests.has(startupId)}
        upcoming={next ? { when: formatDateTime(next.scheduled_at), link: next.meet_link } : null}
        canChat={canChat}
        passed={passes.some((x) => x.startup_id === startupId)}
        passTarget={{
          startupId,
          startupName: name,
          sectorCodes: codes?.sector_codes ?? [],
          stageCode: codes?.stage_code ?? null,
          revenueL: s.revenue_inr_l == null ? null : Number(s.revenue_inr_l),
          metrics,
        }}
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Item>
          <KpiCard tone="accent" label="Raising" value={askDisplay(s)} hint={s.stage ?? undefined} />
        </Item>
        <Item>
          <KpiCard label="Room left" value={allocationDisplay(s)} hint="In the current round" />
        </Item>
        <Item>
          <KpiCard label="Revenue (ARR)" value={arr.value} icon={<TrendingUp className="h-4 w-4" />} hint={arr.hint} />
        </Item>
        <Item>
          <KpiCard label="Investors interested" value={p.interestedCount} icon={<Users className="h-4 w-4" />} hint="Meetings held and coming up" />
        </Item>
      </Stagger>

      {p.source === "founder" && p.updatedAt ? (
        <p className="text-xs text-navy-500">Profile written by the founder · last updated {formatDate(p.updatedAt)}</p>
      ) : null}
      {p.source === "memo" ? (
        <Card>
          <CardBody className="text-sm text-navy-500">
            From Sidana&apos;s deal memo. The founder&apos;s own profile and figures replace it as soon as they add them.
          </CardBody>
        </Card>
      ) : !p.source ? (
        <Card>
          <CardBody className="text-sm text-navy-500">Full profile coming soon. Sidana is reviewing the founder&apos;s details.</CardBody>
        </Card>
      ) : null}

      {p.description ? (
        <Card>
          <CardHeader title="Overview" />
          <CardBody className="pt-2">
            <p className="whitespace-pre-line text-sm leading-relaxed text-navy-700">{p.description}</p>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {p.sections.map((sec) => (
          <Card key={sec.key}>
            <CardHeader title={sec.title} />
            <CardBody className="pt-2">
              <dl className="space-y-3">
                {sec.rows.map((r) => (
                  <div key={r.label}>
                    <dt className="text-xs font-medium text-navy-500">{r.label}</dt>
                    <dd className={r.long ? "mt-0.5 whitespace-pre-line text-sm text-navy-800" : "mt-0.5 text-sm font-medium text-navy-800"}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
        ))}
      </div>

      {mrr ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard
            label="Monthly revenue (MRR)"
            value={formatLakh(mrr.value)}
            icon={<Repeat className="h-4 w-4" />}
            hint={`${monthLabel(mrr.month)}${mrr.growthPct != null && mrr.growthPct > 0 ? `, up ${mrr.growthPct}% on the month before` : ""}, from the founder's figures`}
          />
          <KpiCard label="Months of figures" value={p.months.length} hint={p.months.length ? `${monthLabel(p.months[0].month)} to ${monthLabel(p.months.at(-1)!.month)}` : ""} />
        </div>
      ) : null}

      {series.length >= 2 ? (
        <Card>
          <CardHeader title="Monthly revenue vs expenses" subtitle="The last 12 months, in ₹ lakh, as uploaded by the founder" />
          <CardBody>
            <RevenueExpensesChart data={series} />
          </CardBody>
        </Card>
      ) : null}

      {years.length ? (
        <Card>
          <CardHeader title="Revenue by year" subtitle="Actual years and the founder's projections, in ₹ lakh" />
          {yearPoints.length >= 2 ? (
            <CardBody>
              <YearlyRevenueChart data={yearPoints} />
            </CardBody>
          ) : null}
          <CardBody className="pt-2">
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <span key={`${y.fy_start}-${y.kind}`} className="rounded-xl bg-navy-50/70 px-3 py-2 text-xs text-navy-600">
                  <b className="text-tide">{y.label}</b> · {formatLakh(y.revenue)} · {y.kind === "actual" ? "Actual" : "Projected"}
                  {(y.growthPct ?? 0) > 0 ? <span className="font-semibold text-emerald-600"> · +{y.growthPct}%</span> : null}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {p.rounds.length ? (
          <Card>
            <CardHeader title="Past rounds" />
            <CardBody className="space-y-2 pt-2">
              {p.rounds.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-navy-50/60 px-3 py-2 text-sm">
                  <span className="font-medium text-tide">{r.name}</span>
                  <span className="text-navy-500">{[r.amount, r.lead, r.closed_on ? formatDate(r.closed_on) : null].filter(Boolean).join(" · ")}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}
        {p.deckUrl && /^https?:\/\//i.test(p.deckUrl) ? (
          <Card>
            <CardHeader title="Pitch deck" />
            <CardBody className="pt-2">
              <a href={p.deckUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
                <ExternalLink className="h-4 w-4" /> Open the deck
              </a>
            </CardBody>
          </Card>
        ) : null}
      </div>

      <p className="flex flex-wrap items-center gap-2 text-xs text-navy-500">
        <Chip tone="neutral">Shared by Sidana Ventures</Chip>
        Need something specific? Reply to Sidana&apos;s email and the team will get it to you.
      </p>
    </div>
  );
}
