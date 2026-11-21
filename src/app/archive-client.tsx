"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { FiltersSidebar, type FacetCount } from "@/components/filters-sidebar";
import { AdCard } from "@/components/ad-card";
import { AdTable } from "@/components/ad-table";
import { PaginationBar } from "@/components/pagination-bar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABEL, FORMAT_LABEL, CTA_LABEL } from "@/lib/mock-data";
import type { Ad, Platform, AdFormat, CtaType } from "@/lib/types";
import { LayoutGrid, Rows3, Table2 } from "lucide-react";

const PAGE_SIZE = 24;
type View = "gallery" | "minimal" | "table";

function countBy<T extends string>(ads: Ad[], key: (a: Ad) => T, labels: Record<T, string>): FacetCount[] {
  const counts = new Map<string, number>();
  for (const ad of ads) {
    const k = key(ad);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return Object.keys(labels).map((k) => ({
    key: k,
    label: labels[k as T],
    count: counts.get(k) ?? 0,
  }));
}

export function ArchiveClient({ ads }: { ads: Ad[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("gallery");
  const [page, setPage] = useState(1);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selected, setSelected] = useState({
    platforms: new Set<string>(),
    industries: new Set<string>(),
    formats: new Set<string>(),
    ctas: new Set<string>(),
  });

  const industries = useMemo(() => {
    const set = new Set(ads.map((a) => a.industry));
    const labels: Record<string, string> = {};
    set.forEach((i) => (labels[i] = i));
    return countBy(ads, (a) => a.industry, labels);
  }, [ads]);

  const platformFacets = useMemo(
    () => countBy<Platform>(ads, (a) => a.platform, PLATFORM_LABEL),
    [ads]
  );
  const formatFacets = useMemo(
    () => countBy<AdFormat>(ads, (a) => a.format, FORMAT_LABEL),
    [ads]
  );
  const ctaFacets = useMemo(() => countBy<CtaType>(ads, (a) => a.cta, CTA_LABEL), [ads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ads.filter((ad) => {
      if (selected.platforms.size && !selected.platforms.has(ad.platform)) return false;
      if (selected.industries.size && !selected.industries.has(ad.industry)) return false;
      if (selected.formats.size && !selected.formats.has(ad.format)) return false;
      if (selected.ctas.size && !selected.ctas.has(ad.cta)) return false;
      if (!q) return true;
      return (
        ad.brandName.toLowerCase().includes(q) ||
        ad.headline.toLowerCase().includes(q) ||
        ad.bodyCopy.toLowerCase().includes(q)
      );
    });
  }, [ads, query, selected]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggle(group: "platforms" | "industries" | "formats" | "ctas", key: string) {
    setSelected((prev) => {
      const next = new Set(prev[group]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setPage(1);
      return { ...prev, [group]: next };
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        query={query}
        onQueryChange={(v) => {
          setQuery(v);
          setPage(1);
        }}
        resultCount={filtered.length}
        onCreateAlert={() => setAlertOpen(true)}
      />
      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        <FiltersSidebar
          platforms={platformFacets}
          industries={industries}
          formats={formatFacets}
          ctas={ctaFacets}
          selected={selected}
          onToggle={toggle}
        />
        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-sm font-medium text-foreground">
              Ad Archive <span className="text-muted-foreground">· every industry</span>
            </h1>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="gallery">
                  <LayoutGrid className="size-3.5" /> Gallery
                </TabsTrigger>
                <TabsTrigger value="minimal">
                  <Rows3 className="size-3.5" /> Minimal
                </TabsTrigger>
                <TabsTrigger value="table">
                  <Table2 className="size-3.5" /> Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {pageItems.length === 0 ? (
            <div className="noise-grid flex flex-col items-center justify-center rounded-md border border-dashed border-border py-24 text-center">
              <p className="text-sm text-muted-foreground">No ads match these filters.</p>
            </div>
          ) : view === "table" ? (
            <AdTable ads={pageItems} />
          ) : (
            <div
              className={
                view === "gallery"
                  ? "grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "flex flex-col gap-2"
              }
            >
              {pageItems.map((ad) => (
                <AdCard key={ad.id} ad={ad} view={view} />
              ))}
            </div>
          )}

          <PaginationBar page={page} pageCount={pageCount} onPageChange={setPage} />
        </main>
      </div>

      <Dialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DialogContent>
          <DialogTitle className="text-sm font-semibold text-foreground">Alert created</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
            You&apos;ll get an email whenever a new ad matches{" "}
            <span className="text-foreground">
              {query ? `"${query}"` : "your current filters"}
            </span>
            .
          </DialogDescription>
          <Button className="mt-4 w-full" size="sm" onClick={() => setAlertOpen(false)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
