import { requireInvestor } from "@/server/auth/session";
import { getMatchesForInvestor } from "@/server/data/investor/matches";
import { getDealHistory } from "@/server/data/investor/history";
import { getInterests } from "@/server/data/investor/engagement";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/client/components/founder/ui";
import { askDisplay, formatRupees } from "@/shared/lib/currency";
import { thesisOptions } from "@/shared/lib/thesis";
import { sectorLabel, stageLabel } from "@/shared/lib/sector-taxonomy";
import { MatchesView, type CardData } from "./matches-view";

export const dynamic = "force-dynamic";

/** Investor home (clause 2.4): live startups that fit the thesis, with an editable thesis (2.6). */
export default async function InvestorMatches() {
  const { investorId } = await requireInvestor();
  const [data, history, interests] = await Promise.all([
    getMatchesForInvestor(investorId),
    getDealHistory(investorId),
    getInterests(investorId),
  ]);
  // Same rule as the Shared deals page: unanswered, still raising, not marked interested in the portal.
  const awaiting = history.filter((h) => h.kind === "no_reply" && h.open && !interests.has(h.startupId)).length;
  const options = thesisOptions();

  const cards: CardData[] = data.cards.map((c) => ({
    id: c.startup.id,
    name: c.startup.name ?? "Startup",
    logoUrl: c.logoUrl,
    oneLiner: c.startup.one_liner,
    sector: c.reasons.sector,
    stage: c.startup.stage?.trim() || c.reasons.stage,
    room: c.reasons.roomCr != null ? formatRupees(c.reasons.roomCr * 1e7) : null,
    raising: askDisplay(c.startup),
    revenue: c.startup.revenue_inr_l != null ? formatRupees(Number(c.startup.revenue_inr_l) * 1e5) : null,
    interestedCount: c.interestedCount,
    interested: c.interested,
  }));

  const t = data.thesis;
  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Investor portal"
        title="Startups that fit your thesis"
        subtitle="Matched automatically from your sectors, stages and cheque size. Nothing here waits on the Sidana team."
      />
      {awaiting > 0 ? (
        <Link
          href="/investor/shared"
          className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-50 to-white px-4 py-3 text-sm text-tide ring-1 ring-amber-200 transition hover:ring-amber-300"
        >
          <Inbox className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <b>{awaiting}</b> {awaiting === 1 ? "deal Sidana shared with you is" : "deals Sidana shared with you are"} waiting for your reply.
          </span>
          <span className="ml-auto font-semibold text-ocean-700">See shared deals →</span>
        </Link>
      ) : null}
      <MatchesView
        thesis={{
          sectors: t?.sectors ?? [],
          stages: t?.stages ?? [],
          chequeMinCr: t?.chequeMinCr ?? null,
          chequeMaxCr: t?.chequeMaxCr ?? null,
          fromFile: t?.source === "sheet",
        }}
        sectorGroups={options.sectorGroups}
        stageOptions={options.stages}
        cards={cards}
        doNotContact={data.doNotContact}
        learned={{
          sectors: (t?.excludedSectors ?? []).map((k) => ({ key: k, label: sectorLabel(k) })),
          stages: (t?.excludedStages ?? []).map((k) => ({ key: k, label: stageLabel(k) })),
          minRevenueL: t?.minRevenueL ?? null,
        }}
      />
    </div>
  );
}
