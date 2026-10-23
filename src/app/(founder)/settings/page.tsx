import { requireFounder } from "@/lib/auth";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { ChangePassword } from "./change-password";

export const dynamic = "force-dynamic";

export default async function FounderSettings() {
  const session = await requireFounder();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Account" />
        <CardBody className="space-y-2 text-sm">
          <Row label="Login email" value={session.email ?? "—"} />
          <Row label="Login ID" value={`#${session.startupId}`} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader
          title="Change password"
          subtitle="Set your own password. Required after first login."
        />
        <CardBody>
          <ChangePassword />
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-navy-400">{label}</span>
      <span className="font-medium text-navy-800">{value}</span>
    </div>
  );
}
