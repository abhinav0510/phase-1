import { PencilLine } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnBranding, getOwnStartup, logoUrlFor } from "@/lib/data/founder";
import {
  PageHeader,
  Card,
  CardBody,
  FieldRow,
  Note,
  CompanyLogo,
  Chip,
  ButtonLink,
  STARTUP_STATUS_TONE,
  label,
} from "@/components/founder/ui";
import { Reveal } from "@/components/founder/motion";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BusinessDetails() {
  const { startupId } = await requireFounder();
  const [s, branding] = await Promise.all([getOwnStartup(startupId), getOwnBranding(startupId)]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="On record with Sidana"
        title="My Startup"
        subtitle="Your company information as the Sidana team sees it."
        actions={
          <ButtonLink href="/complete-profile" variant="ghost">
            <PencilLine className="h-4 w-4" /> Update details
          </ButtonLink>
        }
      />

      <Reveal>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-ocean-100 to-leaf-100 px-6 py-6 text-tide">
            <CompanyLogo src={logoUrlFor(branding)} name={s?.name} size="lg" className="ring-white" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold tracking-tight">{s?.name ?? "Your startup"}</h2>
              <p className="mt-0.5 text-sm text-tide/60">
                {[s?.sector, s?.subsector, s?.stage].filter(Boolean).join(" · ") || "Sector and stage not set"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {s?.status ? <Chip tone={STARTUP_STATUS_TONE[s.status] ?? "neutral"}>{label(s.status)}</Chip> : null}
            </div>
          </div>
          <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FieldRow label="Startup name" value={s?.name} />
            <FieldRow label="Sector" value={s?.sector} />
            <FieldRow label="Sub-sector" value={s?.subsector} />
            <FieldRow label="Stage" value={s?.stage} />
            <FieldRow label="Sidana relationship owner" value={s?.owner_name} />
            <FieldRow label="Mandate signed" value={formatDate(s?.mandate_signed_on)} />
            <FieldRow label="Notes" value={<span className="whitespace-pre-wrap font-normal text-navy-700">{s?.notes || "—"}</span>} wide />
          </CardBody>
        </Card>
      </Reveal>

      <Note>
        Something missing or out of date? Use <strong>Update details</strong> to complete your profile. The Sidana team
        reviews every update before it is used for matching.
      </Note>
    </div>
  );
}
