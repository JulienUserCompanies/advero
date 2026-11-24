export type Platform = "meta" | "tiktok" | "linkedin" | "apple" | "google" | "bing" | "pinterest";

export type AdFormat = "ugc" | "polished" | "testimonial" | "demo" | "static";

export type CtaType =
  | "shop_now"
  | "learn_more"
  | "sign_up"
  | "get_offer"
  | "download"
  | "book_demo";

export type EmotionalAngle =
  | "pain_point"
  | "aspirational"
  | "social_proof"
  | "urgency"
  | "curiosity"
  | "trust";

export interface Brand {
  id: string;
  name: string;
  industry: string;
  platforms: Platform[];
  adCount: number;
}

export interface Tag {
  taxonomy: "hook_type" | "format" | "cta_type" | "emotional_angle" | "persona";
  value: string;
  confidence: number;
}

export interface Ad {
  id: string;
  brandId: string;
  brandName: string;
  industry: string;
  platform: Platform;
  format: AdFormat;
  cta: CtaType;
  emotionalAngle: EmotionalAngle;
  /**
   * Whether cta/emotionalAngle came from a real classification (a
   * 'cta_type'/'emotional_angle' tag row) rather than the default fallback
   * used when no tag exists yet (see get-ads.ts). Aggregations like
   * brand-breakdown.ts's messaging-style section must check this — treating
   * every untagged ad as "trust"/"learn_more" would misrepresent brands
   * that simply haven't been classified yet (ANTHROPIC_API_KEY unset, or
   * ingested before this feature existed) as uniformly trust-led.
   */
  messagingClassified: boolean;
  headline: string;
  bodyCopy: string;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "active" | "inactive";
  durationDays: number;
  mediaKind: "video" | "image" | "carousel";
  swatch: [string, string];
  /** Real creative URL from creative_asset.storage_url, when we have one. */
  mediaUrl?: string | null;
}
