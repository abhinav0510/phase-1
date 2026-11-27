import Link from "next/link";
import { CalendarCheck, Heart, Inbox, MailQuestion } from "lucide-react";
import { requireInvestor } from "@/server/auth/session";
import { getDealHistory, isLiveShared } from "@/server/data/investor/history";
import { getInterestedCounts, getInterests, getInvestorMeetings } from "@/server/data/investor/engagement";
import { currentMetrics } from "@/server/data/investor/signals";
import { PassButton } from "../pass-dialog";
import { Card, CardBody, Chip, CompanyLogo, KpiCard, Note, PageHeader, buttonClass, type ChipTone } from "@/client/components/founder/ui";
import { Item, Stagger } from "@/client/components/founder/motion";
import { askDisplay, formatRupees, toRupees } from "@/shared/lib/currency";
import { formatDate, formatDateTime } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Every live deal Sidana has emailed this investor about (the "Deals shared"
 * section), whether or not it fits their thesis: the ones waiting on their
 * reply, the ones they're interested in, and the ones with a meeting booked.
 */
export default async function SharedDeals() {
  const { investorId } = await requireInvestor();
  const [history, interests, meetings] = await Promise.all([
    getDealHistory(investorId),
    getInterests(investorId),
    getInvestorMeetings(investorId),
  ]);
  const live = history.filter(isLiveShared);
  const counts = await getInterestedCounts(live.map((h) => h.startupId));
  const metrics = new Map(await Promise.all(live.map(async (h) => [h.startupId, await currentMetrics(h.startupId)] as const)));
  const now = Date.now();

  const deals = live.map((h) => {
    const mine = meetings.filter((m) => m.startup_id === h.startupId && m.scheduled_at);
    const next = mine.filter((m) => Date.parse(m.scheduled_at!) >= now).sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!))[0];
    const met = mine.some((m) => Date.parse(m.scheduled_at!) < now);
    const status: { label: string; tone: ChipTone; group: "awaiting" | "interested" | "meeting" } = next
      ? { label: `Meeting ${formatDateTime(next.scheduled_at)}`, tone: "ocean", group: "meeting" }
      : met
        ? { label: "Met", tone: "ocean", group: "meeting" }
        : h.kind === "active" || interests.has(h.startupId)
          ? { label: "You're interested", tone: "green", group: "interested" }
          : { label: "Awaiting your reply", tone: "amber", group: "awaiting" };
    return { h, status, interested: counts.get(h.startupId) ?? 0 };
  });
  const count = (g: string) => deals.filter((d) => d.status.group === g).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="From Sidana"
        title="Shared deals"
        subtitle="Every live startup Sidana has sent you by email, whether or not it fits your thesis."
      />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Item>
          <KpiCard tone="accent" label="Shared with you" value={deals.length} icon={<Inbox className="h-4 w-4" />} hint="Still raising" />
        </Item>
        <Item>
          <KpiCard label="Awaiting your reply" value={count("awaiting")} icon={<MailQuestion className="h-4 w-4" />} hint="Have a look when you can" />
        </Item>
        <Item>
          <KpiCard label="Interested" value={count("interested")} icon={<Heart className="h-4 w-4" />} hint="No meeting yet" />
        </Item>
        <Item>
          <KpiCard label="Meetings" value={count("meeting")} icon={<CalendarCheck className="h-4 w-4" />} hint="Booked or held" />
        </Item>
      </Stagger>

      {deals.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="text-base font-semibold text-tide">No live deals shared yet</p>
            <p className="mt-1 text-sm text-navy-500">Startups Sidana emails you will appear here while they&apos;re raising.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {deals.map(({ h, status, interested }) => {
            const s = h.startup;
            return (
              <Card key={h.startupId} className="flex flex-col">
                <CardBody className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <CompanyLogo src={h.logoUrl} name={s?.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-tide">{s?.name ?? "Startup"}</h3>
                      <p className="text-xs text-navy-500">{[s?.sector, s?.stage].filter(Boolean).join(" · ")}</p>
                      {s?.one_liner ? <p className="mt-1 line-clamp-2 text-sm text-navy-500">{s.one_liner}</p> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip tone={status.tone}>{status.label}</Chip>
                    <span className="text-xs text-navy-500">Shared {formatDate(h.sharedAt)}</span>
                  </div>
                  {h.said ? (
                    <p className="rounded-xl bg-leaf-50 px-3 py-2 text-xs text-tide">
                      <span className="font-semibold">You said:</span> {toRupees(h.said)}
                    </p>
                  ) : null}
                  <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-navy-50/60 p-3 text-xs">
                    <div>
                      <dt className="text-navy-500">Raising</dt>
                      <dd className="mt-0.5 font-semibold text-tide">{s ? askDisplay(s) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-navy-500">Revenue</dt>
                      <dd className="mt-0.5 font-semibold text-tide">{s?.revenue_inr_l != null ? formatRupees(Number(s.revenue_inr_l) * 1e5) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-navy-500">Interested</dt>
                      <dd className="mt-0.5 font-semibold text-tide">{interested}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <Link href={`/investor/startup/${h.startupId}`} className={buttonClass("primary", "sm")}>
                      View profile
                    </Link>
                    <PassButton
                      target={{
                        startupId: h.startupId,
                        startupName: s?.name ?? "this startup",
                        sectorCodes: s?.sector_codes ?? [],
                        stageCode: s?.stage_code ?? null,
                        revenueL: s?.revenue_inr_l == null ? null : Number(s.revenue_inr_l),
                        metrics: metrics.get(h.startupId) ?? { mrr_l: null, arr_cr: null, growth_pct: null },
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Note>Deals you passed on, didn&apos;t close or didn&apos;t answer before the round ended are under Past deals.</Note>
    </div>
  );
}
