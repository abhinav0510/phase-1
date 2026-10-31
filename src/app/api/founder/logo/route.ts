import { getSessionUser, isAdmin } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { getOwnBranding } from "@/server/data/founder";
import { LOGO_BUCKET } from "@/server/validators/logo";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Not found", { status: 404 });

/**
 * Streams the signed-in founder's OWN logo from the private bucket. The startup
 * comes from the verified session only, so one founder can never fetch another's.
 */
export async function GET() {
  const session = await getSessionUser();
  const startupId = session?.appUser?.startup_id ?? null;
  if (!session || !startupId || isAdmin(session.appUser?.role) || session.appUser?.active === false) {
    return NOT_FOUND();
  }

  const branding = await getOwnBranding(startupId);
  if (!branding?.logo_path) return NOT_FOUND();

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(LOGO_BUCKET).download(branding.logo_path);
  if (error || !data) return NOT_FOUND();

  return new Response(data, {
    headers: {
      "Content-Type": branding.logo_content_type ?? "application/octet-stream",
      // The URL carries a version (?v=updated_at), so it can be cached hard.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
