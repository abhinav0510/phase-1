import { Handshake, Send, Hourglass, Sparkles, XCircle } from "lucide-react";
import { requireFounder } from "@/server/auth/session";
import { getOwnMatches, getOwnReplies, type MailReply } from "@/server/data/founder";
import {
  KpiCard,
  PageHeader,
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
import { TYPE_LABEL } from "../dashboard/_components/model";
import { formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const STATE_LABEL: Record<string, string> = {
  sent: "Reached out",
  queued: "In queue",
  tracker_only: "Tracker only",
  paused: "Paused",
  not_queued: "Not queued",
};

function groupOf(state: string | null) {
  if (state === "sent") return "sent";
  if (state === "queued") return "queued";
  return "other";
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

export default async function FounderFunding() {
  const { startupId } = await requireFounder();
  const [matches, replies] = await Promise.all([getOwnMatches(startupId), getOwnReplies(startupId)]);
  const sent = matches.filter((m) => m.state === "sent").length;
  const queued = matches.filter((m) => m.state === "queued").length;
  const strongFit = matches.filter((m) => m.stage_fit && m.cheque_fit).length;

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
      : { label: STATE_LABEL[m.state ?? "not_queued"] ?? label(m.state), tone: MATCH_STATE_TONE[m.state ?? ""] ?? "neutral" };
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
            : { label: STATE_LABEL[m.state ?? "not_queued"] ?? label(m.state), tone: "ocean" },
          aside: m.score != null ? { label: "Match score", value: String(m.score) } : undefined,
          stats: [
            { label: "Cheque size", value: prof.cheque },
            { label: "Geography", value: prof.geography ?? "—" },
            { label: "Stage fit", value: m.stage_fit === null ? "—" : m.stage_fit ? "Yes" : "No" },
            { label: "Cheque fit", value: m.cheque_fit === null ? "—" : m.cheque_fit ? "Yes" : "No" },
            { label: "Match type", value: m.type ? label(m.type) : "—" },
          ],
          quote: reply?.reply_gist ? { label: replyLabel(reply.reply_kind), text: reply.reply_gist } : undefined,
          tags: [
            { label: "Sectors they invest in", items: prof.sectors },
            { label: "Stages they back", items: prof.stages },
          ],
          rows: [
            { label: "Matched on", value: formatDate(m.created_at) },
            { label: reply ? "Last reply" : "Priority", value: reply ? formatDate(reply.sent_at) : m.priority != null ? `#${m.priority}` : "—" },
          ],
          note:
            didPass
              ? undefined
              : m.state === "sent"
                ? "Sidana has introduced you. Meetings booked from this intro show up under Meetings."
                : m.state === "queued"
                  ? "Lined up for outreach. Sidana sends introductions in priority order."
                  : undefined,
        } satisfies DetailSpec,
      ];
    }),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fundraise"
        title="Investors & Matches"
        subtitle="Every investor Sidana's engine has matched to your startup, what they said, and where each one stands."
      />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <Item>
          <KpiCard tone="accent" label="Matched investors" value={matches.length} icon={<Handshake className="h-4 w-4" />} hint="Fit by sector, stage and cheque" />
        </Item>
        <Item>
          <KpiCard label="Reached out" value={sent} icon={<Send className="h-4 w-4" />} delta={{ text: matches.length ? `${Math.round((sent / matches.length) * 100)}%` : "0%", tone: sent ? "good" : "neutral", arrow: sent ? "up" : "flat", hint: "of matches contacted" }} />
        </Item>
        <Item>
          <KpiCard label="In queue" value={queued} icon={<Hourglass className="h-4 w-4" />} hint="Waiting for the next wave" />
        </Item>
        <Item>
          <KpiCard label="Passed" value={passed.length} icon={<XCircle className="h-4 w-4" />} hint={passed.length ? "See reasons below" : "None so far"} />
        </Item>
        <Item>
          <KpiCard label="Strong fit" value={strongFit} icon={<Sparkles className="h-4 w-4" />} hint="Both stage and cheque match" />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Investor matches"
          subtitle="Select an investor to see the fit and what they said"
          listLabel="Investors"
          tabs={[
            { key: "all", label: "All" },
            { key: "sent", label: "Reached out" },
            { key: "queued", label: "In queue" },
            { key: "other", label: "Other" },
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
