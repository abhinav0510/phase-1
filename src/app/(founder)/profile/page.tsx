import { AlertCircle, CheckCircle2, Clock, Settings, Sparkles } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnBranding, getOwnPrefill, getOwnProfile, getOwnStartup, logoUrlFor } from "@/server/data/founder";
import { listMisFiles } from "@/server/data/mis";
import { getFinancials } from "@/server/data/financials";
import { sheetAnswers } from "@/app/(founder)/financials/_components/financials-model";
import { PageHeader, Card, CardHeader, CardBody, FieldRow, Note, CompanyLogo, ButtonLink } from "@/client/components/founder/ui";
import { ProgressBar, Reveal } from "@/client/components/founder/motion";
import { formatDateTime } from "@/shared/lib/utils";
import { PAST_YEARS, PROFILE_FIELDS, isFilled, prefillValue, profileProgress, recordValue, type Answers } from "@/shared/lib/profile-fields";
import { LogoUploader } from "./logo-uploader";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

/** My Profile: account details, company logo, and every question Sidana asks the founder. */
export default async function FounderProfile() {
  const session = await requireFounder();
  const { startupId } = session;
  const [startup, branding, profile, mis, prefill, fin] = await Promise.all([
    getOwnStartup(startupId),
    getOwnBranding(startupId),
    getOwnProfile(startupId),
    listMisFiles(startupId),
    getOwnPrefill(startupId),
    getFinancials(startupId),
  ]);
  const s = startup;
  const logoUrl = logoUrlFor(branding);
  const name = s?.name ?? "Your startup";

  const answers: Answers = profile?.answers ?? {};
  const record: Record<string, string | null> = {};
  const initial: Answers = {};
  // Figures from the founder's uploaded template. "How revenue is measured" only follows the
  // sheet when the ARR does too, so it never describes a number the founder typed themselves.
  const sheet = sheetAnswers(fin.months, fin.years, PAST_YEARS[0]);
  if (sheet.revenue_basis && isFilled(answers.revenue_inr_l) && String(answers.revenue_inr_l) !== sheet.revenue_inr_l?.value) {
    delete sheet.revenue_basis;
  }
  // Empty questions are filled from, in order: the uploaded sheet, the Sidana team's details,
  // then what is on record. Each stays marked until the founder saves their own answer.
  const fromTeam: string[] = [];
  const fromSheet: string[] = [];
  for (const f of PROFILE_FIELDS) {
    const rec = recordValue(f, startup);
    record[f.key] = rec;
    const team = prefillValue(f, prefill?.[f.key]);
    const fromUpload = sheet[f.key] ? prefillValue(f, sheet[f.key].value) : null;
    if (isFilled(answers[f.key])) {
      initial[f.key] = answers[f.key];
    } else if (fromUpload) {
      initial[f.key] = fromUpload;
      fromSheet.push(f.key);
    } else if (team) {
      initial[f.key] = team;
      fromTeam.push(f.key);
    } else if (rec && (f.type !== "select" || (f.options ?? []).includes(rec))) {
      // Pre-fill from what is already on file so the founder only confirms it.
      initial[f.key] = rec;
    }
  }
  const progress = profileProgress(startup, answers);
  const contact = startup?.owner_name ?? "your Sidana contact";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Account"
        title="My Profile"
        subtitle={`Your details, logo and the profile Sidana uses to match ${name} to investors by sector, stage, business model, cheque size and geography.`}
        actions={
          <ButtonLink href="/settings" variant="ghost">
            <Settings className="h-4 w-4" /> Settings
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Reveal>
          <Card className="h-full">
            <CardBody className="space-y-5">
              <div className="flex items-center gap-4">
                <CompanyLogo src={logoUrl} name={name} size="xl" />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold tracking-tight text-tide">{name}</h2>
                  <p className="text-sm text-navy-500">Founder · Login ID #{session.startupId}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <Card id="logo" className="h-full scroll-mt-28">
            <CardHeader
              title="Company logo"
              subtitle="Shown on your dashboard and in the header to personalise your portal"
            />
            <CardBody className="pt-4">
              <LogoUploader currentUrl={logoUrl} startupName={name} />
            </CardBody>
          </Card>
        </Reveal>
      </div>

      <Reveal>
        <Card id="complete-profile" className="scroll-mt-28 overflow-hidden">
          <div className="relative bg-gradient-to-br from-ocean-100 via-ocean-50 to-leaf-100 px-6 py-6 text-tide">
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-white/60 blur-2xl" aria-hidden="true" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ocean-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Fields marked “Used for matching” matter most
                </p>
                <h2 className="mt-2 text-xl font-semibold">The more we have, the sharper your matches</h2>
                <p className="mt-1.5 text-sm text-tide/70">
                  A complete profile gives investors the full picture and strengthens every introduction Sidana makes.
                </p>
              </div>
              <div className="shrink-0 md:w-56 md:text-right">
                <p className="text-4xl font-bold leading-none">{progress.pct}%</p>
                <p className="mt-1 text-xs text-tide/60">
                  {progress.done} of {progress.total} details complete
                </p>
                <ProgressBar
                  pct={progress.pct}
                  className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/70"
                  barClassName="h-full rounded-full bg-gradient-to-r from-ocean-500 to-leaf-500"
                />
              </div>
            </div>
          </div>
          <StatusStrip
            status={profile?.status ?? null}
            submittedAt={profile?.submitted_at ?? null}
            reviewedAt={profile?.reviewed_at ?? null}
            note={profile?.review_note ?? null}
            contact={contact}
          />
        </Card>
      </Reveal>

      <ProfileForm
        initial={initial}
        record={record}
        canSubmit={profile?.status !== "submitted"}
        fromTeam={fromTeam}
        fromSheet={fromSheet}
        sheet={sheet}
        mis={{
          ready: mis.ready,
          files: mis.files.map((f) => ({ id: f.id, file_name: f.file_name, size_bytes: f.size_bytes, created_at: f.created_at })),
        }}
      />

      <Note>
        Your Sidana contact is the team member who manages your relationship. Your logo is only shown inside your own
        portal, and the Sidana team reviews every profile you submit before it is used for matching.
      </Note>
    </div>
  );
}

function StatusStrip({
  status,
  submittedAt,
  reviewedAt,
  note,
  contact,
}: {
  status: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  contact: string;
}) {
  if (status === "submitted") {
    return (
      <CardBody className="flex items-start gap-3 bg-amber-50 py-3 text-sm text-amber-800">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Sent for review on {formatDateTime(submittedAt)}. {contact} will check it before it is used for matching.
          You can still update it.
        </span>
      </CardBody>
    );
  }
  if (status === "changes_requested") {
    return (
      <CardBody className="flex items-start gap-3 bg-red-50 py-3 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          The Sidana team asked for a few changes{note ? `: “${note}”` : "."} Update the details below and submit
          again.
        </span>
      </CardBody>
    );
  }
  if (status === "approved") {
    return (
      <CardBody className="flex items-start gap-3 bg-emerald-50 py-3 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Approved on {formatDateTime(reviewedAt)} and in use for your matching. Changes you submit are reviewed again
          before they replace it.
        </span>
      </CardBody>
    );
  }
  return (
    <CardBody className="py-3 text-sm text-navy-500">
      Details already on file with Sidana are filled in for you. Check them, fill the gaps, save a draft whenever you
      like, and submit when you&apos;re done.
    </CardBody>
  );
}
