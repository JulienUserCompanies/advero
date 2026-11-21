import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client, for Server Components, Route Handlers and
 * Server Actions. Must be created fresh per request (reads the request's
 * cookies), so this is a function, not a module-level singleton.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (no response to write cookies
            // to) — fine as long as middleware.ts is also refreshing the
            // session, which it is.
          }
        },
      },
    }
  );
}
