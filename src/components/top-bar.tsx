"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search, Bell, Terminal } from "lucide-react";

export function TopBar({
  query,
  onQueryChange,
  resultCount,
  onCreateAlert,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  resultCount: number;
  onCreateAlert: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-accent text-accent-foreground">
            <Terminal className="size-3.5" strokeWidth={2.5} />
          </div>
          <span className="mono-tabular text-sm font-semibold tracking-tight text-foreground">
            ADVERO
          </span>
        </div>
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <a className="rounded-md px-2.5 py-1.5 text-foreground">Archive</a>
          <a className="rounded-md px-2.5 py-1.5 hover:bg-background-raised hover:text-foreground">
            Saved Searches
          </a>
          <a className="rounded-md px-2.5 py-1.5 hover:bg-background-raised hover:text-foreground">
            Alerts
          </a>
        </nav>
        <div className="relative ml-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search brands, hooks, headlines…"
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={onCreateAlert} className="shrink-0">
          <Bell className="size-3.5" />
          Alert me on this search
        </Button>
        <ThemeToggle />
      </div>
      <div className="flex h-9 items-center justify-between border-t border-border px-4 lg:px-6">
        <p className="mono-tabular text-xs text-muted-foreground">
          {resultCount.toLocaleString()} ads · live archive
        </p>
      </div>
    </header>
  );
}
