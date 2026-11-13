import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/client/components/admin/ui/card";
import { StatusBadge, Badge } from "@/client/components/ui/badge";
import {
  Table,
  THead,
  TH,
  TBody,
  TR,
  TD,
  EmptyState,
} from "@/client/components/admin/ui/table";
import { requireAdmin } from "@/server/auth/session";
import { getStartupDeck, getFounderAccounts, getProfileForReview, getStartupDetail } from "@/server/data/admin";
import { toFounderMeetings, withPastMeetingsHeld } from "@/server/data/meetings";
import { MeetingsTabs } from "./_components/meetings-tabs";
import { dealShareCounts, sharesFromPairs } from "@/shared/lib/deal-shares";
import { getStartupDeals } from "@/server/data/pipeline";
import { categorizedPairs } from "@/shared/lib/deal-sharing";
import { DealSharesPanel } from "./_components/deal-shares-panel";
import { RevenueExpensesChart, YearlyRevenueChart } from "@/app/(founder)/financials/_components/financial-charts";
import { ProfileAnswers } from "@/client/components/admin/profile-answers";
import { profileProgress } from "@/shared/lib/profile-fields";
import { PROFILE_STATUS_META } from "../../profiles/status";
import { listMisFiles } from "@/server/data/mis";
import { getFinancials } from "@/server/data/financials";
import { fyLabel, latestMrr, monthLabel, monthlySeries, yearRows, yearSeries } from "@/app/(founder)/financials/_components/financials-model";
import { MisFiles } from "@/client/components/admin/mis-files";
import { allocationDisplay, askDisplay, fundingDisplay, toRupees } from "@/shared/lib/currency";
import { formatLakh, formatDate, formatDateTime } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

