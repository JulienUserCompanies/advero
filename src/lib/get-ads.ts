import { d1Query, D1_CONFIGURED } from "./d1";
import type { Ad, AdFormat, Brand, CtaType, EmotionalAngle, Platform } from "./types";

// D1 doesn't store a swatch column (it's a pure UI accent), so we derive a
// stable pick per ad from its id — same ad always renders the same colors
// across requests.
const SWATCHES: [string, string][] = [
  ["#1d2b20", "#b4ff39"],
  ["#241b2e", "#c77dff"],
  ["#1b2430", "#4e8cff"],
  ["#2e1b1f", "#ff5f7e"],
  ["#1b2b2b", "#3dc6ff"],
  ["#2b2416", "#ffcf5c"],
];

function swatchForId(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return SWATCHES[hash % SWATCHES.length];
}

interface AdRow {
  id: string;
  brand_id: string;
  brand_name: string;
  industry: string;
  platform: Platform;
  first_seen_at: string;
  last_seen_at: string;
  status: "active" | "inactive";
  headline: string | null;
  body_copy: string | null;
}

interface TagRow {
  ad_id: string;
  taxonomy: string;
  value: string;
}

interface AssetRow {
  ad_id: string;
  type: "video" | "image" | "carousel";
  storage_url: string | null;
}

async function fetchAdsFromD1(): Promise<Ad[]> {
  const [adRows, tagRows, assetRows] = await Promise.all([
    d1Query<AdRow>(
      `SELECT ad.id, ad.brand_id, brand.name AS brand_name, brand.industry,
              ad.platform, ad.first_seen_at, ad.last_seen_at, ad.status,
              ad.headline, ad.body_copy
       FROM ad JOIN brand ON brand.id = ad.brand_id`
    ),
    d1Query<TagRow>(`SELECT ad_id, taxonomy, value FROM tag`),
    d1Query<AssetRow>(`SELECT ad_id, type, storage_url FROM creative_asset`),
  ]);

  const tagsByAd = new Map<string, TagRow[]>();
  for (const t of tagRows) {
    if (!tagsByAd.has(t.ad_id)) tagsByAd.set(t.ad_id, []);
    tagsByAd.get(t.ad_id)!.push(t);
  }

  const assetByAd = new Map<string, AssetRow>();
  for (const a of assetRows) assetByAd.set(a.ad_id, a);

  return adRows.map((row) => {
    const tags = tagsByAd.get(row.id) ?? [];
    const format = (tags.find((t) => t.taxonomy === "format")?.value ?? "static") as AdFormat;
    const cta = (tags.find((t) => t.taxonomy === "cta_type")?.value ?? "learn_more") as CtaType;
    const emotionalAngle = (tags.find((t) => t.taxonomy === "emotional_angle")?.value ?? "trust") as EmotionalAngle;
    const asset = assetByAd.get(row.id);

    const firstSeenMs = new Date(row.first_seen_at).getTime();
    const lastSeenMs = new Date(row.last_seen_at).getTime();
    const durationDays = Math.max(1, Math.round((lastSeenMs - firstSeenMs) / 86_400_000));

    return {
      id: row.id,
      brandId: row.brand_id,
      brandName: row.brand_name,
      industry: row.industry,
      platform: row.platform,
      format,
      cta,
      emotionalAngle,
      headline: row.headline ?? "",
      bodyCopy: row.body_copy ?? "",
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      status: row.status,
      durationDays,
      mediaKind: asset?.type ?? "image",
      swatch: swatchForId(row.id),
      mediaUrl: asset?.storage_url ?? null,
    } satisfies Ad;
  });
}

function brandsFromAds(ads: Ad[]): Brand[] {
  const byId = new Map<string, Brand>();
  for (const ad of ads) {
    const existing = byId.get(ad.brandId);
    if (existing) {
      existing.adCount += 1;
      if (!existing.platforms.includes(ad.platform)) existing.platforms.push(ad.platform);
    } else {
      byId.set(ad.brandId, {
        id: ad.brandId,
        name: ad.brandName,
        industry: ad.industry,
        platforms: [ad.platform],
        adCount: 1,
      });
    }
  }
  return Array.from(byId.values());
}

/**
 * Loads ads + brands for the archive — always live from Cloudflare D1, no
 * mock-data fallback. If D1 isn't configured or the query fails, this
 * returns an empty archive rather than fabricated ads, so the UI reflects
 * what's actually real.
 */
export async function getArchiveData(): Promise<{ ads: Ad[]; brands: Brand[]; source: "d1" | "empty" }> {
  if (!D1_CONFIGURED) {
    console.warn(
      `[d1] not configured — account=${Boolean(process.env.CLOUDFLARE_ACCOUNT_ID)} token=${Boolean(
        process.env.CLOUDFLARE_API_TOKEN
      )} db=${Boolean(process.env.CLOUDFLARE_D1_DATABASE_ID)}`
    );
    return { ads: [], brands: [], source: "empty" };
  }

  try {
    const ads = await fetchAdsFromD1();
    console.log(`[d1] query ok, rows=${ads.length}`);
    return { ads, brands: brandsFromAds(ads), source: "d1" };
  } catch (err) {
    console.error("[d1] D1 fetch failed:", err);
    return { ads: [], brands: [], source: "empty" };
  }
}
