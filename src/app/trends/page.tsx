import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getHubCounts, getTotalClassifiedCount, TREND_DIMENSIONS, TREND_PLATFORMS } from "@/lib/trends";

export const instant = false;

export default async function TrendsHubPage() {
  const [counts, totalClassified] = await Promise.all([getHubCounts(), getTotalClassifiedCount()]);

  const countFor = (platformSlug: string, dimension: string) =>
    counts.find((c) => c.platformSlug === platformSlug && c.dimension === dimension)?.totalAds ?? 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 lg:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-accent text-accent-foreground">
              <Terminal className="size-3.5" strokeWidth={2.5} />
            </div>
            <span className="mono-tabular text-sm font-semibold tracking-tight text-foreground">ADVERO</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Log in</Link>
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

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-4 py-16 lg:px-6">
          <span className="mono-tabular inline-flex items-center rounded-full border border-border bg-background-raised px-3 py-1 text-xs text-muted-foreground">
            Ad Trends
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            What the archive is actually seeing — not opinions, the data.
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground">
            We tag every ad we track by hook, format, CTA and emotional angle. Right
            now that&apos;s <strong className="text-foreground">{totalClassified.toLocaleString()} classified ads</strong>{" "}
            across Meta, LinkedIn and the Apple App Store — a young, growing archive,
            not a finished one. Every number on this page comes straight from that
            tagging, over whatever history we&apos;ve actually tracked so far.
          </p>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-4 pb-16 lg:px-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Browse by platform</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TREND_PLATFORMS.map((p) => (
              <div
                key={p.slug}
                className="rounded-lg border border-border bg-background-raised p-4"
              >
                <p className="text-sm font-medium text-foreground">{p.label}</p>
                {p.live ? (
                  <ul className="mt-2 flex flex-col gap-1">
                    {TREND_DIMENSIONS.filter((d) => d.live).map((d) => {
                      const count = countFor(p.slug, d.slug);
                      return (
                        <li key={d.slug}>
                          {count > 0 ? (
                            <Link
                              href={`/trends/${p.slug}/${d.slug}`}
                              className="text-xs text-accent hover:underline"
                            >
                              {d.label} ({count})
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{d.label} — no data yet</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Not tracked yet</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-4 pb-20 lg:px-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Browse by creative dimension</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TREND_DIMENSIONS.map((d) => (
              <div key={d.slug} className="rounded-lg border border-border bg-background-raised p-4">
                <p className="text-sm font-medium text-foreground">{d.label}</p>
                {d.live ? (
                  <ul className="mt-2 flex flex-col gap-1">
                    {TREND_PLATFORMS.filter((p) => p.live).map((p) => {
                      const count = countFor(p.slug, d.slug);
                      return (
                        <li key={p.slug}>
                          {count > 0 ? (
                            <Link
                              href={`/trends/${p.slug}/${d.slug}`}
                              className="text-xs text-accent hover:underline"
                            >
                              {p.label} ({count})
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{p.label} — no data yet</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Classification not live yet</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground lg:px-6">
        Figures reflect ads actively tracked by Advero, not the full universe of ads
        on any platform. <Link href="/dashboard" className="text-accent hover:underline">Track your own competitors →</Link>
      </footer>
    </div>
  );
}
