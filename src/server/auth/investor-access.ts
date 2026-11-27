import "server-only";

import { createAdminClient } from "@/server/integrations/supabase/admin";
import type { InvestorPortalAccess } from "@/shared/types/db";

/**
 * Who a Google email belongs to (clause 2.1). Only investors Sidana has already
 * emailed are in `investors`, and only those whose reply opened access have a
 * live `investor_portal_access` row, so an unknown Google account never gets a
 * portal account.
 */

/** Every address in an email cell; some INVESTORS cells hold two ("a@x.com, b@y.com"). */
export function emailsInCell(cell: string | null | undefined): string[] {
  return (cell ?? "")
    .toLowerCase()
    .split(/[\s,;/|]+/)
    .map((e) => e.replace(/^[<(]+|[>).]+$/g, ""))
    .filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e));
}

export interface InvestorEmailRow {
  id: number;
  email: string | null;
  cc_email: string | null;
}

export type ResolveResult =
  | { kind: "investor"; investorId: number }
  | { kind: "not_on_list" }
  | { kind: "no_access" }
  | { kind: "ambiguous"; investorIds: number[] };

/**
 * Pure decision, unit-tested: which investor this email is, given the investor
 * rows and the access rows. An email on two investors that both have access is
 * refused rather than guessed (Sidana fixes the duplicate in the sheet or adds a
 * login email for the right one).
 */
export function decideInvestor(
  email: string,
  investors: InvestorEmailRow[],
  access: Pick<InvestorPortalAccess, "investor_id" | "login_emails" | "revoked_at">[],
): ResolveResult {
  const e = email.trim().toLowerCase();
  const live = access.filter((a) => !a.revoked_at);
  const byLoginEmail = live.filter((a) => (a.login_emails ?? []).map((x) => x.toLowerCase()).includes(e)).map((a) => a.investor_id);
  const onFile = investors.filter((i) => emailsInCell(i.email).includes(e) || emailsInCell(i.cc_email).includes(e)).map((i) => i.id);

  const candidates = [...new Set([...byLoginEmail, ...onFile])];
  if (!candidates.length) return { kind: "not_on_list" };
  const withAccess = candidates.filter((id) => live.some((a) => a.investor_id === id));
  if (!withAccess.length) return { kind: "no_access" };
  if (withAccess.length > 1) return { kind: "ambiguous", investorIds: withAccess };
  return { kind: "investor", investorId: withAccess[0] };
}

/** Loads what decideInvestor needs for one email. */
export async function resolveInvestorForEmail(email: string): Promise<ResolveResult> {
  const e = email.trim().toLowerCase();
  if (!e.includes("@")) return { kind: "not_on_list" };
  const admin = createAdminClient();
  // ilike '%x%' then exact parsing, so cells with two addresses are found too.
  const pattern = `%${e.replace(/[%_\\,()]/g, "")}%`;
  const [inv, acc] = await Promise.all([
    admin.from("investors").select("id,email,cc_email").or(`email.ilike.${pattern},cc_email.ilike.${pattern}`).limit(20),
    admin.from("investor_portal_access").select("investor_id,login_emails,revoked_at"),
  ]);
  if (inv.error) throw new Error(`Could not read investors: ${inv.error.code || inv.error.message}`);
  if (acc.error) throw new Error(`Could not read investor_portal_access: ${acc.error.code || acc.error.message}`);
  const investors = (inv.data ?? []) as InvestorEmailRow[];
  const access = (acc.data ?? []) as Pick<InvestorPortalAccess, "investor_id" | "login_emails" | "revoked_at">[];
  // Access rows for investors whose email didn't match are only used for login_emails.
  return decideInvestor(e, investors, access);
}
