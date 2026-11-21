import type { Ad, AdFormat, Brand, CtaType, EmotionalAngle, Platform } from "./types";

const BRANDS: Omit<Brand, "adCount">[] = [
  { id: "lumen-skin", name: "Lumen Skin", industry: "DTC Skincare", platforms: ["meta", "tiktok"] },
  { id: "haus-supplements", name: "Haus Supplements", industry: "Supplements", platforms: ["meta", "tiktok"] },
  { id: "verdant-labs", name: "Verdant Labs", industry: "Supplements", platforms: ["tiktok", "meta"] },
  { id: "northfield-skincare", name: "Northfield & Co", industry: "DTC Skincare", platforms: ["meta"] },
  { id: "pilot-crm", name: "Pilot CRM", industry: "B2B SaaS", platforms: ["linkedin"] },
  { id: "ledgerly", name: "Ledgerly", industry: "B2B SaaS", platforms: ["linkedin", "meta"] },
  { id: "fathom-analytics-co", name: "Fathom Metrics", industry: "B2B SaaS", platforms: ["linkedin"] },
  { id: "stridewell", name: "Stridewell", industry: "Fitness Apps", platforms: ["tiktok", "meta", "apple"] },
  { id: "basecamp-fit", name: "Basecamp Fit", industry: "Fitness Apps", platforms: ["tiktok", "apple"] },
  { id: "hearthcraft", name: "Hearthcraft Home", industry: "Home Goods", platforms: ["meta", "tiktok"] },
  { id: "quietroom", name: "Quietroom", industry: "Home Goods", platforms: ["meta"] },
  { id: "parallel-health", name: "Parallel Health", industry: "DTC Skincare", platforms: ["tiktok"] },
];

const HEADLINES: Record<string, string[]> = {
  "DTC Skincare": [
    "Your dermatologist won't tell you this",
    "The 2-minute routine that replaced my 7-step one",
    "I stopped breaking out after this",
    "Stop layering 6 products for nothing",
  ],
  Supplements: [
    "Why your multivitamin isn't working",
    "The stack my trainer actually takes",
    "3rd-party tested, no fillers",
    "What I take instead of coffee now",
  ],
  "B2B SaaS": [
    "Your pipeline report is already out of date",
    "Stop exporting CSVs for your board deck",
    "What 400 RevOps teams switched for",
    "Close the books in 2 days, not 12",
  ],
  "Fitness Apps": [
    "The app that replaced my trainer",
    "I didn't miss a single day for 90 days",
    "No equipment. 12 minutes. That's it.",
    "Built by someone who hates the gym too",
  ],
  "Home Goods": [
    "The couch that doesn't look like everyone else's",
    "Why your bedroom still looks unfinished",
    "Shipped in a box smaller than your carry-on",
    "The lamp every design account keeps reposting",
  ],
};

const BODY: Record<EmotionalAngle, string[]> = {
  pain_point: [
    "If you've tried everything and nothing's worked, the problem probably isn't you.",
    "Most people are solving the wrong problem entirely — here's what actually helps.",
  ],
  aspirational: [
    "Here's what changes when you finally fix the thing you've been putting off.",
    "This is what the next version of you looks like in 30 days.",
  ],
  social_proof: [
    "Over 40,000 people switched this year. Here's why.",
    "Rated 4.9 by people who tried everything else first.",
  ],
  urgency: [
    "Price goes up Friday — lock in the current rate now.",
    "Only a few hundred left in this batch.",
  ],
  curiosity: [
    "We almost didn't publish this, but too many people were asking.",
    "The one change that made the biggest difference, and it's not what you think.",
  ],
  trust: [
    "No subscriptions, no upsells, cancel in one click.",
    "Built by the same team that shipped the thing you already trust.",
  ],
};

const SWATCHES: [string, string][] = [
  ["#1d2b20", "#b4ff39"],
  ["#241b2e", "#c77dff"],
  ["#1b2430", "#4e8cff"],
  ["#2e1b1f", "#ff5f7e"],
  ["#1b2b2b", "#3dc6ff"],
  ["#2b2416", "#ffcf5c"],
];

const FORMATS: AdFormat[] = ["ugc", "polished", "testimonial", "demo", "static"];
const ANGLES: EmotionalAngle[] = ["pain_point", "aspirational", "social_proof", "urgency", "curiosity", "trust"];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function daysAgo(n: number): string {
  const d = new Date("2026-11-20T00:00:00Z");
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function formatForPlatform(platform: Platform, rnd: () => number): AdFormat {
  if (platform === "tiktok") return pick(["ugc", "ugc", "testimonial", "polished"], rnd);
  if (platform === "linkedin") return pick(["demo", "static", "polished", "testimonial"], rnd);
  return pick(FORMATS, rnd);
}

function ctaForIndustry(industry: string, rnd: () => number): CtaType {
  if (industry === "B2B SaaS") return pick(["book_demo", "sign_up", "download", "learn_more"], rnd);
  return pick(["shop_now", "get_offer", "learn_more", "sign_up"], rnd);
}

export function generateMockAds(): Ad[] {
  const rnd = seededRandom(42);
  const ads: Ad[] = [];
  let i = 0;

  for (const brand of BRANDS) {
    const count = 3 + Math.floor(rnd() * 4);
    for (let j = 0; j < count; j++) {
      const platform = pick(brand.platforms, rnd);
      const angle = pick(ANGLES, rnd);
      const firstSeen = Math.floor(rnd() * 60) + 1;
      const duration = Math.floor(rnd() * 40) + 2;
      ads.push({
        id: `ad-${i}`,
        brandId: brand.id,
        brandName: brand.name,
        industry: brand.industry,
        platform,
        format: formatForPlatform(platform, rnd),
        cta: ctaForIndustry(brand.industry, rnd),
        emotionalAngle: angle,
        headline: pick(HEADLINES[brand.industry] ?? ["New offer"], rnd),
        bodyCopy: pick(BODY[angle], rnd),
        firstSeenAt: daysAgo(firstSeen + duration),
        lastSeenAt: daysAgo(firstSeen),
        status: firstSeen < 5 ? "active" : rnd() > 0.5 ? "active" : "inactive",
        durationDays: duration,
        mediaKind: platform === "linkedin" ? pick(["image", "video"], rnd) : pick(["video", "image", "carousel"], rnd),
        swatch: pick(SWATCHES, rnd),
      });
      i++;
    }
  }
  return ads;
}

export function brandsWithCounts(ads: Ad[]): Brand[] {
  return BRANDS.map((b) => ({
    ...b,
    adCount: ads.filter((a) => a.brandId === b.id).length,
  }));
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  meta: "Meta",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  apple: "Apple App Store",
  google: "Google",
  bing: "Bing",
  pinterest: "Pinterest",
};

export const FORMAT_LABEL: Record<AdFormat, string> = {
  ugc: "UGC",
  polished: "Polished",
  testimonial: "Testimonial",
  demo: "Demo",
  static: "Static",
};

export const CTA_LABEL: Record<CtaType, string> = {
  shop_now: "Shop Now",
  learn_more: "Learn More",
  sign_up: "Sign Up",
  get_offer: "Get Offer",
  download: "Download",
  book_demo: "Book Demo",
};
