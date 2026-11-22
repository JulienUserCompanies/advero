import { redirect } from "next/navigation";
import { ArchiveClient } from "../archive-client";
import { getArchiveData } from "@/lib/get-ads";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// This page reads cookies() (via the Supabase server client) to check the
// session before rendering, so it can't be part of the static prerendered
// shell under Cache Components — opt it out of that validation rather than
// restructuring it around `use cache: private` + <Suspense>, since the
// whole page (not just a slice of it) depends on whether there's a user.
export const instant = false;

// Admin-only: regular accounts get /dashboard, scoped to the (up to 3)
// competitors they're tracking, plus the per-brand breakdown — browsing
// every brand in the catalog is the admin/curation view now, not the
// product a signed-up user gets.
export default async function ArchivePage() {
  const supabase = await createClient();

  // Supabase isn't configured (no env vars) — fail open rather than
  // locking everyone out of the app entirely; proxy.ts does the same.
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
    if (!isAdminEmail(data.user.email)) redirect("/dashboard");
  }

  const { ads } = await getArchiveData();
  return <ArchiveClient ads={ads} />;
}
