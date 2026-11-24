import { NextRequest, NextResponse } from "next/server";
import { CLASSIFIER_CONFIGURED, classifyAndTagAds, findUnclassifiedAds } from "@/lib/messaging-classify";

export const maxDuration = 60;

// One-off backfill for ads ingested before messaging-style classification
// existed (every real ad up to 2026-11-24) — new ads get classified inline
// by their own ingestion path now, this just catches up the backlog.
//
// Processes a bounded batch per call (keeps it inside maxDuration) and
// reports how many remain, so call it repeatedly until remaining is 0:
//
//   curl -X POST https://advero-sage.vercel.app/api/admin/classify-messaging \
//     -H "Authorization: Bearer $CRON_SECRET"
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!CLASSIFIER_CONFIGURED) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set — nothing to backfill" },
      { status: 400 }
    );
  }

  const batch = await findUnclassifiedAds(40);
  const classified = await classifyAndTagAds(batch);
  const remaining = await findUnclassifiedAds(1);

  return NextResponse.json({
    batchSize: batch.length,
    classified,
    done: remaining.length === 0,
  });
}
