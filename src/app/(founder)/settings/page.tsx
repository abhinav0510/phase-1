import { requireFounder } from "@/lib/auth";
import { getOwnSignInEmails } from "@/lib/data/founder";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { ChangePassword } from "./change-password";

export const dynamic = "force-dynamic";

export default async function FounderSettings() {
  const session = await requireFounder();
  const emails = await getOwnSignInEmails(session.startupId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Account" subtitle="You can sign in with any of these" />
        <CardBody className="space-y-2 text-sm">
          <Row
            label={emails.length === 1 ? "Email" : "Emails"}
            value={emails.length ? emails.join(", ") : "None on file — ask Sidana to add one"}
          />
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
