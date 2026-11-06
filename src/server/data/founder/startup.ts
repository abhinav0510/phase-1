import "server-only";

import { cache } from "react";
import type { Startup } from "@/shared/types/db";
import { createAdminClient, founderCache, ok } from "./_internal";

export const getOwnStartup = cache((startupId: number): Promise<Startup | null> =>
  founderCache("getOwnStartup", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(await admin.from("startups").select("*").eq("id", startupId).maybeSingle(), "startups");
    return (data as Startup | null) ?? null;
  }),
);

export const getOwnFunding = cache((startupId: number): Promise<any[]> =>
  founderCache("getOwnFunding", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin
        .from("funding_rounds")
        .select("*")
        .eq("startup_id", startupId)
        .order("closed_on", { ascending: false, nullsFirst: false }),
      "funding_rounds",
    );
    return data ?? [];
  }),
);

export const getOwnSignInEmails = cache((startupId: number): Promise<string[]> =>
  founderCache("getOwnSignInEmails", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin.from("startup_contacts").select("email").eq("startup_id", startupId).order("id"),
      "startup_contacts",
    );
    return (data ?? []).map((r) => r.email as string);
  }),
);

export const getOwnDocs = cache((startupId: number): Promise<any[]> =>
  founderCache("getOwnDocs", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin.from("docs").select("*").eq("startup_id", startupId).order("created_at", { ascending: false }),
      "docs",
    );
    return data ?? [];
  }),
);

export interface StartupBranding {
  logo_path: string | null;
  logo_content_type: string | null;
  updated_at: string | null;
}

export const getOwnBranding = cache((startupId: number): Promise<StartupBranding | null> =>
  founderCache("getOwnBranding", startupId, async () => {
    const admin = createAdminClient();
    const { data } = ok(
      await admin
        .from("startup_branding")
        .select("logo_path, logo_content_type, updated_at")
        .eq("startup_id", startupId)
        .maybeSingle(),
      "startup_branding",
    );
    return (data as StartupBranding | null) ?? null;
  }),
);

export function logoUrlFor(b: StartupBranding | null): string | null {
  if (!b?.logo_path) return null;
  return `/api/founder/logo?v=${encodeURIComponent(b.updated_at ?? b.logo_path)}`;
}
