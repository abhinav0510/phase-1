import { AlertCircle, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnProfile, getOwnStartup } from "@/server/data/founder";
import { PageHeader, Card, CardBody } from "@/client/components/founder/ui";
import { ProgressBar, Reveal } from "@/client/components/founder/motion";
import { formatDateTime } from "@/shared/lib/utils";
import { PROFILE_FIELDS, isFilled, profileProgress, recordValue, type Answers } from "@/shared/lib/profile-fields";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const { startupId } = await requireFounder();
  const [startup, profile] = await Promise.all([getOwnStartup(startupId), getOwnProfile(startupId)]);

  const answers: Answers = profile?.answers ?? {};
  const record: Record<string, string | null> = {};
  const initial: Answers = {};
  for (const f of PROFILE_FIELDS) {
    const rec = recordValue(f, startup);
    record[f.key] = rec;
    if (isFilled(answers[f.key])) {
      initial[f.key] = answers[f.key];
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
        eyebrow="Better profile, better matches"
        title="Complete Profile"
        subtitle={`Sidana matches ${startup?.name ?? "your startup"} to investors by sector, stage, business model, cheque size and geography.`}
      />

      <Reveal>
        <Card className="overflow-hidden">
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

      <ProfileForm initial={initial} record={record} canSubmit={profile?.status !== "submitted"} />
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
