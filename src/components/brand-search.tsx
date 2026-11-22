"use client";

import { useMemo, useState } from "react";
import { PlatformDot } from "@/components/platform-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_LABEL } from "@/lib/labels";
import type { BrandOption } from "@/lib/brand-breakdown";
import { useFollows, FREE_FOLLOW_LIMIT } from "@/lib/use-follows";
import { Search } from "lucide-react";

/**
 * The only way a non-admin user finds a new competitor to track, now that
 * /archive is admin-only: a name-only directory (no ad creative, nothing
 * to browse) with a one-click follow that resolves to every platform row
 * sharing that name — see listBrandOptions / followByName.
 */
export function BrandSearch({ options }: { options: BrandOption[] }) {
  const [query, setQuery] = useState("");
  const { user, followedNames, pendingNames, followByName, unfollowByName, followCount } = useFollows();
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query]);

  if (!user) return null;

  const atLimit = followCount >= FREE_FOLLOW_LIMIT;

  return (
    <div className="mb-5 rounded-md border border-border bg-background-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">Track a competitor</h2>
        <span className="mono-tabular text-xs text-muted-foreground">
          {followCount}/{FREE_FOLLOW_LIMIT} tracked
        </span>
      </div>

      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by brand name…"
          className="pl-8"
        />
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {matches.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {matches.map((option) => {
            const key = option.name.trim().toLowerCase();
            const following = followedNames.has(key);
            const pending = pendingNames.has(key);
            return (
              <div
                key={option.name}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{option.name}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {option.platforms.map((p) => (
                      <Badge key={p} variant="outline" className="gap-1 text-[10px]">
                        <PlatformDot platform={p} /> {PLATFORM_LABEL[p]}
                      </Badge>
                    ))}
                    <span className="mono-tabular text-[11px] text-muted-foreground">
                      {option.adCount} ads
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={following ? "ghost" : "default"}
                  disabled={pending || (!following && atLimit)}
                  onClick={async () => {
                    setError(null);
                    const result = following
                      ? await unfollowByName(option.name)
                      : await followByName(option.name, option.brandIds);
                    if (result.error) setError(result.error);
                  }}
                >
                  {pending ? "…" : following ? "Untrack" : "Track"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {query.trim() && matches.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">No brand matches &ldquo;{query}&rdquo;.</p>
      )}

      {!query.trim() && atLimit && (
        <p className="mt-2 text-xs text-muted-foreground">
          You&rsquo;re tracking {FREE_FOLLOW_LIMIT} competitors — the free-tier limit. Untrack one above to
          swap it for another.
        </p>
      )}
    </div>
  );
}
