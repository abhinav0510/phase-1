import { TrendingUp, Repeat, PencilLine, CheckCircle2, CircleAlert } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnStartup, getOwnFunding, getOwnProfile } from "@/server/data/founder";
import { getFinancials } from "@/server/data/financials";
import { fundingDisplay } from "@/shared/lib/currency";
import { PAST_YEARS, arrDisplay, isFilled, mrrDisplay, type ArrDisplay, type FinancialYear } from "@/shared/lib/profile-fields";
import {
  KpiCard,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
  Chip,
  Note,
  ButtonLink,
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
  gainIf,
} from "@/client/components/founder/ui";
import { FinancialsUpload } from "./_components/financials-upload";
import { RevenueExpensesChart, YearlyRevenueChart } from "./_components/financial-charts";
import { fyLabel as fyLabelOf, latestMrr, monthLabel, monthlySeries, sheetAnswers, yearRows as buildYearRows, yearSeries } from "./_components/financials-model";
import { Stagger, Item, Reveal } from "@/client/components/founder/motion";
import { formatLakh, formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const FINANCIALS_FORM = "/profile#section-financials";

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

const ARR_HINT: Partial<Record<ArrDisplay["source"], string>> = {
  note: "From Sidana's records",
  founder: "As you entered it",
  none: "Not added yet",
};

export default async function Financials() {
  const { startupId } = await requireFounder();
  const [s, funding, profile, fin] = await Promise.all([
    getOwnStartup(startupId),
    getOwnFunding(startupId),
    getOwnProfile(startupId),
    getFinancials(startupId),
  ]);
  const answers = profile?.answers ?? {};
  const arr = arrDisplay(s, answers);
  const filled = (years: FinancialYear[]) => years.filter((y) => isFilled(answers[y.key])).length;
  // With nothing typed or on record, the ARR worked out from the uploaded figures counts.
  const sheetArr = arr.source === "none" ? sheetAnswers(fin.months, fin.years, PAST_YEARS[0]).revenue_inr_l : undefined;
  const hasArr = arr.source !== "none" || !!sheetArr;
  const mrr = mrrDisplay(s);
  // Uploaded figures lead; the profile's answer for last year fills in a year they don't cover.
  const lastYear = PAST_YEARS[0];
  const profileYear = isFilled(answers[lastYear.key])
    ? { fy_start: Number(lastYear.label.slice(3, 7)), revenue: Number(answers[lastYear.key]) }
    : null;
  const years = buildYearRows(fin.years, profileYear);
  // Last year counts as added whether it came from the profile or an upload.
  const pastDone = filled(PAST_YEARS) + PAST_YEARS.filter((y) => !isFilled(answers[y.key]) && fin.years.some((f) => f.kind === "actual" && fyLabelOf(f.fy_start) === y.label)).length;
  // The reminder goes once both checklist items are ticked, whatever the source: saved on
  // My Profile, on Sidana's record, or in the uploaded sheet.
  const financialsDone = hasArr && pastDone === PAST_YEARS.length;
  const yearPoints = yearSeries(years);
  const monthPoints = monthlySeries(fin.months);
  const latest = latestMrr(fin.months);
  const uploaded = fin.months.length + fin.years.length > 0;
  const summary = uploaded
    ? [
        fin.months.length ? `${fin.months.length} month${fin.months.length === 1 ? "" : "s"} (${monthLabel(fin.months[0].month)} to ${monthLabel(fin.months.at(-1)!.month)})` : null,
        fin.years.length ? `${fin.years.length} year${fin.years.length === 1 ? "" : "s"}` : null,
      ].filter(Boolean).join(" and ") + " on file from your last upload."
    : null;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Numbers on record"
        title="Financials"
        subtitle="Your revenue, monthly figures and funding rounds on record with Sidana."
      />

      {/* Shown until both checklist items below are ticked. */}
      {financialsDone ? null : (
        <Reveal>
          <div id="annual-numbers" className="rounded-[20px] bg-gradient-to-br from-ocean-100 via-ocean-50 to-leaf-100 p-5 ring-1 ring-ocean-200/60">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-base font-semibold text-tide">Report your revenue annually, as ARR</h2>
                <p className="mt-1 text-sm text-tide/70">
                  Always give the full-year figure, not a monthly one. If you bill monthly, multiply by 12. Investors also
                  expect last year&apos;s revenue, so please add that too.
                </p>
              </div>
              <ButtonLink href={FINANCIALS_FORM}>
                <PencilLine className="h-4 w-4" /> Add your financials
              </ButtonLink>
            </div>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              <ChecklistItem
                done={hasArr}
                title="Annual revenue (ARR)"
                detail={
                  sheetArr
                    ? "Worked out from your uploaded figures. Check it on My Profile, then save."
                    : hasArr
                      ? "On file. Check it is the yearly figure."
                      : "Required. Enter 0 if pre-revenue."
                }
              />
              <ChecklistItem
                done={pastDone === PAST_YEARS.length}
                title="Previous year's record"
                detail={`${pastDone === PAST_YEARS.length ? "Added" : "Not added yet"}: ${PAST_YEARS.map((y) => y.label).join(", ")}`}
              />
            </ul>
          </div>
        </Reveal>
      )}

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Item>
          <KpiCard
            label="Annual revenue (ARR)"
            value={
              sheetArr ? (
                formatLakh(Number(sheetArr.value))
              ) : arr.source === "note" ? (
                <span className="block whitespace-normal text-lg font-semibold leading-snug">{arr.value}</span>
              ) : (
                arr.value
              )
            }
            icon={<TrendingUp className="h-4 w-4" />}
            hint={sheetArr ? `From your uploaded figures: ${sheetArr.from}` : (ARR_HINT[arr.source] ?? arr.note ?? "Latest on record")}
          />
        </Item>
        <Item>
          {latest ? (
            <KpiCard
              label="Monthly revenue (MRR)"
              value={formatLakh(latest.value)}
              icon={<Repeat className="h-4 w-4" />}
              // A growth arrow only for good news, like every other indicator.
              delta={gainIf((latest.growthPct ?? 0) > 0, { text: `+${latest.growthPct}%`, hint: `on ${latest.previousMonth ? monthLabel(latest.previousMonth) : ""}` })}
              hint={`${monthLabel(latest.month)}, from your figures`}
            />
          ) : (
            <KpiCard
              label="Monthly revenue (MRR)"
              value={mrr.value}
              icon={<Repeat className="h-4 w-4" />}
              hint={mrr.source === "note" ? "From Sidana's records" : "Not on record"}
            />
          )}
        </Item>
      </Stagger>

      <Reveal>
        <FinancialsUpload ready={fin.ready} summary={summary} />
      </Reveal>

      {monthPoints.length >= 2 ? (
        <Reveal>
          <Card>
            <CardHeader title="Monthly revenue vs expenses" subtitle="From your uploaded figures, the last 12 months" />
            <CardBody>
              <RevenueExpensesChart data={monthPoints} />
            </CardBody>
          </Card>
        </Reveal>
      ) : null}

      <Reveal>
        <Card>
          <CardHeader title="Revenue by year" subtitle="Actual years and your projections" />
          {yearPoints.length >= 2 ? (
            <CardBody>
              <YearlyRevenueChart data={yearPoints} />
            </CardBody>
          ) : null}
          <CardBody className="p-0 pt-2">
            {years.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No yearly numbers added yet"
                  message="Add last year's revenue in your profile, or upload your figures above."
                />
              </div>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Financial year</TH>
                    <TH>Revenue</TH>
                    <TH>Type</TH>
                    <TH>Year-on-year</TH>
                  </tr>
                </THead>
                <TBody>
                  {years.map((y) => (
                    <TR key={`${y.fy_start}-${y.kind}`}>
                      <TD className="font-semibold text-tide">{y.label}</TD>
                      <TD className="text-navy-700">{formatLakh(y.revenue)}</TD>
                      <TD>
                        <Chip tone={y.kind === "actual" ? "green" : "blue"}>{y.kind === "actual" ? "Actual" : "Projected"}</Chip>
                      </TD>
                      {/* Growth shows only when it's up, like every other indicator. */}
                      <TD className={(y.growthPct ?? 0) > 0 ? "font-semibold text-emerald-600" : "text-navy-400"}>
                        {(y.growthPct ?? 0) > 0 ? `+${y.growthPct}%` : "—"}
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
                      <TD className="text-navy-700">{fundingDisplay(f)}</TD>
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
        Figures shown are the latest on record with Sidana. To update your annual revenue or your round, use the
        Financials section of <strong>My Profile</strong>. The Sidana team reviews every update before it is used for matching.
      </Note>
    </div>
  );
}
