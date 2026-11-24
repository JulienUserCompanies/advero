import { d1Query } from "./d1";
import { parseLinkedInAdLibraryHtml } from "./linkedin-parse";
import { classifyAndTagAds } from "./messaging-classify";

// Unlike Meta and Apple, LinkedIn has no official, queryable API for
// third-party competitor ad data — see linkedin-parse.ts. So this isn't a
// cron (there's nothing to poll); it's called on demand from
// /api/admin/ingest-linkedin with HTML someone saved from their own browser
// session at linkedin.com/ad-library/search. Same brand/ad/creative_asset
// tables as the other platforms, so the archive reads it identically.

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function upsertBrand(advertiserName: string): Promise<string> {
  const id = `linkedin-${slugify(advertiserName)}`;
  await d1Query(
    `INSERT INTO brand (id, name, industry, platforms_tracked)
     VALUES (?, ?, 'Uncategorized', '["linkedin"]')
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
    [id, advertiserName]
  );
  return id;
}

async function upsertAd(brandId: string, ad: ReturnType<typeof parseLinkedInAdLibraryHtml>[number]): Promise<string> {
  const localId = `linkedin-${ad.externalAdId}`;
  const now = new Date().toISOString();

  // The search-results cards (what we have) don't carry run dates or an
  // active/inactive flag — only each ad's own detail page does, which isn't
  // part of what gets pasted in. Approximate: first time we see an ad, both
  // first/last seen are "now"; on a later paste that still contains it,
  // last_seen_at moves forward (so "still running" is at least inferable
  // from repeated pastes) while first_seen_at is preserved.
  await d1Query(
    `INSERT INTO ad (id, brand_id, platform, external_ad_id, first_seen_at, last_seen_at, status, headline, body_copy)
     VALUES (?, ?, 'linkedin', ?, ?, ?, 'active', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_seen_at = excluded.last_seen_at,
       status = 'active',
       headline = excluded.headline,
       body_copy = excluded.body_copy`,
    [localId, brandId, ad.externalAdId, now, now, ad.headline, ad.bodyCopy]
  );

  if (ad.mediaUrl) {
    await d1Query(
      `INSERT INTO creative_asset (id, ad_id, type, storage_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET type = excluded.type, storage_url = excluded.storage_url`,
      [`ca-${localId}`, localId, ad.mediaKind ?? "image", ad.mediaUrl]
    );
  }

  return localId;
}

export interface LinkedInIngestResult {
  adsFound: number;
  adsIngested: number;
  adsClassified: number;
  brands: string[];
  error?: string;
}

/**
 * Parses a saved LinkedIn Ad Library page and upserts every ad found into
 * D1, grouped by whichever advertiser name(s) appear in it (a keyword
 * search can return more than one advertiser; a company-name search
 * usually returns just one).
 */
export async function ingestLinkedInHtml(html: string): Promise<LinkedInIngestResult> {
  const ads = parseLinkedInAdLibraryHtml(html);
  if (ads.length === 0) {
    return { adsFound: 0, adsIngested: 0, adsClassified: 0, brands: [], error: "No ad cards found in the pasted HTML" };
  }

  const brandIdByName = new Map<string, string>();
  const ingested: { id: string; headline: string | null; bodyCopy: string | null }[] = [];

  for (const ad of ads) {
    try {
      let brandId = brandIdByName.get(ad.advertiserName);
      if (!brandId) {
        brandId = await upsertBrand(ad.advertiserName);
        brandIdByName.set(ad.advertiserName, brandId);
      }
      const localId = await upsertAd(brandId, ad);
      ingested.push({ id: localId, headline: ad.headline, bodyCopy: ad.bodyCopy });
    } catch {
      // Keep going — one bad row shouldn't drop the rest of the paste.
    }
  }

  // Messaging-style classification (see messaging-classify.ts): best-effort,
  // skipped entirely if ANTHROPIC_API_KEY isn't set. Kept inline rather than
  // fire-and-forget so the response's adsClassified count is accurate — the
  // route's maxDuration is sized to cover this.
  const adsClassified = await classifyAndTagAds(ingested);

  return {
    adsFound: ads.length,
    adsIngested: ingested.length,
    adsClassified,
    brands: Array.from(brandIdByName.keys()),
  };
}
