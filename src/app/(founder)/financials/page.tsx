import { Target, Wallet, TrendingUp, Repeat, PencilLine, CheckCircle2, CircleAlert } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnStartup, getOwnFunding, getOwnProfile } from "@/server/data/founder";
import { allocationDisplay, askDisplay, fundingDisplay } from "@/shared/lib/currency";
import { PAST_YEARS, PROJECTED_YEARS, arrDisplay, isFilled, mrrDisplay, type ArrDisplay, type FinancialYear } from "@/shared/lib/profile-fields";
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
} from "@/client/components/founder/ui";
import { Stagger, Item, Reveal } from "@/client/components/founder/motion";
import { formatLakh, formatDate } from "@/shared/lib/utils";

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

const ARR_HINT: Partial<Record<ArrDisplay["source"], string>> = {
  note: "From Sidana's records",
  founder: "As you entered it",
  none: "Not added yet",
};

export default async function Financials() {
  const { startupId } = await requireFounder();
  const [s, funding, profile] = await Promise.all([
    getOwnStartup(startupId),
    getOwnFunding(startupId),
    getOwnProfile(startupId),
  ]);
  const answers = profile?.answers ?? {};
  const arr = arrDisplay(s, answers);
  const filled = (years: FinancialYear[]) => years.filter((y) => isFilled(answers[y.key])).length;
  const hasArr = arr.source !== "none";
  const pastDone = filled(PAST_YEARS);
  const projectedDone = filled(PROJECTED_YEARS);
  const yearRows = [
    ...PAST_YEARS.map((y) => ({ ...y, kind: "Actual" as const })),
    ...PROJECTED_YEARS.map((y) => ({ ...y, kind: "Projected" as const })),
  ];
  const mrr = mrrDisplay(s);

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
            value={askDisplay(s)}
            icon={<Target className="h-4 w-4" />}
            hint={s?.ask_updated_on ? `Updated ${formatDate(s.ask_updated_on)}` : "As recorded with Sidana"}
          />
        </Item>
        <Item>
          <KpiCard
            label="Allocation left"
            value={allocationDisplay(s)}
            icon={<Wallet className="h-4 w-4" />}
            hint={s?.allocation_updated_on ? `Updated ${formatDate(s.allocation_updated_on)}` : "Of the current round"}
          />
        </Item>
        <Item>
          <KpiCard
            label="Annual revenue (ARR)"
            value={arr.source === "note" ? <span className="block whitespace-normal text-lg font-semibold leading-snug">{arr.value}</span> : arr.value}
            icon={<TrendingUp className="h-4 w-4" />}
            hint={ARR_HINT[arr.source] ?? arr.note ?? "Latest on record"}
          />
        </Item>
        <Item>
          <KpiCard
            label="Monthly revenue (MRR)"
            value={mrr.value}
            icon={<Repeat className="h-4 w-4" />}
            hint={mrr.source === "note" ? "From Sidana's records" : "Not on record"}
          />
        </Item>
      </Stagger>

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
        Figures shown are the latest on record with Sidana. To update your annual revenue, burn, runway or your round, use{" "}
        <strong>Update via profile</strong>. The Sidana team reviews every update before it is used for matching.
      </Note>
    </div>
  );
}
