// Thin REST client for Cloudflare D1's HTTP Query API.
// Vercel's runtime can't use Wrangler/D1 bindings directly, so we hit
// Cloudflare's REST endpoint instead: one JSON POST per query.
// Docs: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;

export const D1_CONFIGURED = Boolean(ACCOUNT_ID && API_TOKEN && DATABASE_ID);

export class D1Error extends Error {}

export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  if (!D1_CONFIGURED) {
    throw new D1Error("Cloudflare D1 env vars are not set (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN / CLOUDFLARE_D1_DATABASE_ID)");
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      // Revalidate every 60s so new ingested ads show up without a redeploy,
      // while keeping D1 read volume low on the free tier.
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) {
    throw new D1Error(`D1 HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new D1Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
  }

  // D1's HTTP API wraps each statement's result in an array; we only send one.
  return (json.result?.[0]?.results ?? []) as T[];
}
