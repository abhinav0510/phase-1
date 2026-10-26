import Link from "next/link";
import { requireFounder } from "@/lib/auth";
import { getOwnStartup, getOwnFunding } from "@/lib/data/founder";
import { StatCard, Card, CardHeader, CardBody } from "@/components/ui/card";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/components/ui/table";
import { formatCr, formatLakh, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Financials() {
  const { startupId } = await requireFounder();
  const [s, funding] = await Promise.all([
    getOwnStartup(startupId),
    getOwnFunding(startupId),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Current ask"
          value={s?.ask_as_written ?? formatCr(s?.ask_amount ?? s?.ask_current_cr)}
          accent
        />
        <StatCard
          label="Allocation left"
          value={s?.allocation_left_as_written ?? formatCr(s?.allocation_left_amount)}
        />
        <StatCard label="Revenue" value={formatLakh(s?.revenue_inr_l)} />
        <StatCard label="Monthly burn" value={formatLakh(s?.burn_inr_l)} />
      </div>

      <Card>
        <CardHeader title="Financial indicators" />
        <CardBody className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <Row
            label="Runway"
            value={s?.runway_months ? `${s.runway_months} months` : "—"}
          />
          <Row label="Ask source" value={s?.ask_source} />
          <Row label="Ask updated" value={formatDate(s?.ask_updated_on)} />
          <Row label="Allocation source" value={s?.allocation_source} />
          <Row label="Allocation updated" value={formatDate(s?.allocation_updated_on)} />
          <Row label="Score" value={s?.score?.toString()} />
          <div className="sm:col-span-3">
            <p className="text-xs text-navy-400">Revenue note</p>
            <p className="mt-0.5 text-navy-700">{s?.revenue_note || "—"}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Funding rounds" />
        <CardBody className="p-0">
          {funding.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No funding rounds recorded yet"
                message="Closed rounds will appear here as they are logged."
              />
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
                    <TD className="font-medium text-navy-800">
                      {f.round_name ?? f.instrument ?? "Round"}
                    </TD>
                    <TD className="text-navy-600">
                      {f.as_written ?? formatCr(f.amount)}
                    </TD>
                    <TD className="text-navy-500">
                      {f.lead_investor_name ?? "—"}
                    </TD>
                    <TD className="text-navy-500">{formatDate(f.closed_on)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
      <p className="rounded-lg bg-navy-50 px-4 py-3 text-xs text-navy-500">
        Figures shown are the latest on record with Sidana. To update revenue, burn,
        runway or your round,{" "}
        <Link
          href="/complete-profile#section-traction"
          className="font-semibold text-navy-800 underline underline-offset-2"
        >
          complete your profile
        </Link>
        . The Sidana team reviews every update before it is used for matching.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-0.5 font-medium text-navy-800">{value || "—"}</p>
    </div>
  );
}