export default async function StartupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const startupId = Number(id);
  if (!Number.isInteger(startupId)) notFound();

  const [{ startup, matches, meetings, funding, docs }, mis, { profile }, fin, accounts, deck] = await Promise.all([
    getStartupDetail(startupId),
    listMisFiles(startupId),
    getProfileForReview(startupId),
    getFinancials(startupId),
    getFounderAccounts(startupId),
    getStartupDeck(startupId),
  ]);
  if (!startup) notFound();
  // Only real investor meetings count: internal, rehearsal and cancelled ones are dropped,
  // and a meeting still on the calendar counts as held once its time has passed.
  const nowMs = Date.now();
  const investorMeetings = withPastMeetingsHeld(toFounderMeetings(meetings, startup.name, new Map()), nowMs);
  const at = (m: { scheduled_at: string | null }) => (m.scheduled_at ? Date.parse(m.scheduled_at) : NaN);
  const upcomingMeetings = investorMeetings.filter((m) => at(m) >= nowMs).sort((a, b) => at(a) - at(b));
  const pastMeetings = investorMeetings.filter((m) => !(at(m) >= nowMs)).sort((a, b) => (at(b) || 0) - (at(a) || 0));
  // Deals shared, from the PIPELINE tab: the same rows and rules as the founder's dashboard
  // and the admin Deal sharing page, so all three agree.
  const deals = await getStartupDeals(startup.name);
  const pairs = categorizedPairs(
    deals.rows,
    investorMeetings.map((m) => ({ startup_name: startup.name, investor_name: [m.notes, m.investor_name].filter(Boolean).join(" "), scheduled_at: m.scheduled_at })),
  );
  const shares = sharesFromPairs(pairs, investorMeetings, nowMs);
  const dealsFailed = deals.state !== "ready";
  const shareCounts = dealShareCounts(shares);
  const monthPoints = fin.ready ? monthlySeries(fin.months) : [];
  const yearPoints = fin.ready ? yearSeries(yearRows(fin.years, null)) : [];
  const mrr = fin.ready ? latestMrr(fin.months) : null;
  const profileStatus = profile?.status ?? null;
  const progress = profileProgress(startup, profile?.answers ?? null);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/startups"
        className="inline-flex items-center gap-1 text-sm text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" /> Back to startups
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-navy-900">
            {startup.name ?? `#${startup.id}`}
          </h2>
          <p className="text-sm text-navy-500">
            {startup.sector ?? "—"}
            {startup.subsector ? ` · ${startup.subsector}` : ""} ·{" "}
            {startup.stage ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profileStatus ? (
            <a href={`/admin/profiles/${startup.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:underline">
              Founder profile
              <Badge tone={PROFILE_STATUS_META[profileStatus].tone}>{PROFILE_STATUS_META[profileStatus].label}</Badge>
            </a>
          ) : null}
          <StatusBadge value={startup.bucket} kind="bucket" />
          <StatusBadge value={startup.status} kind="startup" />
        </div>
      </div>

      <section id="founder-profile" className="space-y-4">
        <Card>
          <CardHeader
            title="Founder profile"
            subtitle={
              profile
                ? `${progress.done} of ${progress.total} details complete · last updated ${formatDateTime(profile.updated_at)}`
                : "The founder hasn't started their profile yet. What is on record is shown below."
            }
            action={
              profileStatus ? (
                <a href={`/admin/profiles/${startup.id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:underline">
                  Open review
                  <Badge tone={PROFILE_STATUS_META[profileStatus].tone}>{PROFILE_STATUS_META[profileStatus].label}</Badge>
                </a>
              ) : null
            }
          />
          <CardBody className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm md:grid-cols-2">
            <Row label="Login ID" value={String(startup.id)} />
            <Row label="Sign-in emails on file" value={accounts.emails.join(", ") || null} />
            {accounts.logins.length ? (
              accounts.logins.map((l, i) => (
                <div key={i} className="contents">
                  <Row label="Last sign-in" value={l.lastSignInAt ? formatDateTime(l.lastSignInAt) : "Never signed in"} />
                  <Row
                    label="Password"
                    value={!l.active ? "Login deactivated" : l.mustReset ? "Still on the one-time password" : "Changed by the founder"}
                  />
                </div>
              ))
            ) : (
              <Row label="Founder login" value="None yet" />
            )}
          </CardBody>
        </Card>
        <ProfileAnswers startup={startup} answers={profile?.answers ?? null} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Company" />
          <CardBody className="space-y-2 text-sm">
            <Row label="Owner / contact" value={startup.owner_name} />
            <Row label="Stage" value={startup.stage} />
            <Row label="Rule tier" value={startup.rule_tier} />
            <Row label="Score" value={startup.score?.toString()} />
            <Row label="Mandate signed" value={formatDate(startup.mandate_signed_on)} />
            <Row label="Mandate closed" value={formatDate(startup.mandate_closed_on)} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Financials" />
          <CardBody className="space-y-2 text-sm">
            <Row
              label="Ask"
              value={askDisplay(startup)}
            />
            <Row
              label="Allocation left"
              value={allocationDisplay(startup)}
            />
            <Row label="Revenue" value={formatLakh(startup.revenue_inr_l)} />
            <Row label="Burn" value={formatLakh(startup.burn_inr_l)} />
            <Row
              label="Runway"
              value={startup.runway_months ? `${startup.runway_months} mo` : null}
            />
            {startup.revenue_note ? (
              <p className="pt-1 text-xs text-navy-500">{toRupees(startup.revenue_note)}</p>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Notes" />
          <CardBody className="text-sm text-navy-600">
            {startup.notes ? (
              <p className="whitespace-pre-wrap">{toRupees(startup.notes)}</p>
            ) : (
              <p className="text-navy-400">No notes recorded.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <section id="deal-shares">
        <Card>
          <CardHeader
            title="Deals shared with investors"
            subtitle={
              dealsFailed
                ? "Couldn't load the PIPELINE deals right now. Reload to try again."
                : `Shared with ${shareCounts.shared} investor${shareCounts.shared === 1 ? "" : "s"} · ${shareCounts.replied} replied · ${shareCounts.positive} interested or meeting · ${shareCounts.passed} passed · ${shareCounts.meetings} with a meeting`
            }
          />
          <CardBody className="p-0">
            <DealSharesPanel shares={shares} failed={dealsFailed} />
          </CardBody>
        </Card>
      </section>

      <section id="founder-graphs">
        <Card>
          <CardHeader
            title="Founder's financial graphs"
            subtitle={
              monthPoints.length || yearPoints.length
                ? `From the figures the founder uploaded${mrr ? ` · latest MRR ${formatLakh(mrr.value)} (${monthLabel(mrr.month)})` : ""}`
                : "The founder hasn't uploaded their figures yet."
            }
          />
          {monthPoints.length >= 2 || yearPoints.length >= 2 ? (
            <CardBody className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Monthly revenue vs expenses</p>
                {monthPoints.length >= 2 ? (
                  <RevenueExpensesChart data={monthPoints} />
                ) : (
                  <p className="text-sm text-navy-400">Needs at least two months of figures.</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">Revenue by year</p>
                {yearPoints.length >= 2 ? (
                  <YearlyRevenueChart data={yearPoints} />
                ) : (
                  <p className="text-sm text-navy-400">Needs at least two years of figures.</p>
                )}
              </div>
            </CardBody>
          ) : null}
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Investor matches"
          subtitle={`${matches.length} match${matches.length === 1 ? "" : "es"}`}
        />
        <CardBody className="p-0">
          {matches.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No matches yet" />
            </div>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Investor</TH>
                  <TH>Type</TH>
                  <TH>Match</TH>
                  <TH>State</TH>
                  <TH>Fit</TH>
                  <TH>Priority</TH>
                </tr>
              </THead>
              <TBody>
                {matches.slice(0, 50).map((m) => (
                  <TR key={m.id}>
                    <TD className="font-medium text-navy-800">
                      {m.investor?.name ?? `#${m.investor_id}`}
                    </TD>
                    <TD className="text-navy-500">{m.investor?.type ?? "—"}</TD>
                    <TD className="text-navy-500">{m.type ?? "—"}</TD>
                    <TD>
                      <StatusBadge value={m.state} kind="match" />
                    </TD>
                    <TD className="text-navy-500">
                      {[m.stage_fit && "stage", m.cheque_fit && "cheque"]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </TD>
                    <TD className="text-navy-500">{m.priority ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Meetings"
            subtitle={`${investorMeetings.length} investor meeting${investorMeetings.length === 1 ? "" : "s"} · internal, rehearsal and cancelled ones are left out`}
          />
          <CardBody className="p-0 pt-2">
            <section id="meetings">
              <MeetingsTabs upcoming={upcomingMeetings} past={pastMeetings} />
            </section>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Funding & documents" />
          <CardBody className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Funding rounds
              </p>
              {funding.length === 0 ? (
                <p className="text-sm text-navy-400">
                  No funding rounds recorded.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {funding.map((f: any) => (
                    <li key={f.id} className="flex justify-between">
                      <span className="text-navy-700">
                        {f.round_name ?? f.instrument ?? "Round"}
                      </span>
                      <span className="text-navy-500">
                        {fundingDisplay(f)} ·{" "}
                        {formatDate(f.closed_on)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Pitch deck
              </p>
              <div className="flex items-center justify-between gap-3 text-sm" data-deck>
                <span className="text-navy-700">Link investors receive</span>
                {deck?.deck_link && /^https?:\/\//i.test(deck.deck_link) ? (
                  <a href={deck.deck_link} target="_blank" rel="noopener noreferrer" className="truncate font-medium text-navy-800 hover:underline">
                    {deck.deck_link}
                  </a>
                ) : (
                  <span className="text-navy-400">No deck link in the sheet</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Documents requested from the founder
              </p>
              {docs.length === 0 ? (
                <p className="text-sm text-navy-400">No documents requested yet.</p>
              ) : (
                <ul className="divide-y divide-navy-50 text-sm" data-docs>
                  {docs.map((d: any) => (
                    <li key={d.id} className="flex items-start justify-between gap-3 py-1.5">
                      <span className="text-navy-700">{d.doc_type ?? "Document"}</span>
                      <span className="text-right text-xs text-navy-500">
                        {d.received_at ? (
                          <Badge tone="green">Received {formatDate(d.received_at)}</Badge>
                        ) : d.requested_at ? (
                          <Badge tone="amber">Requested {formatDate(d.requested_at)}</Badge>
                        ) : (
                          <Badge tone="gray">Not requested</Badge>
                        )}
                        {d.classification ? <span className="mt-0.5 block">{d.classification}</span> : null}
                        {d.chaser_count ? <span className="block">{d.chaser_count} reminder{d.chaser_count === 1 ? "" : "s"}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                MIS from the founder
              </p>
              <MisFiles files={mis.files} ready={mis.ready} />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                Figures from the founder&apos;s template
              </p>
              {!fin.ready ? (
                <p className="text-sm text-navy-400">Not switched on yet (MIGRATIONS/startup-financials.sql).</p>
              ) : fin.months.length + fin.years.length === 0 ? (
                <p className="text-sm text-navy-400">No figures uploaded yet.</p>
              ) : (
                <div className="space-y-3 text-sm">
                  {fin.months.length ? (
                    <table className="w-full text-left">
                      <thead className="text-xs text-navy-400">
                        <tr>
                          <th className="py-1 font-medium">Month</th>
                          <th className="py-1 font-medium">Revenue</th>
                          <th className="py-1 font-medium">MRR</th>
                          <th className="py-1 font-medium">Expenses</th>
                        </tr>
                      </thead>
                      <tbody className="text-navy-700">
                        {fin.months.slice(-6).reverse().map((m) => (
                          <tr key={m.month}>
                            <td className="py-0.5">{monthLabel(m.month)}</td>
                            <td className="py-0.5">{formatLakh(m.revenue_inr_l)}</td>
                            <td className="py-0.5">{formatLakh(m.mrr_inr_l)}</td>
                            <td className="py-0.5">{formatLakh(m.expenses_inr_l)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {fin.years.length ? (
                    <ul className="space-y-1">
                      {fin.years.map((y) => (
                        <li key={`${y.fy_start}-${y.kind}`} className="flex justify-between">
                          <span className="text-navy-700">
                            {fyLabel(y.fy_start)} {y.kind === "projected" ? "(projected)" : ""}
                          </span>
                          <span className="text-navy-500">{formatLakh(y.revenue_inr_l)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {fin.months.length > 6 ? <p className="text-xs text-navy-400">Showing the latest 6 of {fin.months.length} months.</p> : null}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <p className="text-xs text-navy-400">
        This view is read-only in Phase 1. Write actions (verification decisions,
        internal notes, information requests) are a flagged follow-up — they
        require either writes to existing columns or new additive tables, both
        pending your approval so no existing data is changed.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-navy-400">{label}</span>
      <span className="text-right font-medium text-navy-800">
        {value || "—"}
      </span>
    </div>
  );
}
