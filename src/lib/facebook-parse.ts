// Facebook's public Ad Library (facebook.com/ads/library) renders its results
// with client-side React, but — unlike a typical GraphQL-driven SPA — the
// ads that are already loaded when the page is saved come along for free:
// Facebook embeds the full Relay payload used to hydrate that React tree in
// one or more `<script type="application/json" data-sjs>` tags containing a
// "ScheduledServerJS" / "RelayPrefetchedStreamCache" blob. That JSON has real
// structured ad data (archive id, advertiser, copy, images, and — unlike
// LinkedIn's saved page — actual playable video URLs), so this parses JSON,
// not markup. See linkedin-parse.ts for the equivalent DOM-scraping approach
// used where the platform's page is server-rendered HTML instead.
//
// Confirmed against a real saved search (facebook.com/ads/library, 30 ads,
// a mix of IMAGE/VIDEO/CAROUSEL): every ad_archive_id was unique and present
// in exactly one <script data-sjs> tag, each with a `snapshot` object holding
// the creative.

interface RawFacebookCard {
  title?: string | null;
  body?: string | null;
  original_image_url?: string | null;
  resized_image_url?: string | null;
  video_hd_url?: string | null;
  video_sd_url?: string | null;
  video_preview_image_url?: string | null;
}

interface RawFacebookAd {
  ad_archive_id: string;
  page_id: string;
  page_name: string;
  is_active: boolean;
  start_date?: number | null;
  end_date?: number | null;
  snapshot: {
    page_name?: string | null;
    page_profile_picture_url?: string | null;
    body?: { text?: string | null } | null;
    title?: string | null;
    cta_text?: string | null;
    link_url?: string | null;
    display_format?: string | null;
    images?: Array<{ original_image_url?: string | null; resized_image_url?: string | null }> | null;
    videos?: Array<{ video_hd_url?: string | null; video_sd_url?: string | null; video_preview_image_url?: string | null }> | null;
    cards?: RawFacebookCard[] | null;
  };
}

export interface ParsedFacebookAd {
  externalAdId: string; // ad_archive_id — same ID space as Meta's official Ad Library API's `id` field
  pageId: string;
  advertiserName: string;
  advertiserLogoUrl: string | null;
  isActive: boolean;
  startDateIso: string | null;
  endDateIso: string | null;
  headline: string | null; // snapshot.title
  bodyCopy: string | null; // snapshot.body.text
  mediaKind: "video" | "image" | "carousel" | null;
  mediaUrl: string | null;
}

function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function pickImage(images: RawFacebookAd["snapshot"]["images"]): string | null {
  const first = images?.[0];
  return first?.resized_image_url || first?.original_image_url || null;
}

function pickVideo(videos: RawFacebookAd["snapshot"]["videos"]): string | null {
  const first = videos?.[0];
  return first?.video_hd_url || first?.video_sd_url || null;
}

function pickCardMedia(cards: RawFacebookCard[] | null | undefined): { kind: "video" | "image"; url: string } | null {
  for (const card of cards ?? []) {
    const video = card.video_hd_url || card.video_sd_url;
    if (video) return { kind: "video", url: video };
  }
  for (const card of cards ?? []) {
    const image = card.resized_image_url || card.original_image_url;
    if (image) return { kind: "image", url: image };
  }
  return null;
}

/** Recursively finds every object that looks like a Facebook ad-library ad
 *  record, regardless of how deeply Relay nested it in this particular
 *  response shape (search_results_connection.edges[].node.collated_results[]
 *  in the one search this was verified against — but that shape isn't
 *  contractually stable, so this walks the whole tree instead of trusting a
 *  fixed path). */
function findAdObjects(node: unknown, out: RawFacebookAd[], seen: Set<string>): void {
  if (Array.isArray(node)) {
    for (const item of node) findAdObjects(item, out, seen);
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (
      typeof obj.ad_archive_id === "string" &&
      obj.snapshot &&
      typeof obj.snapshot === "object" &&
      !seen.has(obj.ad_archive_id)
    ) {
      seen.add(obj.ad_archive_id);
      out.push(obj as unknown as RawFacebookAd);
    }
    for (const value of Object.values(obj)) findAdObjects(value, out, seen);
  }
}

const SJS_SCRIPT_RE = /<script type="application\/json"[^>]*data-sjs[^>]*>([\s\S]*?)<\/script>/g;

export function parseFacebookAdLibraryHtml(html: string): ParsedFacebookAd[] {
  const rawAds: RawFacebookAd[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(SJS_SCRIPT_RE)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue; // not every data-sjs blob is ad data (or valid on its own) — skip, don't throw
    }
    findAdObjects(parsed, rawAds, seen);
  }

  return rawAds.map((ad): ParsedFacebookAd => {
    const snapshot = ad.snapshot;
    const format = (snapshot.display_format ?? "").toUpperCase();

    let mediaKind: ParsedFacebookAd["mediaKind"] = null;
    let mediaUrl: string | null = null;

    if (format === "VIDEO") {
      mediaUrl = pickVideo(snapshot.videos);
      mediaKind = mediaUrl ? "video" : null;
    } else if (format === "CAROUSEL") {
      const card = pickCardMedia(snapshot.cards);
      mediaUrl = card?.url ?? null;
      mediaKind = card ? "carousel" : null;
    } else {
      mediaUrl = pickImage(snapshot.images);
      mediaKind = mediaUrl ? "image" : null;
    }

    // Fall back across kinds if the expected field for this display_format
    // came back empty but another one didn't (seen on a handful of ads with
    // an inconsistent display_format vs. actual creative present).
    if (!mediaUrl) {
      mediaUrl = pickVideo(snapshot.videos);
      if (mediaUrl) mediaKind = "video";
    }
    if (!mediaUrl) {
      mediaUrl = pickImage(snapshot.images);
      if (mediaUrl) mediaKind = "image";
    }
    if (!mediaUrl) {
      const card = pickCardMedia(snapshot.cards);
      if (card) {
        mediaUrl = card.url;
        mediaKind = "carousel";
      }
    }

    return {
      externalAdId: ad.ad_archive_id,
      pageId: ad.page_id,
      advertiserName: snapshot.page_name || ad.page_name || "Unknown advertiser",
      advertiserLogoUrl: snapshot.page_profile_picture_url ?? null,
      isActive: Boolean(ad.is_active),
      startDateIso: unixToIso(ad.start_date),
      endDateIso: unixToIso(ad.end_date),
      headline: snapshot.title ?? null,
      bodyCopy: snapshot.body?.text ?? null,
      mediaKind,
      mediaUrl,
    };
  });
}
