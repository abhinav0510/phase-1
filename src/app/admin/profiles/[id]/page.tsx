import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProfileForReview } from "@/lib/data/admin";
import {
  PROFILE_FIELDS,
  SECTIONS,
  displayValue,
  isFilled,
  profileProgress,
  recordValue,
} from "@/lib/profile/fields";
import { cn, formatDateTime } from "@/lib/utils";
import { PROFILE_STATUS_META } from "../status";
import { ReviewActions } from "./review-actions";

export const dynamic = "force-dynamic";

export default async function AdminProfileReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const startupId = Number(id);
  if (!Number.isInteger(startupId) || startupId <= 0) notFound();
  const { startup, profile } = await getProfileForReview(startupId);
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

      {SECTIONS.map((s) => (
        <Card key={s.key}>
          <CardHeader title={s.title} />
          <CardBody className="p-0">
            <div className="divide-y divide-navy-50">
              <div className="hidden grid-cols-[220px_1fr_1fr] gap-4 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-navy-400 md:grid">
                <span>Field</span>
                <span>Founder&apos;s answer</span>
                <span>On record</span>
              </div>
              {PROFILE_FIELDS.filter((f) => f.section === s.key).map((f) => {
                const answer = displayValue(profile.answers[f.key]);
                const rec = recordValue(f, startup) ?? "";
                const changed = isFilled(answer) && isFilled(rec) && answer !== rec;
                const added = isFilled(answer) && !isFilled(rec);
                return (
                  <div
                    key={f.key}
                    className="grid grid-cols-1 gap-1 px-5 py-3 text-sm md:grid-cols-[220px_1fr_1fr] md:gap-4"
                  >
                    <span className="flex items-center gap-1.5 font-medium text-navy-700">
                      {f.label}
                      {f.matching ? (
                        <Sparkles className="h-3 w-3 text-[#9a6f2a]" aria-label="Used for matching" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "whitespace-pre-wrap break-words",
                        answer ? "text-navy-900" : "text-navy-300",
                        (changed || added) && "font-medium",
                      )}
                    >
                      {answer || "—"}
                      {changed ? <Badge tone="amber" className="ml-2">changed</Badge> : null}
                      {added ? <Badge tone="blue" className="ml-2">new</Badge> : null}
                    </span>
                    <span className="whitespace-pre-wrap break-words text-navy-500">{rec || "—"}</span>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ))}

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
