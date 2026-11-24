import { d1Query } from "./d1";
import { classifyAndTagAds } from "./messaging-classify";

// Meta Ad Library API ingestion — see build-plan doc "Meta (Facebook/Instagram)
// Ingestion": official, free, Graph API-based, no special partnership needed
// for the public ads_archive endpoint. Commercial ads expose creative + run
// dates only (no spend/impressions — those are political/issue-ad only).
const GRAPH_VERSION = "v21.0";

interface AdLibraryAd {
  id: string;
  page_id: string;
  page_name: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_snapshot_url?: string;
}

interface AdLibraryResponse {
  data: AdLibraryAd[];
  paging?: { next?: string };
  error?: { message: string; code: number };
}

async function fetchAdsForPage(pageId: string, accessToken: string, countries: string[]): Promise<AdLibraryAd[]> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/ads_archive`);
  url.searchParams.set("search_page_ids", JSON.stringify([pageId]));
  url.searchParams.set("ad_reached_countries", JSON.stringify(countries));
  url.searchParams.set("ad_active_status", "ALL");
  url.searchParams.set(
    "fields",
    "id,page_id,page_name,ad_creative_bodies,ad_creative_link_captions,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url"
  );
  url.searchParams.set("limit", "50");
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  const json = (await res.json()) as AdLibraryResponse;
  if (!res.ok || json.error) {
    throw new Error(`Meta Ad Library error for page ${pageId}: ${json.error?.message ?? res.status}`);
  }
  return json.data ?? [];
}

async function upsertBrand(pageId: string, pageName: string): Promise<string> {
  const existing = await d1Query<{ id: string }>(`SELECT id FROM brand WHERE meta_page_id = ?`, [pageId]);
  if (existing.length > 0) return existing[0].id;

  const id = `meta-page-${pageId}`;
  await d1Query(
    `INSERT INTO brand (id, name, industry, meta_page_id, platforms_tracked)
     VALUES (?, ?, 'Uncategorized', ?, '["meta"]')
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
    [id, pageName, pageId]
  );
  return id;
}

async function upsertAd(brandId: string, ad: AdLibraryAd): Promise<{ id: string; headline: string | null; bodyCopy: string | null }> {
  const localId = `meta-${ad.id}`;
  const headline = ad.ad_creative_link_captions?.[0] ?? null;
  const bodyCopy = ad.ad_creative_bodies?.[0] ?? null;
  const firstSeen = ad.ad_delivery_start_time ?? new Date().toISOString();
  const lastSeen = ad.ad_delivery_stop_time ?? new Date().toISOString();
  const status = ad.ad_delivery_stop_time ? "inactive" : "active";

  await d1Query(
    `INSERT INTO ad (id, brand_id, platform, external_ad_id, first_seen_at, last_seen_at, status, headline, body_copy)
     VALUES (?, ?, 'meta', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_seen_at = excluded.last_seen_at,
       status = excluded.status,
       headline = excluded.headline,
       body_copy = excluded.body_copy`,
    [localId, brandId, ad.id, firstSeen, lastSeen, status, headline, bodyCopy]
  );

  if (ad.ad_snapshot_url) {
    await d1Query(
      `INSERT INTO creative_asset (id, ad_id, type, storage_url)
       VALUES (?, ?, 'image', ?)
       ON CONFLICT(id) DO UPDATE SET storage_url = excluded.storage_url`,
      [`ca-${localId}`, localId, ad.ad_snapshot_url]
    );
  }

  return { id: localId, headline, bodyCopy };
}

export interface IngestResult {
  pageId: string;
  adsSeen: number;
  adsClassified: number;
  error?: string;
}

/**
 * Pulls ads for each tracked Meta Page ID and upserts brand/ad/creative_asset
 * rows into D1, then runs messaging-style classification (see
 * messaging-classify.ts) over whatever came back — best-effort and skipped
 * entirely if OPENROUTER_API_KEY isn't set, so ingestion itself never
 * depends on it.
 */
export async function ingestMetaAds(pageIds: string[], accessToken: string, countries: string[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  for (const pageId of pageIds) {
    try {
      const ads = await fetchAdsForPage(pageId, accessToken, countries);
      const ingested: { id: string; headline: string | null; bodyCopy: string | null }[] = [];
      if (ads.length > 0) {
        const brandId = await upsertBrand(pageId, ads[0].page_name);
        for (const ad of ads) {
          ingested.push(await upsertAd(brandId, ad));
        }
      }
      const adsClassified = await classifyAndTagAds(ingested);
      results.push({ pageId, adsSeen: ads.length, adsClassified });
    } catch (err) {
      results.push({ pageId, adsSeen: 0, adsClassified: 0, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}
