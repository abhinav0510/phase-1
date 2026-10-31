import { Target, Wallet, TrendingUp, Flame, PencilLine, CheckCircle2, CircleAlert } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnStartup, getOwnFunding, getOwnProfile } from "@/server/data/founder";
import { PAST_YEARS, PROJECTED_YEARS, isFilled, type FinancialYear } from "@/shared/lib/profile-fields";
import {
  KpiCard,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Chip,
  FieldRow,
  Note,
  ButtonLink,
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/client/components/founder/ui";
import { Stagger, Item, Reveal, ProgressBar } from "@/client/components/founder/motion";
import { formatCr, formatLakh, formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const FINANCIALS_FORM = "/complete-profile#section-financials";

function ChecklistItem({ done, title, detail }: { done: boolean; title: string; detail: string }) {
  const Icon = done ? CheckCircle2 : CircleAlert;
  return (
    <li className="flex items-start gap-2.5 rounded-2xl bg-white/80 px-4 py-3">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${done ? "text-leaf-600" : "text-amber-600"}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-tide">{title}</p>
        <p className="mt-0.5 text-xs text-tide/65">{detail}</p>
      </div>
    </li>
  );
}

export default async function Financials() {
  const { startupId } = await requireFounder();
  const [s, funding, profile] = await Promise.all([
    getOwnStartup(startupId),
    getOwnFunding(startupId),
    getOwnProfile(startupId),
  ]);
  const answers = profile?.answers ?? {};
  const filled = (years: FinancialYear[]) => years.filter((y) => isFilled(answers[y.key])).length;
  const hasArr = isFilled(answers.revenue_inr_l) || isFilled(s?.revenue_inr_l);
  const pastDone = filled(PAST_YEARS);
  const projectedDone = filled(PROJECTED_YEARS);
  const yearRows = [
    ...PAST_YEARS.map((y) => ({ ...y, kind: "Actual" as const })),
    ...PROJECTED_YEARS.map((y) => ({ ...y, kind: "Projected" as const })),
  ];
  const runway = s?.runway_months ?? null;
  const runwayPct = runway ? Math.max(4, Math.min(100, Math.round((runway / 24) * 100))) : 0;
  const runwayTone = runway === null ? "neutral" : runway >= 12 ? "good" : runway >= 6 ? "neutral" : "bad";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Numbers on record"
        title="Financials"
        subtitle="The latest figures Sidana has on file for your raise."
        actions={
          <ButtonLink href={FINANCIALS_FORM} variant="ghost">
            <PencilLine className="h-4 w-4" /> Update via profile
          </ButtonLink>
        }
      />

      <Reveal>
        <div id="annual-numbers" className="rounded-[20px] bg-gradient-to-br from-ocean-100 via-ocean-50 to-leaf-100 p-5 ring-1 ring-ocean-200/60">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="text-base font-semibold text-tide">Report your revenue annually, as ARR</h2>
              <p className="mt-1 text-sm text-tide/70">
                Always give the full-year figure, not a monthly one. If you bill monthly, multiply by 12. Investors also
                expect your previous years&apos; records and your projections, so please add those too.
              </p>
            </div>
            <ButtonLink href={FINANCIALS_FORM}>
              <PencilLine className="h-4 w-4" /> Add your financials
            </ButtonLink>
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            <ChecklistItem
              done={hasArr}
              title="Annual revenue (ARR)"
              detail={hasArr ? "On file. Check it is the yearly figure." : "Required. Enter 0 if pre-revenue."}
            />
            <ChecklistItem
              done={pastDone === PAST_YEARS.length}
              title="Previous years' records"
              detail={`${pastDone} of ${PAST_YEARS.length} added: ${PAST_YEARS[0].label} to ${PAST_YEARS[PAST_YEARS.length - 1].label}`}
            />
            <ChecklistItem
              done={projectedDone === PROJECTED_YEARS.length}
              title="Projections"
              detail={`${projectedDone} of ${PROJECTED_YEARS.length} added: ${PROJECTED_YEARS[0].label} to ${PROJECTED_YEARS[PROJECTED_YEARS.length - 1].label}`}
            />
          </ul>
        </div>
      </Reveal>

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Item>
          <KpiCard
            tone="accent"
            label="Current ask"
            value={s?.ask_as_written ?? formatCr(s?.ask_amount ?? s?.ask_current_cr)}
            icon={<Target className="h-4 w-4" />}
            hint={s?.ask_updated_on ? `Updated ${formatDate(s.ask_updated_on)}` : "As recorded with Sidana"}
          />
        </Item>
        <Item>
          <KpiCard
            label="Allocation left"
            value={s?.allocation_left_as_written ?? formatCr(s?.allocation_left_amount)}
            icon={<Wallet className="h-4 w-4" />}
            hint={s?.allocation_updated_on ? `Updated ${formatDate(s.allocation_updated_on)}` : "Of the current round"}
          />
        </Item>
        <Item>
          <KpiCard label="Annual revenue (ARR)" value={formatLakh(s?.revenue_inr_l)} icon={<TrendingUp className="h-4 w-4" />} hint={s?.revenue_note ? "See note below" : "Latest on record"} />
        </Item>
        <Item>
          <KpiCard
            label="Monthly burn"
            value={formatLakh(s?.burn_inr_l)}
            icon={<Flame className="h-4 w-4" />}
            delta={{ text: runway ? `${runway} mo runway` : "Runway unknown", tone: runwayTone, arrow: runway ? (runway >= 12 ? "up" : "down") : "flat" }}
            visual={<ProgressBar pct={runwayPct} className="h-1.5 w-full overflow-hidden rounded-full bg-navy-100" barClassName={`h-full rounded-full ${runway === null ? "bg-navy-200" : runway >= 12 ? "bg-emerald-500" : runway >= 6 ? "bg-amber-500" : "bg-red-500"}`} />}
          />
        </Item>
      </Stagger>

      <Reveal>
        <Card>
          <CardHeader title="Financial indicators" subtitle="Sources and timestamps for each figure" />
          <CardBody className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldRow label="Runway" value={runway ? `${runway} months` : "—"} />
            <FieldRow label="Ask source" value={s?.ask_source} />
            <FieldRow label="Ask updated" value={formatDate(s?.ask_updated_on)} />
            <FieldRow label="Allocation source" value={s?.allocation_source} />
            <FieldRow label="Allocation updated" value={formatDate(s?.allocation_updated_on)} />
            <FieldRow label="Score" value={s?.score?.toString()} />
            <FieldRow label="Revenue note" value={<span className="whitespace-pre-wrap font-normal text-navy-700">{s?.revenue_note || "—"}</span>} wide />
          </CardBody>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader title="Revenue by year" subtitle="As you entered it, reviewed by the Sidana team" />
          <CardBody className="p-0 pt-2">
            {pastDone + projectedDone === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No yearly numbers added yet"
                  message="Add your previous years' revenue and your projections, and they will appear here."
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Financial year</TH>
                    <TH>Type</TH>
                    <TH>Revenue</TH>
                  </tr>
                </THead>
                <TBody>
                  {yearRows.map((y) => (
                    <TR key={y.key}>
                      <TD className="font-semibold text-tide">{y.label}</TD>
                      <TD>
                        <Chip tone={y.kind === "Actual" ? "green" : "blue"}>{y.kind}</Chip>
                      </TD>
                      <TD className="text-navy-700">
                        {isFilled(answers[y.key]) ? formatLakh(Number(answers[y.key])) : "Not added"}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader title="Funding rounds" subtitle="Closed rounds on record" />
          <CardBody className="p-0 pt-2">
            {funding.length === 0 ? (
              <div className="p-5">
                <EmptyState title="No funding rounds recorded yet" message="Closed rounds will appear here as they are logged." />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Round</TH>
                    <TH>Amount</TH>
                    <TH>Lead</TH>
                    <TH>Closed</TH>
                  </tr>
                </THead>
                <TBody>
                  {funding.map((f: any) => (
                    <TR key={f.id}>
                      <TD className="font-semibold text-tide">{f.round_name ?? f.instrument ?? "Round"}</TD>
                      <TD className="text-navy-700">{f.as_written ?? formatCr(f.amount)}</TD>
                      <TD className="text-navy-500">{f.lead_investor_name ?? "—"}</TD>
                      <TD className="text-navy-500">{formatDate(f.closed_on)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </Reveal>

      <Note>
        Figures shown are the latest on record with Sidana. To update your annual revenue, burn, runway or your round, use{" "}
        <strong>Update via profile</strong>. The Sidana team reviews every update before it is used for matching.
      </Note>
    </div>
  );
}
