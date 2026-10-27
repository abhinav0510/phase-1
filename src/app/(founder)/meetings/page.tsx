import { CalendarClock, CheckCircle2, Repeat, Video } from "lucide-react";
import { requireFounder } from "@/lib/auth";
import { getOwnMeetings } from "@/lib/data/founder";
import { KpiCard, PageHeader, Note } from "@/components/founder/ui";
import { Stagger, Item, Reveal } from "@/components/founder/motion";
import { ListDetail, type ListItem, type DetailSpec } from "@/components/founder/list-detail";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isHttpUrl(v: string | null | undefined): v is string {
  return !!v && /^https?:\/\//i.test(v.trim());
}

export default async function FounderMeetings() {
  const { startupId } = await requireFounder();
  const meetings = await getOwnMeetings(startupId);
  const now = new Date();
  const isUpcoming = (m: (typeof meetings)[number]) =>
    !!m.scheduled_at && new Date(m.scheduled_at) >= now && !m.held;
  const upcoming = meetings.filter(isUpcoming).sort(
    (a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime(),
  );
  const past = meetings
    .filter((m) => !isUpcoming(m))
    .sort((a, b) => new Date(b.scheduled_at ?? b.created_at).getTime() - new Date(a.scheduled_at ?? a.created_at).getTime());
  const held = meetings.filter((m) => m.held).length;
  const second = meetings.filter((m) => m.is_second).length;
  const withLink = upcoming.filter((m) => isHttpUrl(m.meet_link)).length;

  const toItem = (m: (typeof meetings)[number], group: "upcoming" | "past"): ListItem => ({
    id: String(m.id),
    title: m.investor_name ?? "Investor",
    subtitle: formatDateTime(m.scheduled_at),
    chip: m.held
      ? { label: "Held", tone: "green" }
      : group === "upcoming"
        ? { label: "Scheduled", tone: "amber" }
        : { label: "Past", tone: "neutral" },
    value: m.is_second ? "2nd" : undefined,
    group,
  });

  const items: ListItem[] = [...upcoming.map((m) => toItem(m, "upcoming")), ...past.map((m) => toItem(m, "past"))];

  const details: Record<string, DetailSpec> = Object.fromEntries(
    meetings.map((m) => {
      const up = isUpcoming(m);
      return [
        String(m.id),
        {
          eyebrow: m.is_second ? "Second meeting" : "Investor meeting",
          heading: m.investor_name ?? "Investor",
          chip: { label: m.held ? "Held" : up ? "Scheduled" : "Past", tone: "iris" },
          aside: { label: "When", value: formatDateTime(m.scheduled_at) },
          stats: [
            { label: "Status", value: m.held ? "Held" : up ? "Upcoming" : "Not marked held" },
            { label: "Source", value: m.source ? m.source.replace(/_/g, " ") : "—" },
            { label: "Set up by", value: m.from_matcher ? "Sidana match" : "Sidana desk" },
          ],
          rows: [{ label: "Logged", value: formatDateTime(m.created_at) }],
          action: up && isHttpUrl(m.meet_link) ? { label: "Join meeting", href: m.meet_link!.trim(), external: true } : undefined,
          note: up && !isHttpUrl(m.meet_link) ? "The video link will appear here once it is added to the invite." : undefined,
        } satisfies DetailSpec,
      ];
    }),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Calendar"
        title="Meetings"
        subtitle="Investor conversations Sidana has set up for you, past and upcoming."
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Item>
          <KpiCard tone="accent" label="Upcoming" value={upcoming.length} icon={<CalendarClock className="h-4 w-4" />} hint={upcoming[0] ? `Next ${formatDateTime(upcoming[0].scheduled_at)}` : "Nothing scheduled yet"} />
        </Item>
        <Item>
          <KpiCard label="Held" value={held} icon={<CheckCircle2 className="h-4 w-4" />} delta={{ text: `${meetings.length ? Math.round((held / Math.max(1, meetings.length)) * 100) : 0}%`, tone: held ? "good" : "neutral", arrow: held ? "up" : "flat", hint: "of all meetings" }} />
        </Item>
        <Item>
          <KpiCard label="Second meetings" value={second} icon={<Repeat className="h-4 w-4" />} hint="Investors who came back" />
        </Item>
        <Item>
          <KpiCard label="Ready to join" value={withLink} icon={<Video className="h-4 w-4" />} hint="Upcoming with a video link" />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Your meetings"
          subtitle="Select a meeting for details and the join link"
          listLabel="Meetings"
          tabs={[
            { key: "upcoming", label: "Upcoming" },
            { key: "past", label: "Past" },
          ]}
          defaultTab={upcoming.length ? "upcoming" : "past"}
          items={items}
          details={details}
          emptyTitle="No meetings here yet"
          emptyMessage="Sidana books investor calls as introductions land."
        />
      </Reveal>

      <Note>Times are shown in your local timezone. Join links open in a new tab.</Note>
    </div>
  );
}
