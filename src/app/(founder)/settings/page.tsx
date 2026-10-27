import { requireFounder } from "@/lib/auth";
import { getOwnSignInEmails } from "@/lib/data/founder";
import { PageHeader, Card, CardHeader, CardBody, FieldRow } from "@/components/founder/ui";
import { Reveal } from "@/components/founder/motion";
import { ChangePassword } from "./change-password";

export const dynamic = "force-dynamic";

export default async function FounderSettings() {
  const session = await requireFounder();
  const emails = await getOwnSignInEmails(session.startupId);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Account" title="Settings" subtitle="Sign-in details and your password." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Reveal>
          <Card className="h-full">
            <CardHeader title="Account" subtitle="You can sign in with any of these" />
            <CardBody className="grid grid-cols-1 gap-3 pt-3">
              <FieldRow
                label={emails.length === 1 ? "Email" : "Emails"}
                value={emails.length ? emails.join(", ") : "None on file — ask Sidana to add one"}
              />
              <FieldRow label="Login ID" value={`#${session.startupId}`} />
            </CardBody>
          </Card>
        </Reveal>
        <Reveal delay={0.08}>
          <Card className="h-full">
            <CardHeader title="Change password" subtitle="Set your own password. Required after first login." />
            <CardBody className="pt-3">
              <ChangePassword />
            </CardBody>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
