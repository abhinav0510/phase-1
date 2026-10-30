import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resilientFetch } from "./resilient-fetch";

/**
 * Server Supabase client bound to the request cookies (anon key, RLS-enforced).
 * Use this for all user-scoped reads/writes in Server Components, Route Handlers
 * and Server Actions.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: resilientFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Session refresh is handled in middleware, so this is safe to ignore.
          }
        },
      },
    },
  );
}
