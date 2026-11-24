import { d1Query } from "./d1";
import type { CtaType, EmotionalAngle } from "./types";

// Storytelling/messaging-angle classification — what powers the "Messaging
// style" section of the per-brand breakdown. Deliberately text-only
// (headline + body copy), not a vision pass over the actual creative image
// or video: that's a separate, much more expensive thing (downloading and
// running every ad's media through a vision model) that isn't built here.
//
// Uses OpenRouter's free model router (openrouter/free) — $0 per token,
// OpenAI-compatible chat/completions API, rate-limited rather than billed.
// Still requires OPENROUTER_API_KEY (free to create at openrouter.ai/keys,
// but it's a real key, not "no key needed"). Without it, classification is
// skipped entirely — ingestion still works, ads just carry no messaging
// tags, same as before this feature existed. A missing key, or the free
// router being rate-limited on a given call, degrades gracefully rather
// than blocking a paste or a cron run — the ad just stays unclassified
// until the next backfill run picks it up.

const API_KEY = process.env.OPENROUTER_API_KEY;
export const CLASSIFIER_CONFIGURED = Boolean(API_KEY);

const EMOTIONAL_ANGLES: EmotionalAngle[] = [
  "pain_point",
  "aspirational",
  "social_proof",
  "urgency",
  "curiosity",
  "trust",
];

const CTA_TYPES: CtaType[] = ["shop_now", "learn_more", "sign_up", "get_offer", "download", "book_demo"];

export interface MessagingClassification {
  emotionalAngle: EmotionalAngle;
  cta: CtaType;
  confidence: number;
}

function buildPrompt(text: string): string {
  return `Classify this ad's primary emotional angle and call-to-action type.

Ad text:
"""
${text.slice(0, 2000)}
"""

Emotional angle — pick exactly one that best describes the dominant hook:
- pain_point: leads with a problem or frustration the reader already has
- aspirational: leads with an idealized outcome or identity ("become", "imagine", "unlock")
- social_proof: leads with other people's results, reviews, ratings, or numbers of users
- urgency: leads with scarcity, a deadline, or limited-time framing
- curiosity: leads with a question, a gap, or a "here's why/how" hook
- trust: leads with credibility, security, guarantees, or authority — use this if nothing else clearly fits

Call-to-action type — pick exactly one that best matches the action the ad is pushing:
shop_now, learn_more, sign_up, get_offer, download, book_demo

Respond with ONLY this JSON object, no other text:
{"angle": "<one of the six angles>", "cta": "<one of the six cta types>", "confidence": <number 0 to 1>}`;
}

/**
 * Classifies one ad's headline + body copy via OpenRouter's free model
 * router. Returns null if the classifier isn't configured, there's no text
 * to classify, the free router is rate-limited for this call, or the
 * response doesn't parse cleanly — callers treat null as "skip, don't tag"
 * rather than retry.
 */
export async function classifyAdMessaging(
  headline: string | null,
  bodyCopy: string | null
): Promise<MessagingClassification | null> {
  if (!API_KEY) return null;
  const text = [headline, bodyCopy].filter((v): v is string => Boolean(v && v.trim())).join("\n").trim();
  if (!text) return null;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
        // Required by some free-tier providers behind the router, optional
        // otherwise — identifies the app for OpenRouter's own rankings.
        "http-referer": "https://advero-sage.vercel.app",
        "x-title": "Advero",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        max_tokens: 100,
        messages: [{ role: "user", content: buildPrompt(text) }],
      }),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const raw: string = json?.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;

    const parsed = JSON.parse(match[0]) as { angle?: string; cta?: string; confidence?: number };
    if (!EMOTIONAL_ANGLES.includes(parsed.angle as EmotionalAngle)) return null;
    if (!CTA_TYPES.includes(parsed.cta as CtaType)) return null;

    return {
      emotionalAngle: parsed.angle as EmotionalAngle,
      cta: parsed.cta as CtaType,
      confidence:
        typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
    };
  } catch {
    return null;
  }
}

export interface ClassifyDebugResult {
  configured: boolean;
  status?: number;
  ok?: boolean;
  rawBody?: string;
  parsedText?: string;
  error?: string;
}

