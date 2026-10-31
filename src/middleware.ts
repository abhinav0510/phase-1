import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resilientFetch } from "@/server/integrations/supabase/resilient-fetch";

// Public marketing site + auth entry points. /teamonly is intentionally
// unlisted (never linked) but must be reachable without a session.
const PUBLIC_PREFIXES = [
  "/login",
  "/teamonly",
  "/forgot-password",
  "/reset-password",
  "/auth",
];

/**
 * Behind nginx, `request.nextUrl` holds the app's internal address rather than the public
 * one, so redirects are built from the host and protocol nginx forwards. Next.js requires
 * an absolute URL here.
 */
function redirectTo(request: NextRequest, location: string) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return NextResponse.redirect(new URL(location, `${protocol}://${host}`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: resilientFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session so Server Components get a valid token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    return redirectTo(request, `/login?redirect=${encodeURIComponent(pathname)}`);
  }

  // Already signed in: skip the sign-in forms (role-aware landing happens in-app).
  // ?error= means the app sent them here (deactivated, no startup); redirecting back
  // to the dashboard would loop forever, so let the page explain instead.
  const hasAccountError = request.nextUrl.searchParams.has("error");
  if (user && !hasAccountError && (pathname === "/login" || pathname === "/teamonly")) {
    return redirectTo(request, `/dashboard${request.nextUrl.search}`);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
