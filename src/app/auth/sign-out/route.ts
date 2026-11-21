import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /auth/sign-out — clears the Supabase session cookie, then sends the
// person home. Wired to the "Sign out" button in the top bar.
export async function POST(request: Request) {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
