"use server";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { ingestLinkedInHtml, type LinkedInIngestResult } from "@/lib/linkedin-ingest";

/**
 * Re-checks the session and the admin allowlist itself rather than trusting
 * that the page already gated access — a Server Action is a public
 * endpoint regardless of which page calls it, so it authorizes itself.
 */
export async function ingestLinkedInAction(
  _prevState: LinkedInIngestResult | null,
  formData: FormData
): Promise<LinkedInIngestResult> {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!isAdminEmail(user?.email)) {
    return { adsFound: 0, adsIngested: 0, brands: [], error: "Not authorized" };
  }

  const html = String(formData.get("html") ?? "");
  if (!html.trim()) {
    return { adsFound: 0, adsIngested: 0, brands: [], error: "Paste the saved page's HTML first" };
  }

  return ingestLinkedInHtml(html);
}
