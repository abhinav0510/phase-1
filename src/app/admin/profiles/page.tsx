import { Card, CardHeader, CardBody } from "@/client/components/admin/ui/card";
import { Badge } from "@/client/components/ui/badge";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/client/components/admin/ui/table";
import { requireAdmin } from "@/server/auth/session";
import { listProfileSubmissions } from "@/server/data/admin";
import { profileProgress } from "@/shared/lib/profile-fields";
import { formatDateTime } from "@/shared/lib/utils";
import { PROFILE_STATUS_META as STATUS_META } from "./status";

export const dynamic = "force-dynamic";

export default async function AdminProfiles() {
  await requireAdmin();
  const { rows, problem } = await listProfileSubmissions();
  const waiting = rows.filter((r) => r.status === "submitted").length;

  return (
    <Card>
      <CardHeader
        title="Founder profile reviews"
        subtitle={
          waiting
            ? `${waiting} profile${waiting === 1 ? "" : "s"} waiting for review`
            : "Profiles founders have filled in from the portal"
        }
      />
      <CardBody className="p-0">
        {problem ? (
          <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {problem === "not_created"
              ? "Profile reviews aren't switched on: the startup_profiles table doesn't exist yet. Run MIGRATIONS/startup-profiles.sql in Supabase."
              : "Couldn't load founder submissions. Reload the page; if it keeps happening, check the server logs."}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No founder profiles yet"
              message="When founders complete their profile from the portal, their submissions appear here for review."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Startup</TH>
                <TH>Status</TH>
                <TH>Answered</TH>
                <TH>Submitted</TH>
                <TH>Last updated</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => {
                const meta = STATUS_META[r.status];
                const p = profileProgress(null, r.answers);
                return (
                  <TR key={r.startup_id}>
                    <TD className="font-medium text-navy-800">{r.startup_name ?? `#${r.startup_id}`}</TD>
                    <TD>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </TD>
                    <TD className="tabular-nums text-navy-600">
                      {p.done}/{p.total}
                    </TD>
                    <TD className="text-navy-500">{formatDateTime(r.submitted_at)}</TD>
                    <TD className="text-navy-500">{formatDateTime(r.updated_at)}</TD>
                    <TD>
                      {/* A plain link: Next.js's client navigation could drop this click when
                          a background prefetch of the review was cancelled. */}
                      <a
                        href={`/admin/profiles/${r.startup_id}`}
                        className="text-xs font-semibold text-navy-700 hover:underline"
                      >
                        {r.status === "submitted" ? "Review" : "Open"}
                      </a>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </CardBody>
    </Card>
  );
}
