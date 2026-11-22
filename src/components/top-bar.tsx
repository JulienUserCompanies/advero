"use client";

import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { isAdminEmail } from "@/lib/admin";
import { Search, Bell, Terminal, Heart } from "lucide-react";

export function TopBar({
  query,
  onQueryChange,
  resultCount,
  onCreateAlert,
  user,
  followCount,
  followLimit,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  resultCount: number;
  onCreateAlert: () => void;
  user?: User | null;
  followCount?: number;
  followLimit?: number;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-accent text-accent-foreground">
            <Terminal className="size-3.5" strokeWidth={2.5} />
          </div>
          <span className="mono-tabular text-sm font-semibold tracking-tight text-foreground">
            ADVERO
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
          <Link href="/archive" className="rounded-md px-2.5 py-1.5 text-foreground">
            Archive
          </Link>
          <a className="rounded-md px-2.5 py-1.5 hover:bg-background-raised hover:text-foreground">
            Saved Searches
          </a>
          <a className="rounded-md px-2.5 py-1.5 hover:bg-background-raised hover:text-foreground">
            Alerts
          </a>
          {isAdminEmail(user?.email) && (
            <Link
              href="/admin/linkedin"
              className="rounded-md px-2.5 py-1.5 hover:bg-background-raised hover:text-foreground"
            >
              Add LinkedIn ads
            </Link>
          )}
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
        {user && followLimit !== undefined && (
          <span className="mono-tabular hidden shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground md:flex">
            <Heart className="size-3" />
            {followCount ?? 0}/{followLimit}
          </span>
        )}
        <ThemeToggle />
        {user ? (
          <form action="/auth/sign-out" method="post" className="shrink-0">
            <Button size="sm" variant="ghost" type="submit">
              Sign out
            </Button>
          </form>
        ) : (
          <Button size="sm" variant="ghost" asChild className="shrink-0">
            <Link href="/login">Log in</Link>
          </Button>
        )}
      </div>
      <div className="flex h-9 items-center justify-between border-t border-border px-4 lg:px-6">
        <p className="mono-tabular text-xs text-muted-foreground">
          {resultCount.toLocaleString()} ads · live archive
        </p>
      </div>
    </header>
  );
}
