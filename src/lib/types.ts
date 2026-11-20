export type Platform = "meta" | "tiktok" | "linkedin";

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
  headline: string;
  bodyCopy: string;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "active" | "inactive";
  durationDays: number;
  mediaKind: "video" | "image" | "carousel";
  swatch: [string, string];
}
