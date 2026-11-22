// Dev helper: sanity-check the LinkedIn Ad Library HTML parser against a
// page saved from a real browser, without touching D1 or needing any env
// vars. Usage: npx tsx scripts/test-linkedin-parse.mjs path/to/saved-page.html
import { parseLinkedInAdLibraryHtml } from "../src/lib/linkedin-parse.ts";
import { readFileSync } from "fs";

const path = process.argv[2];
if (!path) {
  console.error("Usage: npx tsx scripts/test-linkedin-parse.mjs path/to/saved-page.html");
  process.exit(1);
}

const html = readFileSync(path, "utf-8");
const ads = parseLinkedInAdLibraryHtml(html);
console.log(`Parsed ${ads.length} ads`);
console.log(JSON.stringify(ads.slice(0, 4), null, 2));
console.log("...");
console.log(JSON.stringify(ads.slice(-2), null, 2));
const missingName = ads.filter((a) => a.advertiserName === "Unknown advertiser").length;
const missingMedia = ads.filter((a) => !a.mediaUrl).length;
const uniqueIds = new Set(ads.map((a) => a.externalAdId));
console.log({ total: ads.length, uniqueIds: uniqueIds.size, missingName, missingMedia });
