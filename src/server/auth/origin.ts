import "server-only";

import { headers } from "next/headers";

/**
 * The public origin of this request. Behind nginx the internal address differs
 * from the public one, so it's built from the forwarded host and protocol (the
 * same rule middleware.ts uses for redirects).
 */
export async function publicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3007";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only same-site investor paths may be used as a post-sign-in destination. */
export function safeInvestorNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!/^\/investor\/[a-z0-9/_-]*$/i.test(next)) return null;
  if (next.startsWith("/investor/login")) return null;
  return next;
}
