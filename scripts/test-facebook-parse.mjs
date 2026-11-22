// Dev helper: sanity-check the Facebook Ad Library JSON parser against a
// page saved from a real browser, without touching D1 or needing any env
// vars. Usage: npx tsx scripts/test-facebook-parse.mjs path/to/saved-page.html
import { parseFacebookAdLibraryHtml } from "../src/lib/facebook-parse.ts";
import { readFileSync } from "fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/test-facebook-parse.mjs path/to/saved-page.html");
  process.exit(1);
}

const html = readFileSync(path, "utf-8");
const ads = parseFacebookAdLibraryHtml(html);
console.log(`Parsed ${ads.length} ads`);
console.log(JSON.stringify(ads.slice(0, 3), null, 2));
console.log("...");
console.log(JSON.stringify(ads.slice(-1), null, 2));
const missingName = ads.filter((a) => a.advertiserName === "Unknown advertiser").length;
const missingMedia = ads.filter((a) => !a.mediaUrl).length;
const uniqueIds = new Set(ads.map((a) => a.externalAdId));
const byKind = {};
for (const a of ads) byKind[a.mediaKind ?? "none"] = (byKind[a.mediaKind ?? "none"] ?? 0) + 1;
console.log({ total: ads.length, uniqueIds: uniqueIds.size, missingName, missingMedia, byKind });
