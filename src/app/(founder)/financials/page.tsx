import { Target, Wallet, TrendingUp, Flame, PencilLine } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnStartup, getOwnFunding } from "@/lib/data/founder";
import {
  KpiCard,
  PageHeader,
  Card,
  CardHeader,
  CardBody,
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
} from "@/components/founder/ui";
import { Stagger, Item, Reveal, ProgressBar } from "@/components/founder/motion";
import { formatCr, formatLakh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Financials() {
  const { startupId } = await requireFounder();
  const [s, funding] = await Promise.all([getOwnStartup(startupId), getOwnFunding(startupId)]);
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
          <ButtonLink href="/complete-profile#section-traction" variant="ghost">
            <PencilLine className="h-4 w-4" /> Update via profile
          </ButtonLink>
        }
      />

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
          <KpiCard label="Revenue" value={formatLakh(s?.revenue_inr_l)} icon={<TrendingUp className="h-4 w-4" />} hint={s?.revenue_note ? "See note below" : "Latest on record"} />
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
                      <TD className="font-semibold text-obsidian">{f.round_name ?? f.instrument ?? "Round"}</TD>
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
        Figures shown are the latest on record with Sidana. To update revenue, burn, runway or your round, use{" "}
        <strong>Update via profile</strong>. The Sidana team reviews every update before it is used for matching.
      </Note>
    </div>
  );
}
