import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

/**
 * GET /api/health        the server is up (used by the container health check)
 * GET /api/health?deep=1 and it can reach Supabase (used after deploys and by uptime
 *                        monitors). A Supabase outage must not restart the app, so the
 *                        container check stays shallow.
 */
export async function GET(request: Request) {
  const version = process.env.APP_VERSION ?? "dev";
  if (new URL(request.url).searchParams.get("deep") !== "1") {
    return NextResponse.json({ status: "ok", version }, { headers: HEADERS });
  }
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
    return NextResponse.json({ status: "ok", version, supabase: "ok" }, { headers: HEADERS });
  } catch (e) {
    console.error("Health check could not reach Supabase:", e);
    return NextResponse.json({ status: "degraded", version, supabase: "unreachable" }, { status: 503, headers: HEADERS });
  }
}
