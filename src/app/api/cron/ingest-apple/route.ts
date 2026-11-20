import { NextRequest, NextResponse } from "next/server";
import { ingestAppleAds } from "@/lib/apple-ingest";

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

  const queriesRaw = process.env.APPLE_SEED_QUERIES;
  if (!queriesRaw) {
    return NextResponse.json({ skipped: true, reason: "APPLE_SEED_QUERIES not configured" }, { status: 200 });
  }

  const queries = queriesRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const countries = (process.env.APPLE_AD_COUNTRIES ?? "DE,FR,ES,IT,NL").split(",").map((s) => s.trim()).filter(Boolean);

  const results = await ingestAppleAds(queries, countries);
  const totalAds = results.reduce((sum, r) => sum + r.adsSeen, 0);
  const errors = results.filter((r) => r.error);
  const notFound = results.filter((r) => !r.entityFound && !r.error);

  return NextResponse.json({
    queriesProcessed: results.length,
    totalAdsSeen: totalAds,
    notFound: notFound.map((r) => r.query),
    errors,
  });
}
