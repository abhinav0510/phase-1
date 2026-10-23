import { requireFounder } from "@/lib/auth";
import { getOwnMatches } from "@/lib/data/founder";
import { StatCard, Card, CardHeader, CardBody } from "@/components/ui/card";
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

export const dynamic = "force-dynamic";

export default async function FounderFunding() {
  const { startupId } = await requireFounder();
  const matches = await getOwnMatches(startupId);
  const sent = matches.filter((m) => m.state === "sent").length;
  const queued = matches.filter((m) => m.state === "queued").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Matched investors" value={matches.length} accent />
        <StatCard label="Reached out" value={sent} />
        <StatCard label="In queue" value={queued} />
      </div>

      <Card>
        <CardHeader
          title="Investor matches"
          subtitle="Investors Sidana has matched to your startup"
        />
        <CardBody className="p-0">
          {matches.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No investor matches yet"
                message="As Sidana's match engine identifies fits, they'll appear here."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Investor</TH>
                  <TH>Type</TH>
                  <TH>Match</TH>
                  <TH>State</TH>
                  <TH>Fit</TH>
                </tr>
              </THead>
              <TBody>
                {matches.map((m) => (
                  <TR key={m.id}>
                    <TD className="font-medium text-navy-800">
                      {m.investor?.name ?? "Investor"}
                    </TD>
                    <TD className="text-navy-500">{m.investor?.type ?? "—"}</TD>
                    <TD className="text-navy-500">{m.type ?? "—"}</TD>
                    <TD>
                      <StatusBadge value={m.state} kind="match" />
                    </TD>
                    <TD className="text-navy-500">
                      {[m.stage_fit && "stage", m.cheque_fit && "cheque"]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
