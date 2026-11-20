import { Badge } from "@/components/ui/badge";
import { PlatformDot } from "@/components/platform-dot";
import { PLATFORM_LABEL, FORMAT_LABEL, CTA_LABEL } from "@/lib/mock-data";
import type { Ad } from "@/lib/types";
import { Play, Images } from "lucide-react";

const ARCHIVE_NOW = new Date("2026-11-20T00:00:00Z").getTime();

function relativeDays(iso: string) {
  const diff = Math.round((ARCHIVE_NOW - new Date(iso).getTime()) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "1d ago";
  return `${diff}d ago`;
}

export function AdCard({ ad, view }: { ad: Ad; view: "gallery" | "minimal" }) {
  const hasRealMedia = Boolean(ad.mediaUrl);

  const thumb = (
    <div
      className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-t-md"
      style={
        hasRealMedia
          ? undefined
          : {
              background: `linear-gradient(145deg, ${ad.swatch[0]}, ${ad.swatch[0]} 55%, ${ad.swatch[1]}22)`,
            }
      }
    >
      {hasRealMedia ? (
        ad.mediaKind === "video" ? (
          <video
            src={ad.mediaUrl!}
            className="absolute inset-0 size-full object-cover"
            muted
            loop
            playsInline
            autoPlay
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- creatives come from many third-party CDNs (Apple, Meta, ...), so a plain <img> avoids maintaining a remotePatterns allowlist per source.
          <img
            src={ad.mediaUrl!}
            alt={ad.headline}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
          />
        )
      ) : (
        <>
          <div className="noise-grid absolute inset-0 opacity-40" />
          <span
            className="relative px-4 text-center text-sm font-medium leading-snug"
            style={{ color: ad.swatch[1] }}
          >
            {ad.headline}
          </span>
        </>
      )}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 backdrop-blur-sm">
        <PlatformDot platform={ad.platform} />
        <span className="text-[10px] font-medium text-white/90">{PLATFORM_LABEL[ad.platform]}</span>
      </div>
      <div className="absolute right-2 top-2 rounded-full bg-black/40 p-1 backdrop-blur-sm">
        {ad.mediaKind === "video" ? (
          <Play className="size-3 text-white/90" />
        ) : (
          <Images className="size-3 text-white/90" />
        )}
      </div>
      {ad.status === "active" && (
        <span className="absolute bottom-2 left-2 rounded-full border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
          Active · {ad.durationDays}d
        </span>
      )}
    </div>
  );

  if (view === "minimal") {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-background-raised p-2.5 transition-colors hover:border-border-strong">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded"
          style={{ background: ad.swatch[0] }}
        >
          <PlatformDot platform={ad.platform} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground">{ad.brandName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="truncate text-sm text-muted-foreground">{ad.headline}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{FORMAT_LABEL[ad.format]}</span>
            <span>·</span>
            <span>{relativeDays(ad.lastSeenAt)}</span>
          </div>
        </div>
        <span className="mono-tabular shrink-0 text-xs text-muted-foreground">{ad.durationDays}d</span>
      </div>
    );
  }

  return (
    <div className="group overflow-hidden rounded-md border border-border bg-background-raised transition-colors hover:border-border-strong">
      {thumb}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-foreground">{ad.brandName}</span>
          <span className="mono-tabular shrink-0 text-[11px] text-muted-foreground">
            {relativeDays(ad.lastSeenAt)}
          </span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{ad.bodyCopy}</p>
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Badge>{FORMAT_LABEL[ad.format]}</Badge>
          <Badge>{CTA_LABEL[ad.cta]}</Badge>
          <Badge variant="accent">{ad.industry}</Badge>
        </div>
      </div>
    </div>
  );
}
