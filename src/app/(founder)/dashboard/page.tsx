import Link from "next/link";
import { ArrowRight, Handshake, ImagePlus, XCircle } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnBranding, getOwnMatches, getOwnProfile, getOwnReplies, getOwnStartup, logoUrlFor, type MailReply } from "@/server/data/founder";
import { profileProgress } from "@/shared/lib/profile-fields";
import {
  KpiCard,
  ButtonLink,
  Chip,
  CompanyLogo,
  STARTUP_STATUS_TONE,
  Card,
  CardHeader,
  CardBody,
  EmptyState,
  Note,
  MATCH_STATE_TONE,
  label,
  type ChipTone,
} from "@/client/components/founder/ui";
import { Stagger, Item, Reveal } from "@/client/components/founder/motion";
import { ListDetail, type ListItem, type DetailSpec } from "@/client/components/founder/list-detail";
import { PassedList, type PassedItem } from "@/client/components/founder/passed-list";
import { profileView } from "@/client/components/founder/investor-format";
import { TYPE_LABEL } from "./_components/model";
import { formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

// Founders don't see Sidana's outreach queue: a queued match is just "Matched".
const STATE_LABEL: Record<string, string> = {
  sent: "Reached out",
  queued: "Matched",
  tracker_only: "Tracker only",
  paused: "Paused",
  not_queued: "Matched",
};
const stateChip = (state: string | null): { label: string; tone: ChipTone } =>
  state === "sent" || state === "tracker_only"
    ? { label: STATE_LABEL[state], tone: MATCH_STATE_TONE[state] ?? "neutral" }
    : { label: STATE_LABEL[state ?? "not_queued"] ?? label(state), tone: "neutral" };

function groupOf(state: string | null) {
  return state === "sent" ? "sent" : "other";
}

/** Heading over the reply gist, by how the investor replied. */
function replyLabel(kind: string | null): string {
  if (kind === "pass") return "Why they passed";
  if (kind === "interested") return "What they said";
  if (kind === "invite") return "They asked to meet";
  return "Their reply";
}

function typeLabelOf(type: string | null | undefined): string | null {
  return type ? (TYPE_LABEL[type] ?? label(type)) : null;
}

export default async function FounderDashboard() {
  const { startupId } = await requireFounder();
  const [matches, replies, s, branding, profile] = await Promise.all([
    getOwnMatches(startupId),
    getOwnReplies(startupId),
    getOwnStartup(startupId),
    getOwnBranding(startupId),
    getOwnProfile(startupId),
  ]);
  const logoUrl = logoUrlFor(branding);
  const progress = profileProgress(s, profile?.answers ?? null);

  // replies arrive newest-first; keep the latest reply, and the latest pass, per investor.
  const latestByInvestor = new Map<number, MailReply>();
  const passedByInvestor = new Map<number, MailReply>();
  for (const r of replies) {
    if (!latestByInvestor.has(r.investor_id)) latestByInvestor.set(r.investor_id, r);
    if (r.reply_kind === "pass" && !passedByInvestor.has(r.investor_id)) passedByInvestor.set(r.investor_id, r);
  }
  // Only surface passes from investors the founder can otherwise see. matches
  // already excludes paused outreach upstream, so this also keeps paused
  // investors out of the Passed section.
  const visibleInvestorIds = new Set(
    matches.map((m) => m.investor?.id).filter((x): x is number => x != null),
  );
  const passed = Array.from(passedByInvestor.values()).filter((r) =>
    visibleInvestorIds.has(r.investor_id),
  );
  const passedItems: PassedItem[] = passed.map((r) => ({
    key: String(r.investor_id),
    name: r.investor_name ?? "Investor",
    date: formatDate(r.sent_at),
    reason: r.reply_gist ?? "No reason recorded.",
    profile: profileView(r.investor, typeLabelOf(r.investor?.type)),
  }));

  const items: ListItem[] = matches.map((m) => {
    const invId = m.investor?.id;
    const didPass = invId != null && passedByInvestor.has(invId);
    const chip: { label: string; tone: ChipTone } = didPass
      ? { label: "Passed", tone: "red" }
      : stateChip(m.state);
    return {
      id: String(m.id),
      title: m.investor?.name ?? "Investor",
      subtitle: m.investor?.type ? (TYPE_LABEL[m.investor.type] ?? label(m.investor.type)) : "Investor",
      chip,
      value: m.score != null ? `${m.score}` : undefined,
      group: groupOf(m.state),
    };
  });

  const details: Record<string, DetailSpec> = Object.fromEntries(
    matches.map((m) => {
      const invId = m.investor?.id;
      const reply = invId != null ? latestByInvestor.get(invId) : undefined;
      const didPass = invId != null && passedByInvestor.has(invId);
      const prof = profileView(m.investor, typeLabelOf(m.investor?.type));
      return [
        String(m.id),
        {
          eyebrow: m.investor?.type ? (TYPE_LABEL[m.investor.type] ?? label(m.investor.type)) : "Investor",
          heading: m.investor?.name ?? "Investor",
          chip: didPass
            ? { label: "Passed", tone: "red" }
            : { label: stateChip(m.state).label, tone: "ocean" },
          aside: m.score != null ? { label: "Match score", value: String(m.score) } : undefined,
          stats: [
            { label: "Cheque size", value: prof.cheque },
            { label: "Geography", value: prof.geography ?? "—" },
          ],
          quote: reply?.reply_gist ? { label: replyLabel(reply.reply_kind), text: reply.reply_gist } : undefined,
          tags: [
            { label: "Sectors they invest in", items: prof.sectors.length ? prof.sectors : ["Not specified"] },
            { label: "Stages they back", items: prof.stages.length ? prof.stages : ["Not specified"] },
          ],
          rows: [
            { label: "Matched on", value: formatDate(m.created_at) },
            // No queue position: founders don't see Sidana's outreach order.
            ...(reply ? [{ label: "Last reply", value: formatDate(reply.sent_at) }] : []),
          ],
          note:
            didPass
              ? undefined
              : m.state === "sent"
                ? "Sidana has introduced you. Meetings booked from this intro show up under Meetings."
                : undefined,
        } satisfies DetailSpec,
      ];
    }),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
        <div className="flex min-w-0 items-center gap-4">
          {logoUrl ? (
            <CompanyLogo src={logoUrl} name={s?.name} size="xl" />
          ) : (
            <Link
              href="/profile#logo"
              title="Add your company logo"
              className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center gap-1 rounded-[20px] border-2 border-dashed border-navy-200 bg-white text-navy-400 transition hover:border-ocean-600 hover:bg-ocean-50 hover:text-ocean-600"
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Add logo</span>
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-tide md:text-[30px]">
              Welcome back, {s?.name ?? "founder"}
            </h1>
            <p className="mt-1 text-sm text-navy-500">
              Investors Sidana has matched to you, what they said and where each one stands
              {s?.sector || s?.stage ? <> · {[s?.sector, s?.stage].filter(Boolean).join(" · ")}</> : null}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {s?.status ? <Chip tone={STARTUP_STATUS_TONE[s.status] ?? "neutral"}>{label(s.status)}</Chip> : null}
          {progress.pct < 100 ? (
            <ButtonLink href="/profile#complete-profile">
              Complete profile <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          ) : (
            <ButtonLink href="/overview">
              Overview <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          )}
        </div>
      </div>

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Item>
          <KpiCard tone="accent" label="Investors Outreached" value={matches.length} icon={<Handshake className="h-4 w-4" />} hint="Fit by sector, stage and cheque" />
        </Item>
        <Item>
          <KpiCard label="Passed" value={passed.length} icon={<XCircle className="h-4 w-4" />} hint={passed.length ? "See reasons below" : "None so far"} />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Investor matches"
          subtitle="Select an investor to see their details and what they said"
          listLabel="Investors"
          tabs={[
            { key: "all", label: "All" },
            { key: "sent", label: "Reached out" },
            { key: "other", label: "Not contacted yet" },
          ]}
          items={items}
          details={details}
          emptyTitle="No investor matches yet"
          emptyMessage="As Sidana's match engine identifies fits, they'll appear here."
        />
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader
            title="Passed"
            subtitle={
              passed.length
                ? `${passed.length} investor${passed.length === 1 ? "" : "s"} passed — click one to see their profile`
                : "Investors who passed and the reason they gave will appear here"
            }
          />
          <CardBody className="p-2 pt-3">
            {passed.length === 0 ? (
              <div className="p-3">
                <EmptyState
                  title="No passes yet"
                  message="When an investor passes, the reason they gave in their reply shows up here."
                />
              </div>
            ) : (
              <PassedList items={passedItems} />
            )}
          </CardBody>
        </Card>
      </Reveal>

      <Note>
        Sidana runs the outreach for you. What an investor said is summarised from their reply; when someone passes, the
        reason they gave appears above and in the <strong>Passed</strong> section.
      </Note>
    </div>
  );
}
