import { redirect } from "next/navigation";
import { ArchiveClient } from "../archive-client";
import { getArchiveData } from "@/lib/get-ads";
import { createClient } from "@/lib/supabase/server";

export default async function ArchivePage() {
  const supabase = await createClient();

  // Supabase isn't configured (no env vars) — fail open rather than
  // locking everyone out of the app entirely; proxy.ts does the same.
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
  }

  const { ads } = await getArchiveData();
  return <ArchiveClient ads={ads} />;
}
