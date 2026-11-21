import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client, for Server Components, Route Handlers and
 * Server Actions. Must be created fresh per request (reads the request's
 * cookies), so this is a function, not a module-level singleton.
 *
 * Returns null if Supabase isn't configured yet (no env vars) — callers
 * should fail open (treat as "no auth required") rather than crash, same
 * as proxy.ts and lib/supabase/client.ts.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // to) — fine as long as proxy.ts is also refreshing the session,
          // which it is.
        }
      },
    },
  });
}
