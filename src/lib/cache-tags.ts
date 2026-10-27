/**
 * Cache tags + TTLs shared between the data layer (which tags cached reads) and
 * the server actions (which invalidate them). Pure strings/numbers so any module
 * — server-only or not — can import them without pulling in data access.
 */

/** How long a founder's own cached data may be served before a background refresh. */
export const FOUNDER_TTL_SECONDS = 60;

/** Tag for everything cached under one startup. revalidateTag(startupTag(id)) clears it. */
export function startupTag(startupId: number): string {
  return `startup:${startupId}`;
}
