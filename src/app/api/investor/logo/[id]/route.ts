import { getSessionUser, hasPortalAccess } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { getOwnBranding } from "@/server/data/founder";
import { canViewStartup } from "@/server/data/investor/matches";
import { LOGO_BUCKET } from "@/server/validators/logo";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Not found", { status: 404 });

/**
 * A startup's logo for the investor portal. Only for a signed-in investor with
 * open access who may view that startup (thesis match, interest or meeting).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const startupId = Number((await params).id);
  const session = await getSessionUser();
  const investorId = session?.appUser?.role === "investor" ? session.appUser.investor_id : null;
  if (!session || !investorId || session.appUser?.active === false || !Number.isInteger(startupId)) return NOT_FOUND();
  if (!(await hasPortalAccess(investorId)) || !(await canViewStartup(investorId, startupId))) return NOT_FOUND();

  const branding = await getOwnBranding(startupId);
  if (!branding?.logo_path) return NOT_FOUND();
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(LOGO_BUCKET).download(branding.logo_path);
  if (error || !data) return NOT_FOUND();

  return new Response(data, {
    headers: {
      "Content-Type": branding.logo_content_type ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
