import type { Ad, Platform } from "./types";

// The automatic, in-app version of the kind of breakdown a one-off report
// gives: per-brand themes, format mix, active-campaign count. Only used on
// /dashboard (ads already scoped to what the user follows) — the full
// /archive stays a plain feed, this analysis would be meaningless over
// every brand in the catalog at once.
//
// Grouped by brand NAME, not by D1 brand_id: the same real-world competitor
// currently gets a separate brand_id per platform (ingestion creates
// "meta-page-<id>" and "linkedin-<slug>" independently — see
// facebook-ingest.ts / linkedin-ingest.ts), so a user who follows both of a
// competitor's platform-specific brand rows should see ONE merged
// breakdown, not two unrelated ones. This is a display-time merge only;
// it doesn't change what's stored in `followed_brands`.

export interface ThemeBreakdown {
  headline: string;
  count: number;
  sampleBody: string;
  platforms: Platform[];
}

export interface BrandBreakdown {
  name: string;
  brandIds: string[];
  platforms: Platform[];
  adCount: number;
  activeCount: number;
  formatMix: Partial<Record<Ad["mediaKind"], number>>;
  themes: ThemeBreakdown[];
}

export interface BrandOption {
  name: string;
  brandIds: string[];
  platforms: Platform[];
  adCount: number;
}

/**
 * A name-only directory for the "follow a competitor" search on /dashboard
 * — brand name, platforms, how many platform-specific rows it resolves to,
 * ad count. Deliberately carries no creative (headline, body, media): this
 * is what lets that search exist without it being "the archive" (no
 * individual ad content, nothing to browse).
 */
export function listBrandOptions(ads: Ad[]): BrandOption[] {
  const byName = new Map<string, Ad[]>();
  for (const ad of ads) {
    const key = ad.brandName.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(ad);
  }

  return Array.from(byName.values())
    .map((group): BrandOption => ({
      name: group[0].brandName,
      brandIds: Array.from(new Set(group.map((a) => a.brandId))),
      platforms: Array.from(new Set(group.map((a) => a.platform))),
      adCount: group.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildBrandBreakdowns(ads: Ad[]): BrandBreakdown[] {
  const byName = new Map<string, Ad[]>();
  for (const ad of ads) {
    const key = ad.brandName.trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(ad);
  }

  return Array.from(byName.values())
    .map((group): BrandBreakdown => {
      const activeCount = group.filter((a) => a.status === "active").length;

      const formatMix: Partial<Record<Ad["mediaKind"], number>> = {};
      for (const ad of group) {
        formatMix[ad.mediaKind] = (formatMix[ad.mediaKind] ?? 0) + 1;
      }

      const themeMap = new Map<string, { count: number; sampleBody: string; platforms: Set<Platform> }>();
      for (const ad of group) {
        const key = ad.headline?.trim() || "(no headline captured)";
        if (!themeMap.has(key)) {
          themeMap.set(key, { count: 0, sampleBody: ad.bodyCopy, platforms: new Set() });
        }
        const entry = themeMap.get(key)!;
        entry.count += 1;
        entry.platforms.add(ad.platform);
      }

      const themes = Array.from(themeMap.entries())
        .map(([headline, v]) => ({
          headline,
          count: v.count,
          sampleBody: v.sampleBody,
          platforms: Array.from(v.platforms),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        name: group[0].brandName,
        brandIds: Array.from(new Set(group.map((a) => a.brandId))),
        platforms: Array.from(new Set(group.map((a) => a.platform))),
        adCount: group.length,
        activeCount,
        formatMix,
        themes,
      };
    })
    .sort((a, b) => b.adCount - a.adCount);
}
