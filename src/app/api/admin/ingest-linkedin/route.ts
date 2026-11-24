import { NextRequest, NextResponse } from "next/server";
import { ingestLinkedInHtml } from "@/lib/linkedin-ingest";

// 60 rather than 30: ingestion itself is fast, but messaging-style
// classification (one Claude call per new ad, see messaging-classify.ts)
// runs inline so the response's adsClassified count is accurate, and a
// paste can contain dozens of new ads.
export const maxDuration = 60;

// POST a saved LinkedIn Ad Library page's HTML as the raw request body to
// ingest it. There's no cron here (see linkedin-ingest.ts) — this is called
// manually, whenever someone wants to refresh a competitor's LinkedIn ads.
//
// Example:
//   curl -X POST https://advero-sage.vercel.app/api/admin/ingest-linkedin \
//     -H "Authorization: Bearer $CRON_SECRET" \
//     --data-binary @saved-page.html
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const html = await req.text();
  if (!html.trim()) {
    return NextResponse.json({ error: "empty request body — paste the saved page's HTML" }, { status: 400 });
  }

  const result = await ingestLinkedInHtml(html);
  return NextResponse.json(result);
}
