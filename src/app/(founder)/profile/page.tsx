import { Settings } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnBranding, getOwnStartup, logoUrlFor } from "@/server/data/founder";
import { PageHeader, Card, CardHeader, CardBody, FieldRow, Note, CompanyLogo, ButtonLink } from "@/client/components/founder/ui";
import { Reveal } from "@/client/components/founder/motion";
import { LogoUploader } from "./logo-uploader";

export const dynamic = "force-dynamic";

export default async function FounderProfile() {
  const session = await requireFounder();
  const [s, branding] = await Promise.all([getOwnStartup(session.startupId), getOwnBranding(session.startupId)]);
  const logoUrl = logoUrlFor(branding);
  const name = s?.name ?? "Your startup";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        subtitle="Your representative details and company branding on the Sidana platform."
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
              <CompanyLogo src={logoUrl} name={name} size="xl" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight text-tide">{name}</h2>
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

      <Reveal delay={0.06}>
        <Card id="logo" className="scroll-mt-28">
          <CardHeader
            title="Company logo"
            subtitle="Shown on your dashboard, in the header and on My Startup to personalise your portal"
          />
          <CardBody className="pt-4">
            <LogoUploader currentUrl={logoUrl} startupName={name} />
          </CardBody>
        </Card>
      </Reveal>

      <Note>
        Your Sidana contact is the team member who manages your relationship. To update your details, use Settings or
        contact Sidana. Your logo is only shown inside your own portal.
      </Note>
    </div>
  );
}
