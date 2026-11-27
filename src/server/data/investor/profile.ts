import "server-only";

import { getOwnBranding, getOwnDeck, getOwnFunding, getOwnProfile } from "@/server/data/founder";
import { getStartup, type ResolvedStartup } from "@/server/data/startup-facts";
import { getFinancials } from "@/server/data/financials";
import { PAST_YEARS, PROFILE_FIELDS, SECTIONS, displayValue, isFilled, type SectionKey } from "@/shared/lib/profile-fields";
import type { MonthRow, YearRow } from "@/server/validators/financials-upload";
import { getInterestedCounts } from "./engagement";
import { createAdminClient } from "@/server/integrations/supabase/admin";

/**
 * What an investor sees on a startup profile (clause 2.5). Built from the same
 * data functions as the Founder Portal: the founder's latest saved answers are
 * final (decided 26 Nov), shown the moment they save. MIS files, statement links
 * and founder contact emails are never shown. A founder who hasn't written a
 * profile yet is shown from Sidana's deal-memo data (startup_profile_prefill).
 */

/** Answers investors never see. */
const HIDDEN = new Set(["financial_statements_link", "revenue_basis"]);

export interface ProfileSection {
  key: SectionKey;
  title: string;
  rows: { label: string; value: string; long: boolean }[];
}

export interface InvestorStartupProfile {
  startup: ResolvedStartup;
  /** When the founder last saved their profile. */
  updatedAt: string | null;
  /** Where the profile text came from: the founder's saved answers, Sidana's deal memo, or nothing yet. */
  source: "founder" | "memo" | null;
  oneLiner: string | null;
  description: string | null;
  sections: ProfileSection[];
  months: MonthRow[];
  years: YearRow[];
  /** Last financial year's revenue from the founder's profile, for a year the upload doesn't cover. */
  profileYear: { fy_start: number; revenue: number } | null;
  rounds: { name: string; closed_on: string | null; amount: string | null; lead: string | null }[];
  deckUrl: string | null;
  logoVersion: string | null;
  interestedCount: number;
}

export async function getStartupForInvestor(startupId: number): Promise<InvestorStartupProfile | null> {
  const [startup, profile, fin, funding, deck, branding, counts, memo] = await Promise.all([
    getStartup(startupId),
    getOwnProfile(startupId),
    getFinancials(startupId),
    getOwnFunding(startupId),
    getOwnDeck(startupId),
    getOwnBranding(startupId),
    getInterestedCounts([startupId]),
    getMemoAnswers(startupId),
  ]);
  if (!startup) return null;

  const saved = (profile?.answers ?? null) as Record<string, unknown> | null;
  const own = saved && Object.keys(saved).length ? saved : null;
  const answers = own ?? memo;
  const text = (k: string) => {
    const v = answers ? displayValue(answers[k]).trim() : "";
    return v || null;
  };

  const sections: ProfileSection[] = SECTIONS.map((sec) => ({
    key: sec.key,
    title: sec.title,
    rows: PROFILE_FIELDS.filter((f) => f.section === sec.key && !HIDDEN.has(f.key) && f.key !== "one_liner" && f.key !== "description")
      .map((f) => ({ label: f.label, value: text(f.key) ?? "", long: f.type === "textarea" }))
      .filter((r) => r.value),
  })).filter((s) => s.rows.length);

  return {
    startup,
    updatedAt: own ? profile?.updated_at ?? null : null,
    source: own ? "founder" : memo ? "memo" : null,
    oneLiner: text("one_liner"),
    description: text("description"),
    sections,
    months: fin.ready ? fin.months : [],
    years: fin.ready ? fin.years : [],
    profileYear:
      own && isFilled(own[PAST_YEARS[0].key]) && Number.isFinite(Number(own[PAST_YEARS[0].key]))
        ? { fy_start: Number(PAST_YEARS[0].label.slice(3, 7)), revenue: Number(own[PAST_YEARS[0].key]) }
        : null,
    rounds: (funding as { round_name: string | null; closed_on: string | null; as_written: string | null; lead_investor_name: string | null }[]).map((r) => ({
      name: r.round_name ?? "Round",
      closed_on: r.closed_on,
      amount: r.as_written,
      lead: r.lead_investor_name,
    })),
    deckUrl: deck?.resolved_url ?? deck?.deck_link ?? null,
    logoVersion: branding?.logo_path ? branding.updated_at ?? branding.logo_path : null,
    interestedCount: counts.get(startupId) ?? 0,
  };
}

/**
 * Sidana's deal-memo answers for a startup (imported from the profiles
 * template), or null. Only shown while the founder has no approved profile.
 */
async function getMemoAnswers(startupId: number): Promise<Record<string, unknown> | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("startup_profile_prefill").select("answers").eq("startup_id", startupId).maybeSingle();
  if (error) return null;
  const a = (data?.answers ?? null) as Record<string, unknown> | null;
  return a && Object.keys(a).length ? a : null;
}
