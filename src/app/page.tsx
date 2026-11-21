import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Terminal,
  Search,
  Tags,
  BellRing,
  Users,
  Check,
  ArrowRight,
} from "lucide-react";

const PLATFORMS = ["Meta", "TikTok", "LinkedIn", "Apple App Store"];

const FEATURES = [
  {
    icon: Search,
    title: "One searchable archive",
    body: "Every ad your tracked brands run, pulled continuously from Meta, TikTok, LinkedIn and the Apple App Store into one place — no more checking each platform by hand.",
  },
  {
    icon: Tags,
    title: "Tagged automatically",
    body: "Hook type, format, CTA and emotional angle are tagged on ingest, so you can filter straight to “UGC testimonials with urgency hooks” instead of scrolling everything.",
  },
  {
    icon: BellRing,
    title: "Alerts, not refreshes",
    body: "Save a search once and get an email the moment a tracked competitor ships something new that matches it.",
  },
  {
    icon: Users,
    title: "Built around competitors, not categories",
    body: "Follow the specific brands you compete with and see their ad activity first, rather than panning through an entire industry feed.",
  },
];

const FREE_FEATURES = [
  "Full access to the ad archive",
  "Follow up to 3 competitors",
  "Search and filter by platform, format and CTA",
  "See how long an ad has been running",
];

const PRO_FEATURES = [
  "Unlimited competitors followed",
  "Saved searches with email alerts",
  "Full LinkedIn and Apple App Store coverage",
  "Priority ingestion for your tracked brands",
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-4 px-4 lg:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-accent text-accent-foreground">
              <Terminal className="size-3.5" strokeWidth={2.5} />
            </div>
            <span className="mono-tabular text-sm font-semibold tracking-tight text-foreground">
              ADVERO
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <a href="#pricing">Pricing</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/archive">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/archive">
                Browse the archive
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-[1200px] px-4 py-20 lg:px-6 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mono-tabular inline-flex items-center rounded-full border border-border bg-background-raised px-3 py-1 text-xs text-muted-foreground">
              Now tracking {PLATFORMS.join(" · ")}
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
              Every ad your competitors run, in one place.
            </h1>
            <p className="mt-4 text-balance text-base leading-relaxed text-muted-foreground lg:text-lg">
              Advero watches Meta, TikTok, LinkedIn and the Apple App Store for the
              brands you follow, tags every ad automatically, and tells you the
              moment something new ships.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="default">
                <Link href="/archive">
                  Browse the archive — free
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button asChild size="default" variant="outline">
                <a href="#pricing">See pricing</a>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              No card required to follow your first 3 competitors.
            </p>
          </div>
        </section>

        <section className="border-t border-border bg-background-raised/40">
          <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-6 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col gap-3 rounded-md border border-border bg-background-raised p-5"
              >
                <div className="flex size-9 items-center justify-center rounded-md bg-accent/15 text-accent">
                  <f.icon className="size-4.5" />
                </div>
                <h3 className="text-sm font-medium text-foreground">{f.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto w-full max-w-[1200px] px-4 py-20 lg:px-6">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
              Start free. Grow into Pro when you're tracking more than a few brands.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Every account gets the full archive — the limit is how many
              competitors you can follow at once.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-5 rounded-md border border-border bg-background-raised p-6">
              <div>
                <h3 className="text-sm font-medium text-foreground">Free</h3>
                <p className="mt-1 text-2xl font-semibold text-foreground">$0</p>
                <p className="text-xs text-muted-foreground">Forever, no card needed</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild size="sm" variant="outline">
                <Link href="/archive">Get started free</Link>
              </Button>
            </div>

            <div className="flex flex-col gap-5 rounded-md border border-accent/40 bg-background-raised p-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Pro</h3>
                  <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    Coming soon
                  </span>
                </div>
                <p className="mt-1 text-2xl font-semibold text-foreground">Contact us</p>
                <p className="text-xs text-muted-foreground">For teams tracking a full category</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2.5">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="subtle" disabled>
                Join the waitlist
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row lg:px-6">
          <span>© 2026 Advero.</span>
          <Link href="/archive" className="hover:text-foreground">
            Browse the archive
          </Link>
        </div>
      </footer>
    </div>
  );
}
