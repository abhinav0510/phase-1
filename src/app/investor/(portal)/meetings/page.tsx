import { CalendarClock, CheckCircle2, Sparkles } from "lucide-react";
import { requireInvestor } from "@/server/auth/session";
import { getInvestorMeetings } from "@/server/data/investor/engagement";
import { getListedStartups, investorLogoUrl } from "@/server/data/investor/thesis";
import { getConclusionsForMeetings } from "@/server/data/conclusions";
import { Card, CardBody, KpiCard, Note, PageHeader } from "@/client/components/founder/ui";
import { Item, Reveal, Stagger } from "@/client/components/founder/motion";
import { ListDetail, type DetailSpec, type ListItem } from "@/client/components/founder/list-detail";
import { formatDateTime } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const isHttp = (v: string | null | undefined): v is string => !!v && /^https?:\/\//i.test(v.trim());

/**
 * Investor "My meetings" (clause 2.9): the latest meeting's Fireflies conclusion
 * on top, then upcoming calls with their Meet link and past calls with their
 * conclusions. Only the conclusion (overview) is shown, never the transcript.
 */
export default async function InvestorMeetings() {
  const { investorId } = await requireInvestor();
  const [meetings, startups] = await Promise.all([getInvestorMeetings(investorId), getListedStartups()]);
  const names = new Map(startups.map((s) => [s.id, s.name ?? "Startup"]));
  const logos = new Map(startups.map((s) => [s.id, investorLogoUrl(s)]));
  const conclusions = await getConclusionsForMeetings(
    meetings.filter((m) => m.meeting_id != null).map((m) => ({ id: m.meeting_id!, fireflies_id: m.fireflies_id })),
  );
  const conclusionOf = (m: (typeof meetings)[number]) => (m.meeting_id != null ? conclusions.get(m.meeting_id) ?? null : null);

  const now = Date.now();
  const upcoming = meetings
    .filter((m) => m.scheduled_at && Date.parse(m.scheduled_at) >= now)
    .sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));
  const past = meetings.filter((m) => !upcoming.includes(m));
  const latest = past.find((m) => conclusionOf(m)) ?? null;

  const toItem = (m: (typeof meetings)[number], group: "upcoming" | "past"): ListItem => ({
    id: m.key,
    title: names.get(m.startup_id) ?? "Startup",
    logo: logos.get(m.startup_id) ?? null,
    subtitle: formatDateTime(m.scheduled_at),
    chip: group === "upcoming" ? { label: "Scheduled", tone: "amber" } : conclusionOf(m) ? { label: "Conclusion", tone: "green" } : { label: "Held", tone: "neutral" },
    group,
  });

  const details: Record<string, DetailSpec> = Object.fromEntries(
    meetings.map((m) => {
      const up = upcoming.includes(m);
      const c = conclusionOf(m);
      return [
        m.key,
        {
          eyebrow: "Meeting",
          heading: names.get(m.startup_id) ?? "Startup",
          chip: { label: up ? "Scheduled" : "Held", tone: "ocean" },
          aside: { label: "When", value: formatDateTime(m.scheduled_at) },
          quote: !up ? { label: "Conclusion · from Fireflies", text: c?.overview ?? "No Fireflies record yet." } : undefined,
          rows: [{ label: "Booked", value: m.portal_meeting_id ? "From your investor portal" : "By Sidana" }],
          action: up && isHttp(m.meet_link) ? { label: "Join Google Meet", href: m.meet_link!.trim(), external: true } : { label: "View startup", href: `/investor/startup/${m.startup_id}` },
          note: up && !isHttp(m.meet_link) ? "The Meet link will appear here once it's on the invite." : undefined,
        } satisfies DetailSpec,
      ];
    }),
  );

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Calendar" title="My meetings" subtitle="Your calls with Sidana's startups, and what came out of them." />

      {latest ? (
        <Reveal>
          <Card className="bg-gradient-to-br from-leaf-50 to-white">
            <CardBody>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-leaf-700">
                <Sparkles className="h-3.5 w-3.5" /> Latest conclusion · {names.get(latest.startup_id)} · {formatDateTime(latest.scheduled_at)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-tide">{conclusionOf(latest)!.overview}</p>
            </CardBody>
          </Card>
        </Reveal>
      ) : null}

      <Stagger className="grid grid-cols-2 gap-4">
        <Item>
          <KpiCard tone="accent" label="Upcoming" value={upcoming.length} icon={<CalendarClock className="h-4 w-4" />} hint={upcoming[0] ? `Next ${formatDateTime(upcoming[0].scheduled_at)}` : "Nothing scheduled"} />
        </Item>
        <Item>
          <KpiCard label="Held" value={past.length} icon={<CheckCircle2 className="h-4 w-4" />} hint={`${past.filter((m) => conclusionOf(m)).length} with a Fireflies conclusion`} />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Your meetings"
          subtitle="Select a meeting for its conclusion or join link"
          listLabel="Meetings"
          tabs={[
            { key: "upcoming", label: "Upcoming" },
            { key: "past", label: "Past" },
          ]}
          defaultTab={upcoming.length ? "upcoming" : "past"}
          items={[...upcoming.map((m) => toItem(m, "upcoming")), ...past.map((m) => toItem(m, "past"))]}
          details={details}
          emptyTitle="No meetings here yet"
          emptyMessage="Book a Google Meet from any startup's profile."
        />
      </Reveal>

      <Note>Times are shown in your local timezone. Conclusions appear after Fireflies has processed the call (daily at 17:30 IST).</Note>
    </div>
  );
}
