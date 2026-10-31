import Link from "next/link";
import { Card, CardHeader, CardBody, StatCard } from "@/client/components/admin/ui/card";
import { SimpleBarChart } from "@/client/components/admin/ui/bar-chart";
import { requireAdmin } from "@/server/auth/session";
import { getMatchStateDistribution } from "@/server/data/admin";

export const dynamic = "force-dynamic";

export default async function AdminMatches() {
  await requireAdmin();
  const dist = await getMatchStateDistribution();
  const total = dist.reduce((a, b) => a + b.count, 0);
  const sent = dist.find((d) => d.state === "sent")?.count ?? 0;
  const queued = dist.find((d) => d.state === "queued")?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total matches" value={total.toLocaleString("en-IN")} accent />
        <StatCard label="Sent" value={sent.toLocaleString("en-IN")} />
        <StatCard label="Queued" value={queued.toLocaleString("en-IN")} />
      </div>
      <Card>
        <CardHeader
          title="Matches by state"
          subtitle="Startup ↔ investor match pipeline"
        />
        <CardBody>
          <SimpleBarChart data={dist} xKey="state" yKey="count" />
        </CardBody>
      </Card>
      <p className="text-sm text-navy-500">
        Per-startup matches (with investor names, fit and priority) are shown on
        each{" "}
        <Link href="/admin/startups" className="text-navy-700 underline">
          startup&apos;s detail page
        </Link>
        .
      </p>
    </div>
  );
}
