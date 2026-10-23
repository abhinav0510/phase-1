import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { SimpleBarChart } from "@/components/ui/bar-chart";
import {
  getStartupStatusDistribution,
  getBucketDistribution,
  getInvestorTypeDistribution,
  getMatchStateDistribution,
} from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export default async function AdminReports() {
  const [statusDist, bucketDist, investorTypes, matchStates] = await Promise.all(
    [
      getStartupStatusDistribution(),
      getBucketDistribution(),
      getInvestorTypeDistribution(),
      getMatchStateDistribution(),
    ],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Startups by status" />
          <CardBody>
            <SimpleBarChart data={statusDist} xKey="status" yKey="count" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Startups by bucket" />
          <CardBody>
            <SimpleBarChart data={bucketDist} xKey="bucket" yKey="count" color="#476aa0" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Investors by type" />
          <CardBody>
            <SimpleBarChart data={investorTypes} xKey="type" yKey="count" color="#2d436c" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Matches by state" />
          <CardBody>
            <SimpleBarChart data={matchStates} xKey="state" yKey="count" color="#6887b8" />
          </CardBody>
        </Card>
      </div>
      <p className="text-xs text-navy-400">
        All figures are live aggregates from Supabase. Time-series (registrations
        over time, verification turnaround) will be added once the corresponding
        timestamp coverage is confirmed across tables.
      </p>
    </div>
  );
}
