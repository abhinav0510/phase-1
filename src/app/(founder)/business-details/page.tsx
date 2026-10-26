import Link from "next/link";
import { requireFounder } from "@/lib/auth";
import { getOwnStartup } from "@/lib/data/founder";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BusinessDetails() {
  const { startupId } = await requireFounder();
  const s = await getOwnStartup(startupId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Business details"
          subtitle="Your company information on record with Sidana"
        />
        <CardBody className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Row label="Startup name" value={s?.name} />
          <Row label="Sector" value={s?.sector} />
          <Row label="Sub-sector" value={s?.subsector} />
          <Row label="Stage" value={s?.stage} />
          <Row
            label="Status"
            value={<StatusBadge value={s?.status} kind="startup" />}
          />
          <Row
            label="Priority bucket"
            value={<StatusBadge value={s?.bucket} kind="bucket" />}
          />
          <Row label="Sidana relationship owner" value={s?.owner_name} />
          <Row label="Mandate signed" value={formatDate(s?.mandate_signed_on)} />
          <div className="sm:col-span-2">
            <p className="text-xs text-navy-400">Notes</p>
            <p className="mt-0.5 whitespace-pre-wrap text-navy-700">
              {s?.notes || "—"}
            </p>
          </div>
        </CardBody>
      </Card>
      <p className="rounded-lg bg-navy-50 px-4 py-3 text-xs text-navy-500">
        Something missing or out of date?{" "}
        <Link href="/complete-profile" className="font-semibold text-navy-800 underline underline-offset-2">
          Complete your profile
        </Link>
        . The Sidana team reviews every update before it is used for matching.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-0.5 font-medium text-navy-800">{value || "—"}</p>
    </div>
  );
}
