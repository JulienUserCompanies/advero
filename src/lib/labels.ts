import type { AdFormat, CtaType, Platform } from "./types";

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
