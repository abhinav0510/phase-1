import { Handshake, Send, Hourglass, Sparkles } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnMatches } from "@/lib/data/founder";
import { KpiCard, PageHeader, Note, MATCH_STATE_TONE, label } from "@/components/founder/ui";
import { Stagger, Item, Reveal } from "@/components/founder/motion";
import { ListDetail, type ListItem, type DetailSpec } from "@/components/founder/list-detail";
import { TYPE_LABEL } from "../dashboard/_components/model";
import { formatDate } from "@/lib/utils";

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

export default async function FounderFunding() {
  const { startupId } = await requireFounder();
  const matches = await getOwnMatches(startupId);
  const sent = matches.filter((m) => m.state === "sent").length;
  const queued = matches.filter((m) => m.state === "queued").length;
  const strongFit = matches.filter((m) => m.stage_fit && m.cheque_fit).length;

  const items: ListItem[] = matches.map((m) => ({
    id: String(m.id),
    title: m.investor?.name ?? "Investor",
    subtitle: m.investor?.type ? (TYPE_LABEL[m.investor.type] ?? label(m.investor.type)) : "Investor",
    chip: { label: STATE_LABEL[m.state ?? "not_queued"] ?? label(m.state), tone: MATCH_STATE_TONE[m.state ?? ""] ?? "neutral" },
    value: m.score != null ? `${m.score}` : undefined,
    group: groupOf(m.state),
  }));

  const details: Record<string, DetailSpec> = Object.fromEntries(
    matches.map((m) => [
      String(m.id),
      {
        eyebrow: m.investor?.type ? (TYPE_LABEL[m.investor.type] ?? label(m.investor.type)) : "Investor",
        heading: m.investor?.name ?? "Investor",
        chip: { label: STATE_LABEL[m.state ?? "not_queued"] ?? label(m.state), tone: "iris" },
        aside: m.score != null ? { label: "Match score", value: String(m.score) } : undefined,
        stats: [
          { label: "Stage fit", value: m.stage_fit === null ? "—" : m.stage_fit ? "Yes" : "No" },
          { label: "Cheque fit", value: m.cheque_fit === null ? "—" : m.cheque_fit ? "Yes" : "No" },
          { label: "Match type", value: m.type ? label(m.type) : "—" },
        ],
        rows: [
          { label: "Matched on", value: formatDate(m.created_at) },
          { label: "Priority", value: m.priority != null ? `#${m.priority}` : "—" },
        ],
        note:
          m.state === "sent"
            ? "Sidana has introduced you. Meetings booked from this intro show up under Meetings."
            : m.state === "queued"
              ? "Lined up for outreach. Sidana sends introductions in priority order."
              : undefined,
      } satisfies DetailSpec,
    ]),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fundraise"
        title="Investors & Matches"
        subtitle="Every investor Sidana's engine has matched to your startup, and where each one stands."
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Item>
          <KpiCard tone="accent" label="Matched investors" value={matches.length} icon={<Handshake className="h-4 w-4" />} hint="Fit by sector, stage and cheque" />
        </Item>
        <Item>
          <KpiCard label="Reached out" value={sent} icon={<Send className="h-4 w-4" />} delta={{ text: matches.length ? `${Math.round((sent / matches.length) * 100)}%` : "0%", tone: sent ? "good" : "neutral", arrow: sent ? "up" : "flat", hint: "of matches contacted" }} />
        </Item>
        <Item>
          <KpiCard label="In queue" value={queued} icon={<Hourglass className="h-4 w-4" />} hint="Waiting for the next outreach wave" />
        </Item>
        <Item>
          <KpiCard label="Strong fit" value={strongFit} icon={<Sparkles className="h-4 w-4" />} hint="Both stage and cheque match" />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Investor matches"
          subtitle="Select an investor to see the fit"
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

      <Note>
        Sidana runs the outreach for you. Investors move from <strong>In queue</strong> to <strong>Reached out</strong> as
        introductions go out, and any meetings booked appear under Meetings.
      </Note>
    </div>
  );
}
