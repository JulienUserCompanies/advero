import { d1Query } from "./d1";
import { classifyAndTagAds } from "./messaging-classify";

// Apple Ad Repository API — official, documented, no authentication required.
// https://developer.apple.com/support/downloads/Ad-Repository.pdf
// EU-only coverage; data is delayed ~7 days; no rate limits are documented,
// so we self-throttle conservatively between requests.
const BASE = "https://adrepository.apple.com/api/v1";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Entity {
  id: number;
  name: string;
  type: "APP" | "DEVELOPER";
}

interface EntitySearchResponse {
  data?: Entity[];
}

interface AdAsset {
  videoUrl?: string;
  pictureUrl?: string;
  order?: number;
  orientation?: string;
}

interface AppleAd {
  adId: string;
  appId?: string;
  appName?: string;
  developerName?: string;
  placement?: string;
  format?: string;
  countryOrRegion?: string;
  firstImpressionDate?: string;
  lastImpressionDate?: string;
  adAssets?: AdAsset[];
  adBanner?: { iconPictureUrl?: string; promotionalText?: string };
}

interface AdsResponse {
  data?: AppleAd[];
}

// Apple documents no rate limit, but empirically it throttles hard on rapid
// bursts (confirmed: back-to-back calls 429; a 5s gap between two direct
// calls succeeded cleanly). One retry after a long wait is as far as we can
// go without risking the serverless function's own timeout.
async function appleGet<T>(path: string, params: Record<string, string>, isRetry = false): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (res.status === 429 && !isRetry) {
    await sleep(5000);
    return appleGet<T>(path, params, true);
  }
  if (!res.ok) {
    throw new Error(`Apple Ad Repository HTTP ${res.status} for ${path}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

async function findEntity(name: string): Promise<Entity | null> {
  const data = await appleGet<EntitySearchResponse>("/ad-repository-entities", {
    name,
    types: "APP",
    limit: "5",
  });
  return data.data?.[0] ?? null;
}

async function fetchAdsForEntity(entity: Entity, countries: string[]): Promise<AppleAd[]> {
  const ql = `type==${entity.type};id==${entity.id};countryOrRegion=in=(${countries.join(",")})`;
  const data = await appleGet<AdsResponse>("/ad-repository-ads", {
    ql,
    datePreset: "LAST_90_DAYS",
    limit: "50",
  });
  return data.data ?? [];
}

async function upsertBrand(entity: Entity): Promise<string> {
  const id = `apple-entity-${entity.id}`;
  await d1Query(
    `INSERT INTO brand (id, name, industry, apple_entity_id, platforms_tracked)
     VALUES (?, ?, 'Mobile App', ?, '["apple"]')
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
    [id, entity.name, entity.id]
  );
  return id;
}

async function upsertAd(brandId: string, ad: AppleAd): Promise<{ id: string; headline: string | null; bodyCopy: string | null }> {
  const localId = `apple-${ad.adId}`;
  const headline = ad.appName ?? null;
  const bodyCopy = ad.adBanner?.promotionalText ?? null;
  const firstSeen = ad.firstImpressionDate ?? new Date().toISOString();
  const lastSeen = ad.lastImpressionDate ?? firstSeen;
  // Apple's repository doesn't expose an explicit active/inactive flag the
  // way Meta does; treat anything with a recent last-impression as active.
  const daysSinceLastSeen = (Date.now() - new Date(lastSeen).getTime()) / 86_400_000;
  const status = daysSinceLastSeen <= 7 ? "active" : "inactive";

  await d1Query(
    `INSERT INTO ad (id, brand_id, platform, external_ad_id, first_seen_at, last_seen_at, status, headline, body_copy)
     VALUES (?, ?, 'apple', ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       last_seen_at = excluded.last_seen_at,
       status = excluded.status,
       headline = excluded.headline,
       body_copy = excluded.body_copy`,
    [localId, brandId, ad.adId, firstSeen, lastSeen, status, headline, bodyCopy]
  );

  const primaryAsset = ad.adAssets?.[0];
  const assetUrl = primaryAsset?.videoUrl ?? primaryAsset?.pictureUrl ?? ad.adBanner?.iconPictureUrl;
  if (assetUrl) {
    const type = primaryAsset?.videoUrl ? "video" : "image";
    await d1Query(
      `INSERT INTO creative_asset (id, ad_id, type, storage_url, aspect_ratio)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET storage_url = excluded.storage_url`,
      [`ca-${localId}`, localId, type, assetUrl, primaryAsset?.orientation ?? null]
    );
  }

  return { id: localId, headline, bodyCopy };
}

export interface AppleIngestResult {
  query: string;
  entityFound: boolean;
  adsSeen: number;
  adsClassified: number;
  error?: string;
}

/**
 * Resolves ONE seed app/developer name to an Apple entity id, pulls its
 * recent EU App Store ads, and upserts brand/ad/creative_asset rows into D1,
 * then runs messaging-style classification (see messaging-classify.ts) over
 * them — best-effort and skipped entirely without ANTHROPIC_API_KEY.
 *
 * Deliberately processes a single query per call: Apple's repository needs
 * ~5s between requests to avoid 429s, and a serverless function's own time
 * budget doesn't comfortably fit more than one entity-search + ads-fetch
 * pair (each potentially needing its own 5s retry) per invocation. Callers
 * that want to cover a whole seed list should call this once per name —
 * see the cron route's day-rotation for how the daily job covers a list
 * over time without needing a long-running batch. Classification runs with
 * lower concurrency (2) here than the other ingestion paths, to leave
 * headroom in that same tight time budget.
 */
export async function ingestOneAppleQuery(query: string, countries: string[]): Promise<AppleIngestResult> {
  try {
    const entity = await findEntity(query);
    if (!entity) {
      return { query, entityFound: false, adsSeen: 0, adsClassified: 0 };
    }
    const ads = await fetchAdsForEntity(entity, countries);
    const ingested: { id: string; headline: string | null; bodyCopy: string | null }[] = [];
    if (ads.length > 0) {
      const brandId = await upsertBrand(entity);
      for (const ad of ads) {
        ingested.push(await upsertAd(brandId, ad));
      }
    }
    const adsClassified = await classifyAndTagAds(ingested, 2);
    return { query, entityFound: true, adsSeen: ads.length, adsClassified };
  } catch (err) {
    return { query, entityFound: false, adsSeen: 0, adsClassified: 0, error: err instanceof Error ? err.message : String(err) };
  }
}
