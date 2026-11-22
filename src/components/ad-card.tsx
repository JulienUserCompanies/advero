"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PlatformDot } from "@/components/platform-dot";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PLATFORM_LABEL, FORMAT_LABEL, CTA_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Ad, Platform } from "@/lib/types";
import type { ToggleFollowResult } from "@/lib/use-follows";
import { Play, Images, Lock, Heart } from "lucide-react";

const ARCHIVE_NOW = new Date("2026-11-20T00:00:00Z").getTime();

function relativeDays(iso: string) {
  const diff = Math.round((ARCHIVE_NOW - new Date(iso).getTime()) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "1d ago";
  return `${diff}d ago`;
}

// Platforms where the grid teases the ad instead of rendering it directly —
// same pattern for both: the card shows brand/format/persona metadata only,
// and the full creative renders in a dialog on click. Keeps the gallery
// light and consistent regardless of why a given source is handled this way.
const TEASED_PLATFORMS: Platform[] = ["linkedin", "apple"];

export function AdCard({
  ad,
  view,
  following = false,
  pending = false,
  onToggleFollow,
}: {
  ad: Ad;
  view: "gallery" | "minimal";
  following?: boolean;
  pending?: boolean;
  onToggleFollow?: (brandId: string, brandName: string) => Promise<ToggleFollowResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const teased = TEASED_PLATFORMS.includes(ad.platform);
  const hasRealMedia = Boolean(ad.mediaUrl);

  async function handleFollowClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onToggleFollow || pending) return;
    setFollowError(null);
    const result = await onToggleFollow(ad.brandId, ad.brandName);
    if (result.needsAuth) {
      router.push("/login");
      return;
    }
    if (result.error) setFollowError(result.error);
  }

  // Real creatives render at their own natural aspect ratio (no fixed box,
  // no object-contain/object-cover) — ad screenshots come in every shape
  // (Apple's are tall portrait phone shots, Meta/TikTok vary too), and
  // forcing them into one fixed ratio either crops them or surrounds them
  // with big empty bars. Letting the <img>/<video> size itself keeps the
  // whole ad visible and fills the card. Only the no-media placeholder
  // (a row with no creative_asset yet) needs a fixed box, since a flat
  // color swatch has no intrinsic size of its own.
  const thumb = hasRealMedia ? (
    // The box itself is sized to 80% of the card (not full-width with the
    // image floating smaller inside it), so there's no painted margin
    // around the creative — just the card's own background, same as the
    // gap above/below it.
    <div className="relative mx-auto mt-3 w-4/5 overflow-hidden rounded-md">
      {ad.mediaKind === "video" ? (
        <video src={ad.mediaUrl!} className="block w-full" muted loop playsInline autoPlay />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- creatives come from many third-party CDNs (Apple, Meta, ...), so a plain <img> avoids maintaining a remotePatterns allowlist per source.
        <img src={ad.mediaUrl!} alt={ad.headline} className="block w-full" loading="lazy" />
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
  ) : (
    <div
      className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-t-md"
      style={{
        background: `linear-gradient(145deg, ${ad.swatch[0]}, ${ad.swatch[0]} 55%, ${ad.swatch[1]}22)`,
      }}
    >
      <div className="noise-grid absolute inset-0 opacity-40" />
      <span
        className="relative px-4 text-center text-sm font-medium leading-snug"
        style={{ color: ad.swatch[1] }}
      >
        {ad.headline}
      </span>
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

  // The grid-card version of a teased platform: same box size as every
  // other card (aspect-video) with the top sliver of the real ad peeking
  // through, fading down into the card background — never the full
  // creative. Clicking opens the untouched, full version in the dialog.
  const teaser = (
    <div className="relative aspect-video w-full overflow-hidden rounded-t-md bg-background-overlay">
      {hasRealMedia ? (
        ad.mediaKind === "video" ? (
          <video
            src={ad.mediaUrl!}
            className="absolute inset-0 h-full w-full object-cover object-top"
            muted
            loop
            playsInline
            autoPlay
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- see thumb above
          <img
            src={ad.mediaUrl!}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-top"
            loading="lazy"
          />
        )
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(145deg, ${ad.swatch[0]}, ${ad.swatch[0]} 55%, ${ad.swatch[1]}22)`,
          }}
        >
          <div className="noise-grid absolute inset-0 opacity-40" />
        </div>
      )}

      {/* Fades the lower ~65% of the box down to the card background, so
          only the top of the ad is actually visible. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, transparent 0%, transparent 32%, var(--background-overlay) 88%)",
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 pb-3 pt-6 text-center">
        <Lock className="size-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Click to view ad</span>
      </div>

      <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 backdrop-blur-sm">
        <PlatformDot platform={ad.platform} />
        <span className="text-[10px] font-medium text-white/90">{PLATFORM_LABEL[ad.platform]}</span>
      </div>
      {ad.status === "active" && (
        <span className="absolute right-2 top-2 rounded-full border border-accent/40 bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
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
    <>
      <div
        role={teased ? "button" : undefined}
        tabIndex={teased ? 0 : undefined}
        onClick={teased ? () => setOpen(true) : undefined}
        onKeyDown={
          teased
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen(true);
                }
              }
            : undefined
        }
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-md border border-border bg-background-raised transition-colors hover:border-border-strong",
          teased && "cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        )}
      >
        {teased ? teaser : thumb}
        <div className="flex flex-1 flex-col space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium text-foreground">{ad.brandName}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="mono-tabular text-[11px] text-muted-foreground">
                {relativeDays(ad.lastSeenAt)}
              </span>
              {onToggleFollow && (
                <button
                  type="button"
                  onClick={handleFollowClick}
                  disabled={pending}
                  aria-label={following ? `Unfollow ${ad.brandName}` : `Follow ${ad.brandName}`}
                  title={following ? `Unfollow ${ad.brandName}` : `Follow ${ad.brandName}`}
                  className={cn(
                    "rounded p-0.5 text-muted-foreground transition-colors hover:text-accent disabled:opacity-50",
                    following && "text-accent"
                  )}
                >
                  <Heart className={cn("size-3.5", following && "fill-current")} />
                </button>
              )}
            </div>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{ad.bodyCopy}</p>
          {followError && (
            <p className="text-[11px] leading-snug text-danger">{followError}</p>
          )}
          <div className="mt-auto flex flex-wrap gap-1 pt-0.5">
            <Badge>{FORMAT_LABEL[ad.format]}</Badge>
            <Badge>{CTA_LABEL[ad.cta]}</Badge>
            <Badge variant="accent">{ad.industry}</Badge>
          </div>
        </div>
      </div>

      {teased && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg">
            <DialogTitle className="text-sm font-semibold text-foreground">{ad.brandName}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {PLATFORM_LABEL[ad.platform]} · {FORMAT_LABEL[ad.format]} · {relativeDays(ad.lastSeenAt)}
            </DialogDescription>
            <div className="mt-3 overflow-hidden rounded-md border border-border">{thumb}</div>
            <p className="mt-3 text-sm font-medium text-foreground">{ad.headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ad.bodyCopy}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              <Badge>{FORMAT_LABEL[ad.format]}</Badge>
              <Badge>{CTA_LABEL[ad.cta]}</Badge>
              <Badge variant="accent">{ad.industry}</Badge>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
