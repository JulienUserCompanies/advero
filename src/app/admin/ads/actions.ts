"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { ingestLinkedInHtml } from "@/lib/linkedin-ingest";
import { ingestFacebookHtml } from "@/lib/facebook-ingest";

export interface AdsIngestResult {
  adsFound: number;
  adsIngested: number;
  adsClassified: number;
  brands: string[];
  error?: string;
}

const INGESTERS = {
  linkedin: ingestLinkedInHtml,
  facebook: ingestFacebookHtml,
} as const;

export type IngestPlatform = keyof typeof INGESTERS;

/**
 * Re-checks the session and the admin allowlist itself rather than trusting
 * that the page already gated access — a Server Action is a public
 * endpoint regardless of which page calls it, so it authorizes itself.
 */
export async function ingestAdsAction(
  _prevState: AdsIngestResult | null,
  formData: FormData
): Promise<AdsIngestResult> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!isAdminEmail(user?.email)) {
    return { adsFound: 0, adsIngested: 0, adsClassified: 0, brands: [], error: "Not authorized" };
  }

  const platform = String(formData.get("platform") ?? "");
  const ingest = INGESTERS[platform as IngestPlatform];
  if (!ingest) {
    return { adsFound: 0, adsIngested: 0, adsClassified: 0, brands: [], error: "Pick a platform" };
  }

  const html = String(formData.get("html") ?? "");
  if (!html.trim()) {
    return { adsFound: 0, adsIngested: 0, adsClassified: 0, brands: [], error: "Paste the saved page's HTML first" };
  }

  return ingest(html);
}
