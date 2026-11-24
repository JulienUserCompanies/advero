import { Badge } from "@/components/ui/badge";
import { PlatformDot } from "@/components/platform-dot";
import { EMOTIONAL_ANGLE_LABEL, PLATFORM_LABEL } from "@/lib/labels";
import { ANGLE_ORDER, type BrandBreakdown } from "@/lib/brand-breakdown";
import type { EmotionalAngle } from "@/lib/types";

// One accent color per angle, cycling the same palette used for ad-card
// swatches elsewhere in the app rather than introducing a new one.
const ANGLE_COLOR: Record<EmotionalAngle, string> = {
  pain_point: "#ff5f7e",
  aspirational: "#c77dff",
  social_proof: "#b4ff39",
  urgency: "#ffcf5c",
  curiosity: "#3dc6ff",
  trust: "#4e8cff",
};

const MEDIA_KIND_LABEL: Record<string, string> = {
  image: "image",
  video: "video",
  carousel: "carousel",
};

export function BrandBreakdownCard({ brand }: { brand: BrandBreakdown }) {
  const formatEntries = Object.entries(brand.formatMix).sort(([, a], [, b]) => b - a);
  const angleEntries = ANGLE_ORDER.filter((angle) => (brand.messaging.angleMix[angle] ?? 0) > 0).map(
    (angle) => [angle, brand.messaging.angleMix[angle] ?? 0] as const
  );

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

      {angleEntries.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Messaging style
            {brand.messaging.classifiedCount < brand.adCount && (
              <span className="normal-case tracking-normal text-muted-foreground/70">
                {" "}
                · {brand.messaging.classifiedCount}/{brand.adCount} classified
              </span>
            )}
          </p>

          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-border">
            {angleEntries.map(([angle, count]) => (
              <div
                key={angle}
                style={{
                  width: `${(count / brand.messaging.classifiedCount) * 100}%`,
                  backgroundColor: ANGLE_COLOR[angle],
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {angleEntries.map(([angle, count]) => (
              <span key={angle} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ANGLE_COLOR[angle] }} />
                {EMOTIONAL_ANGLE_LABEL[angle]} ({count})
              </span>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {brand.messaging.angleDiversity <= 1
              ? `Running one consistent angle: ${EMOTIONAL_ANGLE_LABEL[brand.messaging.dominantAngle!].toLowerCase()}.`
              : `Testing ${brand.messaging.angleDiversity} different angles at once — still searching for what works, or deliberately targeting different audiences.`}
          </p>
        </div>
      )}
    </div>
  );
}
