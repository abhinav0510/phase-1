import { Settings } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnStartup } from "@/lib/data/founder";
import { PageHeader, Card, CardBody, FieldRow, Note, Avatar, ButtonLink } from "@/components/founder/ui";
import { Reveal } from "@/components/founder/motion";

export const dynamic = "force-dynamic";

export default async function FounderProfile() {
  const session = await requireFounder();
  const s = await getOwnStartup(session.startupId);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        subtitle="Your representative details on the Sidana platform."
        actions={
          <ButtonLink href="/settings" variant="ghost">
            <Settings className="h-4 w-4" /> Settings
          </ButtonLink>
        }
      />

      <Reveal>
        <Card>
          <CardBody className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={s?.name} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight text-obsidian">{s?.name ?? "Your startup"}</h2>
                <p className="text-sm text-navy-500">Founder · Login ID #{session.startupId}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FieldRow label="Startup" value={s?.name} />
              <FieldRow label="Sector" value={s?.sector} />
              <FieldRow label="Login ID" value={`#${session.startupId}`} />
              <FieldRow label="Role" value="Founder" />
              <FieldRow label="Sidana contact" value={s?.owner_name} />
            </div>
          </CardBody>
        </Card>
      </Reveal>

      <Note>
        Your Sidana contact is the team member who manages your relationship. To update your details, use Settings or
        contact Sidana.
      </Note>
    </div>
  );
}
