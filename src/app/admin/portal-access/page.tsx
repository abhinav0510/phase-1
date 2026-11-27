import { Card, CardBody, CardHeader } from "@/client/components/admin/ui/card";
import { Table, THead, TH, TBody, TR, TD, EmptyState } from "@/client/components/admin/ui/table";
import { Badge } from "@/client/components/ui/badge";
import { requireAdmin } from "@/server/auth/session";
import { listPortalAccess, listUnlinkedConclusions, listUnresolvedEngagements } from "@/server/data/admin";
import { formatDateTime } from "@/shared/lib/utils";
import { addLoginEmail, grantAccess, linkConclusion, removeLoginEmail, revokeAccess } from "./actions";

export const dynamic = "force-dynamic";

const input = "rounded-lg border border-navy-200 px-2.5 py-1.5 text-sm text-navy-800";
const button = "rounded-lg border border-navy-200 px-3 py-1.5 text-xs font-medium text-navy-700 hover:bg-navy-50";

/**
 * Investor portal access (clauses 2.1, 2.11, 2.12): who has access and how they
 * got it, engaged replies that need a hand grant, and Fireflies records that
 * couldn't be tied to a meeting.
 */
export default async function AdminPortalAccess() {
  await requireAdmin();
  const [{ rows, ready }, unresolved, unlinked] = await Promise.all([
    listPortalAccess(),
    listUnresolvedEngagements(),
    listUnlinkedConclusions(),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Grant access by hand" subtitle="For an engaged reply the system couldn't tie to an investor, or to re-open a revoked one." />
        <CardBody>
          <form action={grantAccess} className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-navy-500">
              Investor ID
              <input name="investorId" inputMode="numeric" required className={`${input} mt-1 block w-32`} />
            </label>
            <label className="text-xs text-navy-500">
              Startup ID (optional)
              <input name="startupId" inputMode="numeric" className={`${input} mt-1 block w-32`} />
            </label>
            <button type="submit" className={button}>
              Grant access
            </button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Investors with portal access" subtitle={`${rows.filter((r) => !r.revoked_at).length} open · ${rows.filter((r) => r.signed_in).length} signed in`} />
        <CardBody className="p-0">
          {!ready ? (
            <div className="p-5">
              <EmptyState title="Access table not created yet" message="Run MIGRATIONS/011-investor-portal-access.sql in Supabase." />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No investor has access yet" message="Access opens when a reply asks for documents or a meeting is fixed." />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Investor</TH>
                  <TH>Opened by</TH>
                  <TH>Startup</TH>
                  <TH>Invite</TH>
                  <TH>First sign-in</TH>
                  <TH>Extra login emails</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.investor_id}>
                    <TD className="font-medium text-navy-800">
                      {r.investor_name}
                      <span className="block text-xs text-navy-400">ID {r.investor_id}</span>
                    </TD>
                    <TD className="text-navy-500">
                      {r.granted_via}
                      <span className="block text-xs text-navy-400">{formatDateTime(r.granted_at)}</span>
                    </TD>
                    <TD className="text-navy-500">{r.startup_name ?? "—"}</TD>
                    <TD>{r.invite_status === "sent" ? <Badge tone="green">sent</Badge> : <Badge tone="amber">pending</Badge>}</TD>
                    <TD className="text-navy-500">{r.first_signin_at ? formatDateTime(r.first_signin_at) : "—"}</TD>
                    <TD>
                      <div className="space-y-1">
                        {(r.login_emails ?? []).map((e) => (
                          <form key={e} action={removeLoginEmail} className="flex items-center gap-1 text-xs text-navy-600">
                            <input type="hidden" name="investorId" value={r.investor_id} />
                            <input type="hidden" name="email" value={e} />
                            {e}
                            <button type="submit" className="text-red-600 hover:underline" aria-label={`Remove ${e}`}>
                              remove
                            </button>
                          </form>
                        ))}
                        <form action={addLoginEmail} className="flex gap-1">
                          <input type="hidden" name="investorId" value={r.investor_id} />
                          <input name="email" type="email" placeholder="name@gmail.com" className={`${input} w-44 py-1 text-xs`} />
                          <button type="submit" className={button}>
                            Add
                          </button>
                        </form>
                      </div>
                    </TD>
                    <TD>
                      {r.revoked_at ? (
                        <form action={grantAccess}>
                          <input type="hidden" name="investorId" value={r.investor_id} />
                          <Badge tone="red">revoked</Badge>{" "}
                          <button type="submit" className={button}>
                            Re-open
                          </button>
                        </form>
                      ) : (
                        <form action={revokeAccess}>
                          <input type="hidden" name="investorId" value={r.investor_id} />
                          <Badge tone="green">open</Badge>{" "}
                          <button type="submit" className={button}>
                            Revoke
                          </button>
                        </form>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Engaged replies to review" subtitle="Documents requested or a meeting fixed, but the investor or startup couldn't be identified. Grant by hand above." />
        <CardBody className="p-0">
          {unresolved.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing to review" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Deal</TH>
                  <TH>Investor (as written)</TH>
                  <TH>Startup (as written)</TH>
                  <TH>Reply</TH>
                </tr>
              </THead>
              <TBody>
                {unresolved.map((u, i) => (
                  <TR key={`${u.deal_id}-${i}`}>
                    <TD className="text-navy-500">{u.deal_id ?? "—"}</TD>
                    <TD className="text-navy-800">{u.investor_name ?? "—"}</TD>
                    <TD className="text-navy-800">{u.startup_name ?? "—"}</TD>
                    <TD>
                      <Badge tone="blue">{u.via}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Fireflies records not linked to a meeting" subtitle="Enter the meeting ID from Meetings to link one by hand." />
        <CardBody className="p-0">
          {unlinked.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Every Fireflies record is linked" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Call</TH>
                  <TH>When</TH>
                  <TH>Guessed startup / investor</TH>
                  <TH>Conclusion</TH>
                  <TH>Link</TH>
                </tr>
              </THead>
              <TBody>
                {unlinked.map((c) => (
                  <TR key={c.ff_id}>
                    <TD className="text-navy-800">{c.title ?? c.ff_id}</TD>
                    <TD className="whitespace-nowrap text-navy-500">{formatDateTime(c.meeting_date)}</TD>
                    <TD className="text-navy-500">{[c.startup_guess, c.investor_guess].filter(Boolean).join(" / ") || "—"}</TD>
                    <TD className="max-w-[320px] text-xs text-navy-600">
                      <span className="line-clamp-3">{c.overview ?? "—"}</span>
                    </TD>
                    <TD>
                      <form action={linkConclusion} className="flex gap-1">
                        <input type="hidden" name="ffId" value={c.ff_id} />
                        <input name="meetingId" inputMode="numeric" placeholder="Meeting ID" className={`${input} w-28 py-1 text-xs`} />
                        <button type="submit" className={button}>
                          Link
                        </button>
                      </form>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
