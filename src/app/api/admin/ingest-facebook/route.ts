import { NextRequest, NextResponse } from "next/server";
import { ingestFacebookHtml } from "@/lib/facebook-ingest";

// See ingest-linkedin/route.ts — bumped from 30 for the same reason
// (inline messaging-style classification on every new ad).
export const maxDuration = 60;

// POST a saved Facebook Ad Library page's HTML as the raw request body to
// ingest it. Same manual, on-demand shape as ingest-linkedin (see
// facebook-ingest.ts for why) — no cron here.
//
// Example:
//   curl -X POST https://advero-sage.vercel.app/api/admin/ingest-facebook \
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

  const result = await ingestFacebookHtml(html);
  return NextResponse.json(result);
}
