import { Badge } from "@/components/ui/badge";
import { PlatformDot } from "@/components/platform-dot";
import { PLATFORM_LABEL } from "@/lib/labels";
import type { BrandBreakdown } from "@/lib/brand-breakdown";

const MEDIA_KIND_LABEL: Record<string, string> = {
  image: "image",
  video: "video",
  carousel: "carousel",
};

export function BrandBreakdownCard({ brand }: { brand: BrandBreakdown }) {
  const formatEntries = Object.entries(brand.formatMix).sort(([, a], [, b]) => b - a);

  return (
    <div className="rounded-md border border-border bg-background-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-foreground">{brand.name}</h2>
          <div className="flex items-center gap-1">
            {brand.platforms.map((p) => (
              <Badge key={p} variant="outline" className="gap-1">
                <PlatformDot platform={p} /> {PLATFORM_LABEL[p]}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mono-tabular flex items-center gap-3 text-xs text-muted-foreground">
          <span>{brand.adCount} ads</span>
          <span className="text-accent">{brand.activeCount} active</span>
        </div>
      </div>

      {formatEntries.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {formatEntries
            .map(([kind, count]) => `${count} ${MEDIA_KIND_LABEL[kind] ?? kind}`)
            .join(" · ")}
        </p>
      )}

      {brand.themes.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Recurring themes
          </p>
          {brand.themes.map((theme) => (
            <div key={theme.headline} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">{theme.headline}</p>
                {theme.sampleBody && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{theme.sampleBody}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <div className="flex items-center gap-0.5">
                  {theme.platforms.map((p) => (
                    <PlatformDot key={p} platform={p} />
                  ))}
                </div>
                <Badge className="mono-tabular">{theme.count}×</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
