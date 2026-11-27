import "server-only";

import { cache } from "react";
import { matchStartups, OPEN_STATUSES, type MatchReasons, type Thesis } from "@/shared/lib/thesis";
import { wasSharedWith } from "./history";
import { getPasses } from "./signals";
import { getInterestedCounts, getInterests, getInvestorMeetings } from "./engagement";
import { getInvestorSelf, getInvestorThesis, getListedStartups, investorLogoUrl, type ListedStartup } from "./thesis";

export interface MatchCard {
  startup: ListedStartup;
  logoUrl: string | null;
  reasons: MatchReasons;
  interestedCount: number;
  interested: boolean;
}

export interface InvestorMatches {
  thesis: Thesis | null;
  doNotContact: boolean;
  cards: MatchCard[];
}

/**
 * Startups that fit the investor's thesis right now (clause 2.4), computed on
 * every load so a thesis edit or a startup change shows at once. Read-only: the
 * agents' `matches` table and ENGINE-DAILY are never touched.
 */
export const getMatchesForInvestor = cache(async (investorId: number): Promise<InvestorMatches> => {
  const [self, thesis, startups, interests] = await Promise.all([
    getInvestorSelf(investorId),
    getInvestorThesis(investorId),
    getListedStartups(),
    getInterests(investorId),
  ]);
  const doNotContact = !!self?.do_not_contact || self?.status === "do_not_contact";
  if (doNotContact) return { thesis, doNotContact, cards: [] };

  // Deals they passed on in the portal stay out of Matches (they're under Past deals).
  const passed = new Set((await getPasses(investorId)).map((p) => p.startup_id));
  const results = matchStartups(startups, thesis).filter((r) => !passed.has(r.startup.id));
  const counts = await getInterestedCounts(results.map((r) => r.startup.id));
  return {
    thesis,
    doNotContact,
    cards: results.map((r) => ({
      startup: r.startup,
      logoUrl: investorLogoUrl(r.startup),
      reasons: r.reasons,
      interestedCount: counts.get(r.startup.id) ?? 0,
      interested: interests.has(r.startup.id),
    })),
  };
});

/**
 * Who may open a startup's profile (clause 2.5): it fits their thesis, or they
 * are interested in it, or they have a meeting with it, or Sidana shared it with
 * them by email and the round is still open. Checked before any
 * profile data is loaded; anything else is a 404.
 */
export async function canViewStartup(investorId: number, startupId: number): Promise<boolean> {
  const interests = await getInterests(investorId);
  if (interests.has(startupId)) return true;
  const { cards } = await getMatchesForInvestor(investorId);
  if (cards.some((c) => c.startup.id === startupId)) return true;
  if ((await getInvestorMeetings(investorId)).some((m) => m.startup_id === startupId)) return true;
  // A deal Sidana already emailed them about, while the round is still open.
  const s = (await getListedStartups()).find((x) => x.id === startupId);
  return !!s?.status && OPEN_STATUSES.includes(s.status) && (await wasSharedWith(investorId, startupId));
}
