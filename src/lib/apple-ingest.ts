import { d1Query } from "./d1";

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

// Apple documents no rate limit, but in practice the repository throttles
// hard after the very first request in a burst — confirmed empirically
// (second request onward in a fresh run came back 429). Retry with backoff
// rather than failing the whole query on the first rate limit.
async function appleGet<T>(path: string, params: Record<string, string>, attempt = 1): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (res.status === 429 && attempt <= 3) {
    await sleep(attempt * 2000); // 2s, 4s, 6s
    return appleGet<T>(path, params, attempt + 1);
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

async function upsertAd(brandId: string, ad: AppleAd): Promise<void> {
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
}

export interface AppleIngestResult {
  query: string;
  entityFound: boolean;
  adsSeen: number;
  error?: string;
}

/**
 * Resolves each seed app/developer name to an Apple entity id, pulls its
 * recent EU App Store ads, and upserts brand/ad/creative_asset rows into D1.
 * No tags written — same convention as the Meta ingestion module.
 */
export async function ingestAppleAds(queries: string[], countries: string[]): Promise<AppleIngestResult[]> {
  const results: AppleIngestResult[] = [];
  for (const query of queries) {
    try {
      const entity = await findEntity(query);
      if (!entity) {
        results.push({ query, entityFound: false, adsSeen: 0 });
        await sleep(1000);
        continue;
      }
      await sleep(1000); // space out the two calls within one query too
      const ads = await fetchAdsForEntity(entity, countries);
      if (ads.length > 0) {
        const brandId = await upsertBrand(entity);
        for (const ad of ads) {
          await upsertAd(brandId, ad);
        }
      }
      results.push({ query, entityFound: true, adsSeen: ads.length });
    } catch (err) {
      results.push({ query, entityFound: false, adsSeen: 0, error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(1000); // self-throttle between queries — Apple's limit is undocumented but tight
  }
  return results;
}
