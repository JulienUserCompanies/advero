import type { AdFormat, CtaType, EmotionalAngle, Platform } from "./types";

// Display labels for the taxonomy values stored on real ads — kept separate
// from the (now-removed) mock data generator, since these are used
// regardless of where an ad's data came from.

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

// The messaging-angle taxonomy that powers the dashboard's "Messaging
// style" section (see messaging-classify.ts) — a short, non-technical
// label plus a one-line gloss for a tooltip/empty-state.
export const EMOTIONAL_ANGLE_LABEL: Record<EmotionalAngle, string> = {
  pain_point: "Pain point",
  aspirational: "Aspirational",
  social_proof: "Social proof",
  urgency: "Urgency",
  curiosity: "Curiosity",
  trust: "Trust",
};

export const EMOTIONAL_ANGLE_DESCRIPTION: Record<EmotionalAngle, string> = {
  pain_point: "Leads with a problem or frustration",
  aspirational: "Leads with an idealized outcome",
  social_proof: "Leads with reviews, users, or results",
  urgency: "Leads with scarcity or a deadline",
  curiosity: "Leads with a question or a hook",
  trust: "Leads with credibility or guarantees",
};