/**
 * Same call as classifyAdMessaging, but surfaces exactly what OpenRouter
 * returned instead of swallowing it into null — for the backfill route's
 * ?debug=1 mode. Not used by ingestion; only for diagnosing a run that
 * comes back with classified:0.
 */
export async function classifyAdMessagingDebug(
  headline: string | null,
  bodyCopy: string | null
): Promise<ClassifyDebugResult> {
  if (!API_KEY) return { configured: false };
  const text = [headline, bodyCopy].filter((v): v is string => Boolean(v && v.trim())).join("\n").trim();
  if (!text) return { configured: true, error: "no headline/body text to classify" };

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${API_KEY}`,
        "content-type": "application/json",
        "http-referer": "https://advero-sage.vercel.app",
        "x-title": "Advero",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        max_tokens: 100,
        messages: [{ role: "user", content: buildPrompt(text) }],
      }),
    });
    const rawBody = await res.text();
    let parsedText: string | undefined;
    try {
      const json = JSON.parse(rawBody);
      parsedText = json?.choices?.[0]?.message?.content;
    } catch {
      // rawBody wasn't JSON — leave parsedText undefined, rawBody shows why.
    }
    return { configured: true, status: res.status, ok: res.ok, rawBody: rawBody.slice(0, 1500), parsedText };
  } catch (err) {
    return { configured: true, error: err instanceof Error ? err.message : String(err) };
  }
}

async function saveMessagingTags(adId: string, result: MessagingClassification): Promise<void> {
  await d1Query(
    `INSERT INTO tag (id, ad_id, taxonomy, value, confidence)
     VALUES (?, ?, 'emotional_angle', ?, ?)
     ON CONFLICT(id) DO UPDATE SET value = excluded.value, confidence = excluded.confidence`,
    [`tag-angle-${adId}`, adId, result.emotionalAngle, result.confidence]
  );
  await d1Query(
    `INSERT INTO tag (id, ad_id, taxonomy, value, confidence)
     VALUES (?, ?, 'cta_type', ?, ?)
     ON CONFLICT(id) DO UPDATE SET value = excluded.value, confidence = excluded.confidence`,
    [`tag-cta-${adId}`, adId, result.cta, result.confidence]
  );
}

export interface ClassifiableAd {
  id: string;
  headline: string | null;
  bodyCopy: string | null;
}

/**
 * Classifies and tags a batch of ads that don't have a messaging tag yet,
 * with limited concurrency so one ingestion run can't fan out into dozens
 * of simultaneous API calls — kept modest since the free router is
 * rate-limited, not billed, so hammering it just produces more skipped
 * (null) classifications rather than a bigger bill. Best-effort throughout:
 * a classification failure for one ad is swallowed so it never breaks
 * ingestion itself — worst case that ad just stays untagged until the next
 * backfill run.
 *
 * Returns how many ads were actually tagged, so callers (ingestion
 * responses, the backfill route) can report it.
 */
export async function classifyAndTagAds(ads: ClassifiableAd[], concurrency = 2): Promise<number> {
  if (!CLASSIFIER_CONFIGURED || ads.length === 0) return 0;

  let tagged = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < ads.length) {
      const ad = ads[cursor++];
      try {
        const result = await classifyAdMessaging(ad.headline, ad.bodyCopy);
        if (result) {
          await saveMessagingTags(ad.id, result);
          tagged += 1;
        }
      } catch {
        // Best-effort — move on.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, ads.length) }, worker));
  return tagged;
}

/**
 * Finds ads that have no 'emotional_angle' tag yet (new ads from any
 * ingestion path, or ads that predate this feature), up to `limit` rows —
 * the bound keeps one call inside a serverless function's time budget;
 * the backfill route calls this repeatedly until it reports zero.
 */
export async function findUnclassifiedAds(limit: number): Promise<ClassifiableAd[]> {
  return d1Query<ClassifiableAd>(
    `SELECT ad.id, ad.headline, ad.body_copy AS bodyCopy
     FROM ad
     WHERE ad.id NOT IN (SELECT ad_id FROM tag WHERE taxonomy = 'emotional_angle')
     LIMIT ?`,
    [limit]
  );
}
