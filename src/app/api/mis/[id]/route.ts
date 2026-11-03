import { getSessionUser, isAdmin } from "@/server/auth/session";
import { createAdminClient } from "@/server/integrations/supabase/admin";
import { getMisFile } from "@/server/data/mis";
import { MIS_BUCKET } from "@/server/validators/mis";

export const dynamic = "force-dynamic";

const NOT_FOUND = () => new Response("Not found", { status: 404 });

/**
 * Downloads one MIS spreadsheet from the private bucket. The Sidana team can fetch any;
 * a founder only their own startup's, checked against the verified session.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  const user = session?.appUser;
  if (!session || !user || user.active === false || session.mustReset) return NOT_FOUND();

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NOT_FOUND();
  const file = await getMisFile(id);
  if (!file) return NOT_FOUND();
  if (!isAdmin(user.role) && user.startup_id !== file.startup_id) return NOT_FOUND();

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(MIS_BUCKET).download(file.file_path);
  if (error || !data) return NOT_FOUND();

  return new Response(data, {
    headers: {
      "Content-Type": file.content_type,
      "Content-Disposition": `attachment; filename="${file.file_name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
