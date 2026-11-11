import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/client/components/admin/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { requireAdmin } from "@/server/auth/session";
import { getProfileForReview } from "@/server/data/admin";
import { listMisFiles } from "@/server/data/mis";
import { MisFiles } from "@/client/components/admin/mis-files";
import { ProfileAnswers } from "@/client/components/admin/profile-answers";
import { profileProgress } from "@/shared/lib/profile-fields";
import { formatDateTime } from "@/shared/lib/utils";
import { PROFILE_STATUS_META } from "../status";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

export default async function AdminProfileReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const startupId = Number(id);
  if (!Number.isInteger(startupId) || startupId <= 0) notFound();
  const [{ startup, profile }, mis] = await Promise.all([getProfileForReview(startupId), listMisFiles(startupId)]);
  if (!profile) notFound();

  const meta = PROFILE_STATUS_META[profile.status];
  const progress = profileProgress(startup, profile.answers);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/profiles"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-navy-600 hover:text-navy-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All profile reviews
      </Link>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-navy-900">
                {startup?.name ?? `Startup #${startupId}`}
              </h2>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <p className="mt-1 text-xs text-navy-500">
              Submitted {formatDateTime(profile.submitted_at)} · last updated{" "}
              {formatDateTime(profile.updated_at)} · {progress.done} of {progress.total} details complete
              {profile.reviewed_at
                ? ` · last reviewed ${formatDateTime(profile.reviewed_at)} by ${profile.reviewed_by_email ?? "team"}`
                : ""}
            </p>
            {profile.review_note ? (
              <p className="mt-2 text-xs text-navy-600">Last note: “{profile.review_note}”</p>
            ) : null}
          </div>
          <Link
            href={`/admin/startups/${startupId}`}
            className="text-xs font-semibold text-navy-700 hover:underline"
          >
            Open startup record
          </Link>
        </CardBody>
      </Card>

      <ProfileAnswers startup={startup} answers={profile.answers} />

      <Card>
        <CardHeader title="MIS from the founder" subtitle="Uploaded from Complete Profile. These don't wait for review." />
        <CardBody>
          <MisFiles files={mis.files} ready={mis.ready} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Decision"
          subtitle="Approving keeps this as the founder's reviewed profile. It does not change the startup record or the Pilot sheet."
        />
        <CardBody>
          <ReviewActions startupId={startupId} status={profile.status} />
        </CardBody>
      </Card>
    </div>
  );
}
