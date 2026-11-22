import { d1Query } from "./d1";
import { parseFacebookAdLibraryHtml, type ParsedFacebookAd } from "./facebook-parse";

// Manual paste-in ingestion for Facebook, for the same reason LinkedIn has
// one (see linkedin-ingest.ts): meta-ingest.ts's official Graph API route
// needs an approved Meta app/ad-account, which isn't in place yet. In the
// meantime this parses a page saved from facebook.com/ads/library (see
// facebook-parse.ts) via /api/admin/ingest-facebook.
//
// Brand matching deliberately mirrors meta-ingest.ts's upsertBrand exactly
// (same id scheme `meta-page-<id>`, same lookup by meta_page_id, same
// platform literal 'meta') rather than a separate 'facebook-' namespace —
// so if/when the official API gets approved, both sources write into the
// same brand and ad rows instead of creating duplicates. The ad id reuses
// Facebook's ad_archive_id, which is also what the Graph API's ads_archive
// endpoint returns as its `id` field for the same ad.

async function upsertBrand(pageId: string, pageName: string): Promise<string> {
  const existing = await d1Query<{ id: string }>(`SELECT id FROM brand WHERE meta_page_id = ?`, [pageId]);
  if (existing.length > 0) {
    await d1Query(`UPDATE brand SET name = ? WHERE id = ?`, [pageName, existing[0].id]);
    return existing[0].id;
  }

  const id = `meta-page-${pageId}`;
  await d1Query(
    `INSERT INTO brand (id, name, industry, meta_page_id, platforms_tracked)
     VALUES (?, ?, 'Uncategorized', ?, '["meta"]')
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
    [id, pageName, pageId]
  );
  return id;
}

async function upsertAd(brandId: string, ad: ParsedFacebookAd): Promise<void> {
  const localId = `meta-${ad.externalAdId}`;
  const now = new Date().toISOString();
  const firstSeen = ad.startDateIso ?? now;
  // Still-running ads have no end_date from Facebook — use "now" so
  // durationDays reflects "running since start_date" rather than freezing
  // at the first paste's timestamp (a later re-paste moves it forward).
  const lastSeen = ad.isActive ? now : ad.endDateIso ?? now;
  const status = ad.isActive ? "active" : "inactive";

  await d1Query(
    `INSERT INTO ad (id, brand_id, platform, external_ad_id, first_seen_at, last_seen_at, status, headline, body_copy)
     VALUES (?, ?, 'meta', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_seen_at = excluded.last_seen_at,
       status = excluded.status,
       headline = excluded.headline,
       body_copy = excluded.body_copy`,
    [localId, brandId, ad.externalAdId, firstSeen, lastSeen, status, ad.headline, ad.bodyCopy]
  );

  if (ad.mediaUrl) {
    await d1Query(
      `INSERT INTO creative_asset (id, ad_id, type, storage_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET type = excluded.type, storage_url = excluded.storage_url`,
      [`ca-${localId}`, localId, ad.mediaKind ?? "image", ad.mediaUrl]
    );
  }
}

export interface FacebookIngestResult {
  adsFound: number;
  adsIngested: number;
  brands: string[];
  error?: string;
}

/**
 * Parses a saved Facebook Ad Library page and upserts every ad found into
 * D1, grouped by advertiser Page ID (a page can rename itself; the Page ID
 * is the stable key, same reasoning as meta-ingest.ts).
 */
export async function ingestFacebookHtml(html: string): Promise<FacebookIngestResult> {
  const ads = parseFacebookAdLibraryHtml(html);
  if (ads.length === 0) {
    return { adsFound: 0, adsIngested: 0, brands: [], error: "No ad data found in the pasted HTML" };
  }

  const brandIdByPageId = new Map<string, string>();
  const brandNames = new Set<string>();
  let adsIngested = 0;

  for (const ad of ads) {
    try {
      let brandId = brandIdByPageId.get(ad.pageId);
      if (!brandId) {
        brandId = await upsertBrand(ad.pageId, ad.advertiserName);
        brandIdByPageId.set(ad.pageId, brandId);
      }
      await upsertAd(brandId, ad);
      brandNames.add(ad.advertiserName);
      adsIngested += 1;
    } catch {
      // Keep going — one bad row shouldn't drop the rest of the paste.
    }
  }

  return {
    adsFound: ads.length,
    adsIngested,
    brands: Array.from(brandNames),
  };
}
