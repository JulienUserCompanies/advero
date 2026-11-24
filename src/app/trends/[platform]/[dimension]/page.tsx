import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdCard } from "@/components/ad-card";
import { EMOTIONAL_ANGLE_LABEL, CTA_LABEL } from "@/lib/labels";
import {
  getTrendPage,
  TREND_DIMENSIONS,
  TREND_PLATFORMS,
  type TrendDimensionSlug,
  type TrendPlatformSlug,
} from "@/lib/trends";
import type { CtaType, EmotionalAngle } from "@/lib/types";

export const instant = false;

function labelForValue(dimension: TrendDimensionSlug, value: string): string {
  return dimension === "emotional-angle"
    ? EMOTIONAL_ANGLE_LABEL[value as EmotionalAngle]
    : CTA_LABEL[value as CtaType];
}

export default async function TrendPage({
  params,
}: {
  params: Promise<{ platform: string; dimension: string }>;
}) {
  const { platform, dimension } = await params;
  const platformSlug = platform as TrendPlatformSlug;
  const dimensionSlug = dimension as TrendDimensionSlug;

  const platformMeta = TREND_PLATFORMS.find((p) => p.slug === platformSlug);
  const dimensionMeta = TREND_DIMENSIONS.find((d) => d.slug === dimensionSlug);
  if (!platformMeta?.live || !dimensionMeta?.live) notFound();

  const data = await getTrendPage(platformSlug, dimensionSlug);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[900px] items-center gap-4 px-4 lg:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-accent text-accent-foreground">
              <Terminal className="size-3.5" strokeWidth={2.5} />
            </div>
            <span className="mono-tabular text-sm font-semibold tracking-tight text-foreground">ADVERO</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/trends">All trends</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">
                Track your competitors
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] flex-1 px-4 py-12 lg:px-6">
        <Link href="/trends" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3" /> All trends
        </Link>

        {!data ? (
          <div className="mt-6 rounded-lg border border-border bg-background-raised p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Not enough tracked {platformMeta.label} ads classified for {dimensionMeta.label} yet. Check
              back as the archive grows.
            </p>
          </div>
        ) : (
          <>
            <p className="mono-tabular mt-4 text-xs uppercase tracking-wide text-muted-foreground">
              {platformMeta.label} · {dimensionMeta.label}
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
              {data.headline ? (
                <>
                  {labelForValue(dimensionSlug, data.headline.value)} moved from{" "}
                  {Math.round(data.headline.firstWeekPct)}% to {Math.round(data.headline.lastWeekPct)}% of
                  tracked {platformMeta.label} ads over the {data.headline.weeksSpanned} weeks we&apos;ve
                  tracked them
                </>
              ) : (
                <>
                  {labelForValue(dimensionSlug, data.dominantValue)} is the most common {dimensionMeta.label.toLowerCase()}{" "}
                  on tracked {platformMeta.label} ads right now
                </>
              )}
            </h1>

            {data.weeks.length >= 2 && (
              <div className="mt-8">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {labelForValue(dimensionSlug, data.headline?.value ?? data.dominantValue)} — weekly share
                </p>
                <div className="mt-3 flex items-end gap-2" style={{ height: 120 }}>
                  {data.weeks.map((w) => {
                    const value = data.headline?.value ?? data.dominantValue;
                    const pct = w.total > 0 ? ((w.valueCounts[value] ?? 0) / w.total) * 100 : 0;
                    return (
                      <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className="w-full rounded-t bg-accent"
                            style={{ height: `${Math.max(2, pct)}%` }}
                            title={`${w.week}: ${Math.round(pct)}%`}
                          />
                        </div>
                        <span className="mono-tabular text-[10px] text-muted-foreground">{Math.round(pct)}%</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>{data.earliestWeek}</span>
                  <span>{data.latestWeek}</span>
                </div>
              </div>
            )}

            <p className="mt-6 rounded-md border border-border bg-background-raised p-3 text-sm text-muted-foreground">
              <span className="text-foreground">This week&apos;s snapshot:</span> {data.totalAds.toLocaleString()}{" "}
              classified {platformMeta.label} ads tracked. {data.dominantCount.toLocaleString()} (
              {Math.round((data.dominantCount / data.totalAds) * 100)}%) use a{" "}
              {labelForValue(dimensionSlug, data.dominantValue).toLowerCase()} {dimensionSlug === "cta-type" ? "CTA" : "angle"}.
            </p>

            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Examples from the archive
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {data.examples.map((ad) => (
                  <AdCard key={ad.id} ad={ad} view="gallery" />
                ))}
              </div>
              {data.moreCount > 0 && (
                <div className="mt-4 rounded-md border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-foreground">
                    See the other {data.moreCount} ad{data.moreCount === 1 ? "" : "s"} in this trend
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sign up free to browse the full set and filter by your own competitor set.
                  </p>
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/dashboard">
                      Track your competitors
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <p className="mt-10 text-xs text-muted-foreground">
              Based on {data.totalAds.toLocaleString()} classified {platformMeta.label} ads Advero has
              tracked so far, over the {data.weeks.length} week{data.weeks.length === 1 ? "" : "s"} of
              history we have for this category. Figures reflect brands actively tracked in this category,
              not every ad on {platformMeta.label}.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
