import { getArchiveData } from "./get-ads";
import type { Ad, CtaType, Platform } from "./types";
import { ANGLE_ORDER } from "./brand-breakdown";

// Computes the "Ad Trends" hub's trend pages straight from live tag data —
// no curated copy, no hand-picked headlines. Deliberately scoped to what
// the archive can actually support honestly right now:
//
// - Only platforms we actually ingest (meta, linkedin, apple). TikTok has a
//   schema slot but no ingestion pipeline, so it's listed on the hub as
//   "not tracked yet" rather than given a dead/empty trend page.
// - Only dimensions that are actually classified (emotional-angle,
//   cta-type — see messaging-classify.ts). hook-type and format exist as
//   tag taxonomies but nothing populates them yet, so they're listed as
//   "coming soon" on the hub rather than rendered with fabricated data.
// - Headline stats and trend lines are computed from real week-over-week
//   share, bucketed by first_seen_at, over whatever history actually
//   exists (currently ~4 weeks) — never phrased as "since Q2" or any
//   other span the data doesn't cover.

export const TREND_PLATFORMS = [
  { slug: "meta", label: "Meta", platform: "meta" as Platform, live: true },
  { slug: "linkedin", label: "LinkedIn", platform: "linkedin" as Platform, live: true },
  { slug: "apple", label: "App Store", platform: "apple" as Platform, live: true },
  { slug: "tiktok", label: "TikTok", platform: "tiktok" as Platform, live: false },
] as const;

export type TrendPlatformSlug = (typeof TREND_PLATFORMS)[number]["slug"];

const CTA_TYPES: CtaType[] = ["shop_now", "learn_more", "sign_up", "get_offer", "download", "book_demo"];

export const TREND_DIMENSIONS = [
  {
    slug: "emotional-angle",
    label: "Emotional Angle",
    live: true,
    values: ANGLE_ORDER as readonly string[],
  },
  {
    slug: "cta-type",
    label: "CTA",
    live: true,
    values: CTA_TYPES as readonly string[],
  },
  { slug: "hook-type", label: "Hook Type", live: false, values: [] },
  { slug: "format", label: "Format", live: false, values: [] },
] as const;

export type TrendDimensionSlug = (typeof TREND_DIMENSIONS)[number]["slug"];

function valueOf(ad: Ad, dimension: TrendDimensionSlug): string {
  return dimension === "emotional-angle" ? ad.emotionalAngle : ad.cta;
}

function isoWeekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export interface WeekShare {
  week: string;
  total: number;
  valueCounts: Record<string, number>;
}

export interface TrendHeadline {
  value: string;
  firstWeekPct: number;
  lastWeekPct: number;
  weeksSpanned: number;
}

export interface TrendPageData {
  platformLabel: string;
  dimensionLabel: string;
  totalAds: number;
  weeks: WeekShare[];
  headline: TrendHeadline | null;
  dominantValue: string;
  dominantCount: number;
  examples: Ad[];
  moreCount: number;
  earliestWeek: string;
  latestWeek: string;
}

/**
 * Returns null when there's no classified data at all for this
 * platform/dimension combination — the page renders a "not enough data
 * yet" state rather than zeros dressed up as a trend.
 */
export async function getTrendPage(
  platformSlug: TrendPlatformSlug,
  dimension: TrendDimensionSlug
): Promise<TrendPageData | null> {
  const platformMeta = TREND_PLATFORMS.find((p) => p.slug === platformSlug);
  const dimensionMeta = TREND_DIMENSIONS.find((d) => d.slug === dimension);
  if (!platformMeta || !dimensionMeta || !platformMeta.live || !dimensionMeta.live) return null;

  const { ads } = await getArchiveData();
  const scoped = ads
    .filter((a) => a.platform === platformMeta.platform && a.messagingClassified)
    .sort((a, b) => new Date(b.firstSeenAt).getTime() - new Date(a.firstSeenAt).getTime());

  if (scoped.length === 0) return null;

  const weekMap = new Map<string, WeekShare>();
  for (const ad of scoped) {
    const week = isoWeekStart(ad.firstSeenAt);
    if (!weekMap.has(week)) weekMap.set(week, { week, total: 0, valueCounts: {} });
    const bucket = weekMap.get(week)!;
    bucket.total += 1;
    const v = valueOf(ad, dimension);
    bucket.valueCounts[v] = (bucket.valueCounts[v] ?? 0) + 1;
  }
  const weeks = Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week));

  // Dominant value right now = most common across all scoped ads, not just
  // the latest week (a single thin week can be noisy with only ~200 ads
  // total).
  const overallCounts: Record<string, number> = {};
  for (const ad of scoped) {
    const v = valueOf(ad, dimension);
    overallCounts[v] = (overallCounts[v] ?? 0) + 1;
  }
  const [dominantValue, dominantCount] = Object.entries(overallCounts).sort((a, b) => b[1] - a[1])[0];

  let headline: TrendHeadline | null = null;
  if (weeks.length >= 2) {
    const first = weeks[0];
    const last = weeks[weeks.length - 1];
    let biggest: TrendHeadline | null = null;
    for (const value of dimensionMeta.values) {
      const firstPct = first.total > 0 ? ((first.valueCounts[value] ?? 0) / first.total) * 100 : 0;
      const lastPct = last.total > 0 ? ((last.valueCounts[value] ?? 0) / last.total) * 100 : 0;
      const diff = Math.abs(lastPct - firstPct);
      if (!biggest || diff > Math.abs(biggest.lastWeekPct - biggest.firstWeekPct)) {
        biggest = { value, firstWeekPct: firstPct, lastWeekPct: lastPct, weeksSpanned: weeks.length };
      }
    }
    headline = biggest;
  }

  const examples = scoped.filter((a) => valueOf(a, dimension) === dominantValue);

  return {
    platformLabel: platformMeta.label,
    dimensionLabel: dimensionMeta.label,
    totalAds: scoped.length,
    weeks,
    headline,
    dominantValue,
    dominantCount,
    examples: examples.slice(0, 2),
    moreCount: Math.max(0, examples.length - 2),
    earliestWeek: weeks[0].week,
    latestWeek: weeks[weeks.length - 1].week,
  };
}

export interface HubCell {
  platformSlug: TrendPlatformSlug;
  dimension: TrendDimensionSlug;
  totalAds: number;
}

/** Real ad counts per live platform×dimension combo, for the hub's tiles. */
export async function getHubCounts(): Promise<HubCell[]> {
  const { ads } = await getArchiveData();
  const cells: HubCell[] = [];
  for (const p of TREND_PLATFORMS) {
    if (!p.live) continue;
    for (const d of TREND_DIMENSIONS) {
      if (!d.live) continue;
      const count = ads.filter((a) => a.platform === p.platform && a.messagingClassified).length;
      cells.push({ platformSlug: p.slug, dimension: d.slug, totalAds: count });
    }
  }
  return cells;
}

export async function getTotalClassifiedCount(): Promise<number> {
  const { ads } = await getArchiveData();
  return ads.filter((a) => a.messagingClassified).length;
}
