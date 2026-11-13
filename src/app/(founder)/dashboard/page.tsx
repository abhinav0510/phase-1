import Link from "next/link";
import { ArrowRight, Handshake, ImagePlus, XCircle } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { FOUNDER_STATUS, getOwnBranding, getOwnMeetings, getOwnOutreach, getOwnProfile, getOwnReplies, getOwnStartup, logoUrlFor, type MailReply, type OutreachRow } from "@/server/data/founder";
import { isResponse, type DealCategory } from "@/shared/lib/deal-sharing";
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
  label,
  type ChipTone,
} from "@/client/components/founder/ui";
import { Stagger, Item, Reveal } from "@/client/components/founder/motion";
import { ListDetail, type ListItem, type DetailSpec } from "@/client/components/founder/list-detail";
import { PassedList, type PassedItem } from "@/client/components/founder/passed-list";
import { profileView } from "@/client/components/founder/investor-format";
import { TYPE_LABEL, interestedInvestorNames } from "./_components/model";
import { InterestedInvestorsCard } from "./_components/interested-card";
import { formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const CHIP_TONE: Record<DealCategory, ChipTone> = {
  meeting: "green",
  tobook: "green",
  interested: "ocean",
  passed: "red",
  referred: "neutral",
  other: "neutral",
  bounced: "neutral",
  none: "neutral",
};
const chipOf = (c: DealCategory): { label: string; tone: ChipTone } => ({ label: FOUNDER_STATUS[c], tone: CHIP_TONE[c] });

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
  const [outreach, replies, s, branding, profile, meetings] = await Promise.all([
    getOwnOutreach(startupId),
    getOwnReplies(startupId),
    getOwnStartup(startupId),
    getOwnBranding(startupId),
    getOwnProfile(startupId),
    getOwnMeetings(startupId),
  ]);
  const logoUrl = logoUrlFor(branding);
  // Investors with at least one meeting, each counted once.
  const interestedNames = interestedInvestorNames(meetings);
  const interested = interestedNames.length;
  const progress = profileProgress(s, profile?.answers ?? null);

  // Every investor firm the deal was shared with, from the PIPELINE tab (synced every few
  // minutes), counted like the admin Deal sharing page: one row per firm.
  const deals: OutreachRow[] = outreach.rows;
  const passed = deals.filter((d) => d.category === "passed");
  const replied = deals.filter((d) => isResponse(d.category)).length;

  // The investor's own words, where their reply came in by email (contacts already hidden).
  const latestByInvestor = new Map<number, MailReply>();
  const passByInvestor = new Map<number, MailReply>();
  for (const r of replies) {
    if (!latestByInvestor.has(r.investor_id)) latestByInvestor.set(r.investor_id, r);
    if (r.reply_kind === "pass" && !passByInvestor.has(r.investor_id)) passByInvestor.set(r.investor_id, r);
  }
  const replyOf = (d: OutreachRow) => (d.investor_id != null ? latestByInvestor.get(d.investor_id) : undefined);

  const passedItems: PassedItem[] = passed.map((d) => ({
    key: String(d.id),
    name: d.firm,
    date: formatDate(d.firstShared),
    reason: (d.investor_id != null ? passByInvestor.get(d.investor_id)?.reply_gist : null) ?? d.passReason ?? "No reason recorded.",
    profile: profileView(d.investor, typeLabelOf(d.investor?.type)),
  }));

  const items: ListItem[] = deals.map((d) => ({
    id: String(d.id),
    title: d.firm,
    subtitle: d.investor?.type ? (TYPE_LABEL[d.investor.type] ?? label(d.investor.type)) : "Investor",
    chip: chipOf(d.category),
    group: isResponse(d.category) ? "replied" : "waiting",
  }));

  const details: Record<string, DetailSpec> = Object.fromEntries(
    deals.map((d) => {
      const reply = replyOf(d);
      const prof = profileView(d.investor, typeLabelOf(d.investor?.type));
      const quote =
        d.category === "passed" && (reply?.reply_kind === "pass" ? reply.reply_gist : d.passReason)
          ? { label: "Why they passed", text: (reply?.reply_kind === "pass" ? reply.reply_gist : d.passReason) as string }
          : reply?.reply_gist
            ? { label: replyLabel(reply.reply_kind), text: reply.reply_gist }
            : undefined;
      return [
        String(d.id),
        {
          eyebrow: d.investor?.type ? (TYPE_LABEL[d.investor.type] ?? label(d.investor.type)) : "Investor",
          heading: d.firm,
          chip: chipOf(d.category),
          stats: [
            { label: "Cheque size", value: prof.cheque },
            { label: "Geography", value: prof.geography ?? "—" },
          ],
          quote,
          tags: [
            { label: "Sectors they invest in", items: prof.sectors.length ? prof.sectors : ["Not specified"] },
            { label: "Stages they back", items: prof.stages.length ? prof.stages : ["Not specified"] },
          ],
          rows: [
            { label: "Deal shared on", value: formatDate(d.firstShared) },
            ...(d.shares > 1 ? [{ label: "Times shared", value: String(d.shares) }] : []),
            ...(reply ? [{ label: "Last reply", value: formatDate(reply.sent_at) }] : []),
          ],
          note:
            d.category === "passed"
              ? undefined
              : "Sidana has shared your deal with this investor. Meetings booked from it show up under Meetings.",
        } satisfies DetailSpec,
      ];
    }),
  );
  const syncedNote =
    outreach.syncedAt != null ? `Updated ${new Date(outreach.syncedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}` : null;

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

      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Item>
          <div data-kpi="outreached" className="h-full">
          <KpiCard
            tone="accent"
            label="Investors Outreached"
            value={outreach.state === "ready" ? deals.length : "—"}
            icon={<Handshake className="h-4 w-4" />}
            hint={outreach.state === "ready" ? `Replied: ${replied}${syncedNote ? ` · ${syncedNote}` : ""}` : "Updating, check back shortly"}
          />
          </div>
        </Item>
        <Item>
          <div data-kpi="passed" className="h-full">
          <KpiCard label="Passed" value={passed.length} icon={<XCircle className="h-4 w-4" />} hint={passed.length ? "See reasons below" : "None so far"} />
          </div>
        </Item>
        <Item>
          <InterestedInvestorsCard count={interested} names={interestedNames} />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Investors outreached"
          subtitle="Every investor Sidana has shared your deal with. Select one to see their details and what they said"
          listLabel="Investors"
          tabs={[
            { key: "all", label: "All" },
            { key: "replied", label: "Replied" },
            { key: "waiting", label: "Awaiting reply" },
          ]}
          items={items}
          details={details}
          emptyTitle={outreach.state === "ready" ? "No investors outreached yet" : "Your outreach is updating"}
          emptyMessage={
            outreach.state === "ready"
              ? "As soon as Sidana shares your deal with an investor, they appear here."
              : "We couldn't load your outreach just now. Reload the page in a minute."
          }
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
