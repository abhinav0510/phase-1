import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { FOUNDER_TTL_SECONDS, startupTag } from "@/server/config/cache-tags";
import { freshOrRefetch } from "@/server/data/cached-read";

export { createAdminClient };

export const INVESTOR_PROFILE_COLS = "id,name,type,sectors,stage_pref,cheque_min_cr,cheque_max_cr,cheque_as_written,geography";

export async function founderCache<T>(name: string, startupId: number, fn: () => Promise<T>): Promise<T> {
  const read = unstable_cache(async () => ({ at: Date.now(), value: await fn() }), ["v3", name, String(startupId)], {
    revalidate: FOUNDER_TTL_SECONDS,
    tags: [startupTag(startupId)],
  });
  return freshOrRefetch(await read(), FOUNDER_TTL_SECONDS * 1000, fn);
}

const TABLE_NOT_CREATED = new Set(["42P01", "PGRST205"]);

export function ok<R extends { error: { code?: string; message: string } | null }>(res: R, what: string): R {
  if (res.error && !TABLE_NOT_CREATED.has(res.error.code ?? "")) {
    throw new Error(`Could not read ${what}: ${res.error.code || res.error.message}`);
  }
  return res;
}
