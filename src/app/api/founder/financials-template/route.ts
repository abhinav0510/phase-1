import { getSessionUser } from "@/server/auth/session";
import { buildFinancialsTemplate } from "@/server/validators/financials-template";

export const dynamic = "force-dynamic";

/** The financials template, with this month's months and years filled in. Signed-in users only. */
export async function GET() {
  const session = await getSessionUser();
  if (!session?.appUser || session.appUser.active === false) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(buildFinancialsTemplate()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sidana-financials-template.xlsx"',
      // The months change over time, so never serve yesterday's copy.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
