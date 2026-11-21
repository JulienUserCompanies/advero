import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /auth/sign-out — clears the Supabase session cookie, then sends the
// person home. Not wired to any button yet (no account menu in the top bar
// yet); exists so the account UI has somewhere to point once it lands.
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
