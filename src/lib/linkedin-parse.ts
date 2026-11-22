import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

// LinkedIn's public Ad Library (linkedin.com/ad-library/search) is a
// server-rendered, logged-out page — the ad cards are already in the HTML,
// not loaded via a separate XHR. There's no official API for third-party
// competitor search, so this parses a page someone saved from their own
// browser (see linkedin-ingest.ts for why this is a manual paste-in rather
// than an automated cron like meta-ingest.ts / apple-ingest.ts).
//
// Known limitation: the search-results cards don't carry run dates or an
// active/inactive flag — that only shows up on each ad's own detail page
// (/ad-library/detail/<id>), which isn't captured here. See linkedin-ingest.ts
// for how first/last-seen are approximated instead.

export interface ParsedLinkedInAd {
  externalAdId: string;
  advertiserName: string;
  advertiserLogoUrl: string | null;
  creativeType: string | null; // e.g. "SPONSORED_VIDEO", "SPONSORED_STATUS_UPDATE"
  headline: string | null;
  bodyCopy: string | null;
  mediaUrl: string | null;
  // Always "image" in practice (see the note where this is set) — kept
  // nullable rather than widened to a bare boolean so a future addition of
  // real video support doesn't require touching every call site.
  mediaKind: "image" | null;
}

function textOrNull($el: cheerio.Cheerio<AnyNode>): string | null {
  const text = $el.first().text().trim().replace(/\s+/g, " ");
  return text.length > 0 ? text : null;
}

/**
 * Parses a saved LinkedIn Ad Library search-results page into structured
 * ads. Safe to call with HTML that doesn't match (e.g. a different page, or
 * LinkedIn having changed its markup) — returns an empty array rather than
 * throwing, so a bad paste just reports "0 ads found" instead of a 500.
 */
export function parseLinkedInAdLibraryHtml(html: string): ParsedLinkedInAd[] {
  const $ = cheerio.load(html);
  const ads: ParsedLinkedInAd[] = [];

  $("li.search-result-item").each((_, el) => {
    const $card = $(el);
    const $preview = $card.find(".ad-preview").first();
    const creativeType = $preview.attr("data-creative-type") ?? null;

    const detailHref = $card
      .find('a[href^="/ad-library/detail/"]')
      .first()
      .attr("href");
    const adIdMatch = detailHref?.match(/\/ad-library\/detail\/(\d+)/);
    if (!adIdMatch) return; // not a real ad card — skip

    // The advertiser name sits in the block right before the "Promoted"
    // label — .text() pulls it out regardless of how deeply it's nested
    // inside that block.
    const advertiserName = textOrNull(
      $card.find('[data-tracking-control-name="ad_library_ad_preview_advertiser_generic_entity"]').prev()
    );

    const logoUrl = $card.find("img.hue-web-entity__image").first().attr("data-delayed-url") ?? null;
    const bodyCopy = textOrNull($card.find(".commentary__content"));
    const headline = textOrNull($card.find(".sponsored-content-headline h2"));

    // Always "image", never "video", even for a SPONSORED_VIDEO card: the
    // search-results HTML only has the video's still cover frame (an
    // <img>) — the actual playable video file isn't in this page at all,
    // it's loaded separately when LinkedIn's own player initializes.
    // Storing that cover frame as mediaKind "video" made ad-card.tsx render
    // a <video> tag pointed at a JPEG, which can't play — hence "the video
    // isn't showing". Treating it as a static image (the cover shot) is
    // the honest fix; a real video asset isn't something we have.
    const mediaUrl =
      creativeType === "SPONSORED_VIDEO"
        ? $card.find("img.ad-preview__dynamic-dimensions-image").first().attr("data-delayed-url") ?? null
        : $card.find('a[data-tracking-control-name="ad_library_ad_preview_content_image"] img').first().attr("data-delayed-url") ??
          $card.find("img.ad-preview__dynamic-dimensions-image").first().attr("data-delayed-url") ??
          null;
    const mediaKind: "image" | null = mediaUrl ? "image" : null;

    ads.push({
      externalAdId: adIdMatch[1],
      advertiserName: advertiserName || "Unknown advertiser",
      advertiserLogoUrl: logoUrl,
      creativeType,
      headline,
      bodyCopy,
      mediaUrl,
      mediaKind,
    });
  });

  return ads;
}
