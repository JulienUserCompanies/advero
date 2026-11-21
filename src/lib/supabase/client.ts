import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client, for use inside "use client" components.
 * Returns null if Supabase isn't configured yet (no env vars) — callers
 * should treat that the same as "signed out" rather than crash, both for
 * local/preview builds without the vars set and for Next's own server-side
 * render of "use client" components during prerendering.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
