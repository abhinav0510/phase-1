import { Handshake, CalendarClock, XCircle, PhoneForwarded } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnStartup, getOwnWeeklyReports } from "@/lib/data/founder";
import { KpiCard, PageHeader, Card, CardBody, EmptyState, Note, type ChipTone, type DeltaTone } from "@/components/founder/ui";
import { Stagger, Item, Reveal } from "@/components/founder/motion";
import { ListDetail, type ListItem, type DetailSpec } from "@/components/founder/list-detail";
import { formatDate } from "@/lib/utils";
import type { WeeklyReport } from "@/lib/types/db";

export const dynamic = "force-dynamic";

function weekLabel(r: WeeklyReport): string {
  const start = formatDate(r.week_start);
  const end = r.week_end ? formatDate(r.week_end) : null;
  return end ? `${start} – ${end}` : start;
}

type ReportKind = "emailed" | "reconstructed";

/** Emailed to the founder, or rebuilt later from pipeline data (quiet un-emailed weeks are filtered out upstream). */
function reportKind(r: WeeklyReport): ReportKind {
  return r.source === "backfill-recomputed" ? "reconstructed" : "emailed";
}

const KIND_CHIP: Record<ReportKind, { label: string; tone: ChipTone }> = {
  emailed: { label: "Emailed", tone: "green" },
  reconstructed: { label: "Reconstructed", tone: "teal" },
};

const KIND_NOTE: Record<ReportKind, string | undefined> = {
  emailed: undefined,
  reconstructed:
    "Reconstructed from Sidana's pipeline activity for this week. No report email was sent at the time, and the figures reflect the pipeline as it stands today.",
};

function delta(cur: number, prev: number | undefined, upIsGood = true) {
  if (prev === undefined) return { text: "First report", tone: "neutral" as DeltaTone, arrow: "flat" as const };
  const d = cur - prev;
  if (d === 0) return { text: "No change", tone: "neutral" as DeltaTone, arrow: "flat" as const, hint: "vs last week" };
  const good = d > 0 === upIsGood;
  return {
    text: `${d > 0 ? "+" : ""}${d}`,
    tone: (good ? "good" : "bad") as DeltaTone,
    arrow: d > 0 ? ("up" as const) : ("down" as const),
    hint: "vs last week",
  };
}

export default async function WeeklyReportsPage() {
  const { startupId } = await requireFounder();
  const [startup, reports] = await Promise.all([getOwnStartup(startupId), getOwnWeeklyReports(startupId)]);
  const latest = reports[0];
  const prev = reports[1];

  const items: ListItem[] = reports.map((r) => ({
    id: String(r.id),
    title: `Week of ${formatDate(r.week_start)}`,
    subtitle: weekLabel(r),
    avatar: formatDate(r.week_start).slice(0, 2),
    chip: KIND_CHIP[reportKind(r)],
    value: `${r.reached} reached`,
  }));

  const details: Record<string, DetailSpec> = Object.fromEntries(
    reports.map((r) => [
      String(r.id),
      {
        eyebrow: "Weekly fundraising report",
        heading: weekLabel(r),
        person: r.owner_name ? { name: r.owner_name, role: "Your Sidana contact" } : undefined,
        stats: [
          { label: "Investors reached", value: String(r.reached) },
          { label: "Follow-ups", value: String(r.followups) },
          { label: "Meetings scheduled", value: String(r.meetings) },
          { label: "Passed", value: String(r.passed) },
          { label: "Feedback notes", value: String(r.feedback_count ?? (r.feedback_list ?? []).length) },
        ],
        lists: [
          { title: "Meetings scheduled with investors", items: (r.meeting_list ?? []).filter(Boolean), empty: "No meetings scheduled this week." },
          { title: "Investors who passed", items: (r.passed_list ?? []).filter(Boolean), empty: "No investor passed this week." },
          { title: "Feedback after meetings", items: (r.feedback_list ?? []).filter(Boolean), empty: "No post-meeting feedback this week." },
        ],
        chip: KIND_CHIP[reportKind(r)],
        rows: r.sent_to ? [{ label: "Emailed to", value: r.sent_to }] : undefined,
        note: KIND_NOTE[reportKind(r)],
      } satisfies DetailSpec,
    ]),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Every Saturday"
        title="Weekly Reports"
        subtitle={`The weekly fundraising update Sidana emails ${startup?.name ?? "you"}, kept here week by week.`}
      />

      {!latest ? (
        <Card>
          <CardBody className="p-8">
            <EmptyState
              title="No weekly reports yet"
              message="Your first weekly report will appear here after the next Saturday run. Reports are also emailed to you."
            />
          </CardBody>
        </Card>
      ) : (
        <>
          <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Item>
              <KpiCard tone="accent" label="Investors reached" value={latest.reached} icon={<Handshake className="h-4 w-4" />} delta={delta(latest.reached, prev?.reached)} />
            </Item>
            <Item>
              <KpiCard label="Follow-ups" value={latest.followups} icon={<PhoneForwarded className="h-4 w-4" />} delta={delta(latest.followups, prev?.followups)} />
            </Item>
            <Item>
              <KpiCard label="Meetings scheduled" value={latest.meetings} icon={<CalendarClock className="h-4 w-4" />} delta={delta(latest.meetings, prev?.meetings)} />
            </Item>
            <Item>
              <KpiCard label="Passed deals" value={latest.passed} icon={<XCircle className="h-4 w-4" />} delta={delta(latest.passed, prev?.passed, false)} />
            </Item>
          </Stagger>

          <Reveal>
            <ListDetail
              title="Report archive"
              subtitle={`Latest: week of ${formatDate(latest.week_start)}`}
              listLabel="Weeks"
              items={items}
              details={details}
              emptyTitle="No reports"
            />
          </Reveal>
        </>
      )}

      <Note>
        Each Saturday we summarise the week&apos;s fundraising activity: investors reached, follow-ups, meetings
        scheduled, passes, and any feedback from investor meetings.
      </Note>
    </div>
  );
}
