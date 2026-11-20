import { NextRequest, NextResponse } from "next/server";
import { ingestMetaAds } from "@/lib/meta-ingest";

export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) return unauthorized();
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const pageIdsRaw = process.env.META_SEED_PAGE_IDS;
  if (!accessToken || !pageIdsRaw) {
    return NextResponse.json(
      { skipped: true, reason: "META_ACCESS_TOKEN / META_SEED_PAGE_IDS not configured" },
      { status: 200 }
    );
  }

  const pageIds = pageIdsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const countries = (process.env.META_AD_COUNTRIES ?? "US").split(",").map((s) => s.trim()).filter(Boolean);

  const results = await ingestMetaAds(pageIds, accessToken, countries);
  const totalAds = results.reduce((sum, r) => sum + r.adsSeen, 0);
  const errors = results.filter((r) => r.error);

  return NextResponse.json({
    pagesProcessed: results.length,
    totalAdsSeen: totalAds,
    errors,
  });
}
