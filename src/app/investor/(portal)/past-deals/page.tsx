import { BellRing, History, MailX, ThumbsDown, XCircle } from "lucide-react";
import { requireInvestor } from "@/server/auth/session";
import { getDealHistory, isLiveShared } from "@/server/data/investor/history";
import { Card, CardBody, CardHeader, Chip, KpiCard, Note, PageHeader, buttonClass } from "@/client/components/founder/ui";
import { getTriggers } from "@/server/data/investor/signals";
import { getListedStartups } from "@/server/data/investor/thesis";
import { formatMetric, TRIGGER_LABEL } from "@/shared/lib/deal-signals";
import { cancelTrigger } from "../deal-actions";
import { Item, Reveal, Stagger } from "@/client/components/founder/motion";
import { ListDetail, type DetailSpec, type ListItem } from "@/client/components/founder/list-detail";
import { askDisplay, toRupees } from "@/shared/lib/currency";
import { formatDate } from "@/shared/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_NOTE: Record<string, string> = {
  closed: "The round has closed",
  mandate_closed: "Sidana's mandate has ended",
  silent: "The startup has gone quiet",
  blocked: "The startup is not raising right now",
};

/**
 * Deals Sidana shared with this investor in the past: the ones they passed on
 * (with their reason), the ones that didn't close, and the ones they never
 * answered. Built from the deal emails Sidana already syncs.
 */
export default async function PastDeals() {
  const { investorId } = await requireInvestor();
  const [all, triggers] = await Promise.all([getDealHistory(investorId), getTriggers(investorId)]);
  const history = all.filter((h) => !isLiveShared(h));
  const names = new Map(all.map((h) => [h.startupId, h.startup?.name ?? "Startup"]));
  const triggerNames = triggers.length
    ? new Map(((await getListedStartups()).map((x) => [x.id, x.name ?? "Startup"]) as [number, string][]))
    : names;
  const passed = history.filter((h) => h.kind === "passed");
  const notClosed = history.filter((h) => h.kind === "not_closed");
  const noReply = history.filter((h) => h.kind === "no_reply");

  const nameOf = (h: (typeof history)[number]) => h.startup?.name ?? "Startup";
  const items: ListItem[] = history.map((h) => ({
    id: String(h.startupId),
    title: nameOf(h),
    subtitle: [h.startup?.sector, h.startup?.stage].filter(Boolean).join(" · ") || undefined,
    logo: h.logoUrl,
    chip:
      h.kind === "passed"
        ? { label: "Passed", tone: "red" }
        : h.kind === "not_closed"
          ? { label: "Didn't close", tone: "amber" }
          : { label: "No reply", tone: "neutral" },
    value: formatDate(h.repliedAt ?? h.sharedAt),
    group: h.kind,
  }));

  const details: Record<string, DetailSpec> = Object.fromEntries(
    history.map((h) => {
      const status = h.startup?.status ?? "";
      const rows = [
        { label: "Shared by Sidana", value: formatDate(h.sharedAt) },
        ...(h.repliedAt ? [{ label: h.kind === "passed" ? "You passed on" : "You replied on", value: formatDate(h.repliedAt) }] : []),
        { label: "Round", value: h.open ? "Still raising" : STATUS_NOTE[status] ?? "No longer raising" },
        ...triggers
          .filter((t) => t.startup_id === h.startupId)
          .map((t) => ({
            label: t.fired_at ? "Your trigger · reached" : "Your trigger · watching",
            value: `${TRIGGER_LABEL[t.metric].label} ${formatMetric(t.metric, Number(t.threshold))}`,
          })),
      ];
      return [
        String(h.startupId),
        {
          eyebrow: h.kind === "passed" ? "You passed" : h.kind === "not_closed" ? "Didn't close" : "No reply",
          heading: nameOf(h),
          chip: { label: h.open ? "Still raising" : "Closed", tone: h.open ? "green" : "neutral" },
          aside: h.startup ? { label: "Raising", value: askDisplay(h.startup) } : undefined,
          quote:
            h.kind === "passed"
              ? { label: "Your reason for passing", text: h.said ? toRupees(h.said) : "No reason was given in the reply." }
              : h.kind === "not_closed" && h.said
                ? { label: "What you said", text: toRupees(h.said) }
                : undefined,
          rows,
          note:
            h.kind === "not_closed"
              ? `You were interested, but ${(STATUS_NOTE[status] ?? "the round is no longer open").toLowerCase()}.`
              : h.kind === "no_reply"
                ? h.open
                  ? "Sidana shared this deal and didn't hear back. It's still raising if you'd like a look."
                  : "Sidana shared this deal and didn't hear back. The round is no longer open."
                : h.startup?.one_liner ?? undefined,
          action: h.open ? { label: h.kind === "passed" ? "Take another look" : "View profile", href: `/investor/startup/${h.startupId}` } : undefined,
        } satisfies DetailSpec,
      ];
    }),
  );

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="History" title="Past deals" subtitle="What you passed on and why, what didn't close, and what you didn't get to before the round ended." />

      <Stagger className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Item>
          <KpiCard tone="accent" label="Past deals" value={history.length} icon={<History className="h-4 w-4" />} hint="Live ones are under Shared deals" />
        </Item>
        <Item>
          <KpiCard label="Passed" value={passed.length} icon={<ThumbsDown className="h-4 w-4" />} hint="With your reason" />
        </Item>
        <Item>
          <KpiCard label="Didn't close" value={notClosed.length} icon={<XCircle className="h-4 w-4" />} hint="Interested, round ended" />
        </Item>
        <Item>
          <KpiCard label="No reply" value={noReply.length} icon={<MailX className="h-4 w-4" />} hint="Round has ended" />
        </Item>
      </Stagger>

      <Reveal>
        <ListDetail
          title="Your past deals"
          subtitle="Select a deal for the details"
          listLabel="Startups"
          tabs={[
            { key: "passed", label: "Passed" },
            { key: "not_closed", label: "Didn't close" },
            { key: "no_reply", label: "No reply" },
          ]}
          defaultTab={passed.length ? "passed" : notClosed.length ? "not_closed" : "no_reply"}
          items={items}
          details={details}
          emptyTitle="Nothing here"
          emptyMessage="Deals Sidana shares with you by email will show up here once they're no longer live."
        />
      </Reveal>

      {triggers.length ? (
        <Card>
          <CardHeader title="Your revisit triggers" subtitle="We tell you when a startup you passed on reaches the target you set. Founders never see these." />
          <CardBody className="space-y-2 pt-2">
            {triggers.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-navy-50/60 px-3 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  <BellRing className={t.fired_at ? "h-4 w-4 text-leaf-600" : "h-4 w-4 text-ocean-600"} />
                  <b className="text-tide">{triggerNames.get(t.startup_id) ?? "Startup"}</b>
                  <span className="text-navy-600">
                    {TRIGGER_LABEL[t.metric].label.toLowerCase()} {formatMetric(t.metric, Number(t.threshold))}
                  </span>
                </span>
                {t.fired_at ? (
                  <Chip tone="green">Reached {formatDate(t.fired_at)}{t.fired_value != null ? ` · ${formatMetric(t.metric, Number(t.fired_value))}` : ""}</Chip>
                ) : (
                  <form action={cancelTrigger.bind(null, t.id)}>
                    <button type="submit" className={buttonClass("ghost", "sm")}>
                      Stop watching
                    </button>
                  </form>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Note>Reasons come from your email replies to Sidana and the passes you make here. If a reason looks wrong, reply to Sidana and the team will correct it.</Note>
    </div>
  );
}
