import Link from "next/link";
import { redirect } from "next/navigation";
import { ArchiveClient } from "../archive-client";
import { getArchiveData } from "@/lib/get-ads";
import { createClient } from "@/lib/supabase/server";

// Same reasoning as archive/page.tsx: reads cookies() via the Supabase
// server client to check the session, so it can't be part of the static
// prerendered shell.
export const instant = false;

// The followed-brands view — a separate offer from /archive (which shows
// every brand in the catalog): this page is scoped to only the brands a
// signed-in user has chosen to follow via the heart icon on an ad card.
// v1 is deliberately just a filtered feed (same components as /archive,
// same gallery/minimal/table views, same search/filters) — no separate
// per-brand stats yet.
export default async function DashboardPage() {
  const supabase = await createClient();

  let followedBrandIds: Set<string> | null = null;
  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) redirect("/login");

    const { data } = await supabase.from("followed_brands").select("brand_id");
    followedBrandIds = new Set((data ?? []).map((row) => row.brand_id));
  }

  const { ads } = await getArchiveData();
  // Supabase unconfigured (dev/fail-open case, same as elsewhere in this
  // app): there's no concept of "followed" without accounts, so don't
  // silently show the whole archive under the "My Brands" heading.
  const myAds = followedBrandIds ? ads.filter((ad) => followedBrandIds!.has(ad.brandId)) : [];

  return (
    <ArchiveClient
      ads={myAds}
      title="My Brands"
      titleSuffix={`· ${new Set(myAds.map((a) => a.brandId)).size} followed`}
      emptyMessage={
        <>
          You haven&rsquo;t followed any brands yet —{" "}
          <Link href="/archive" className="text-foreground underline underline-offset-2">
            browse the archive
          </Link>{" "}
          and click the heart icon on a brand&rsquo;s ads to track it here.
        </>
      }
    />
  );
}
