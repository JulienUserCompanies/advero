import { NextRequest, NextResponse } from "next/server";
import { ingestOneAppleQuery } from "@/lib/apple-ingest";

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

  // Apple's repository needs several seconds between requests, which doesn't
  // leave room to process more than one app per serverless invocation. The
  // daily cron (no ?query= param) rotates through the whole list one app a
  // day, by day-of-year index, so the full list gets covered over time.
  // Pass ?query=<name> to test or force-ingest one specific app on demand.
  const override = req.nextUrl.searchParams.get("query");
  const dayIndex = Math.floor(Date.now() / 86_400_000) % queries.length;
  const query = override ?? queries[dayIndex];

  const result = await ingestOneAppleQuery(query, countries);

  return NextResponse.json({
    query: result.query,
    entityFound: result.entityFound,
    adsSeen: result.adsSeen,
    error: result.error,
    rotation: override ? "manual override" : `day ${dayIndex + 1} of ${queries.length}`,
  });
}
