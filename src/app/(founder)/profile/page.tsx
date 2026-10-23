import { requireFounder } from "@/lib/auth";
import { getOwnStartup } from "@/lib/data/founder";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FounderProfile() {
  const session = await requireFounder();
  const s = await getOwnStartup(session.startupId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="My profile"
          subtitle="Your representative details"
        />
        <CardBody className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Row label="Startup" value={s?.name} />
          <Row label="Sector" value={s?.sector} />
          <Row label="Login ID" value={`#${session.startupId}`} />
          <Row label="Role" value="Founder" />
          <Row label="Sidana contact" value={s?.owner_name} />
        </CardBody>
      </Card>
      <p className="rounded-lg bg-navy-50 px-4 py-3 text-xs text-navy-500">
        Your Sidana contact is the team member who manages your relationship. To
        update your details, use Settings or contact Sidana.
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
