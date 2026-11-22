"use client";

import { useActionState, useState } from "react";
import { ingestAdsAction, type IngestPlatform } from "./actions";
import { Button } from "@/components/ui/button";

const PLATFORM_HINT: Record<IngestPlatform, string> = {
  linkedin: "Open linkedin.com/ad-library/search in your own browser, search for a competitor, scroll to load the ads you want, then view the page source (or copy the <html> element's outer HTML) and paste it below.",
  facebook: "Open facebook.com/ads/library in your own browser, search for a competitor's Page, scroll to load the ads you want, then view the page source (or copy the <html> element's outer HTML) and paste it below.",
};

export function IngestForm() {
  const [result, formAction, pending] = useActionState(ingestAdsAction, null);
  const [platform, setPlatform] = useState<IngestPlatform>("linkedin");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="platform" className="text-xs text-muted-foreground">
          Platform
        </label>
        <select
          id="platform"
          name="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value as IngestPlatform)}
          className="w-fit rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
        </select>
        <p className="text-xs text-muted-foreground">{PLATFORM_HINT[platform]}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="html" className="text-xs text-muted-foreground">
          Saved page HTML
        </label>
        <textarea
          id="html"
          name="html"
          required
          rows={14}
          placeholder="Paste the full page source here…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <Button type="submit" size="sm" disabled={pending} className="self-start">
        {pending ? "Ingesting…" : "Ingest ads"}
      </Button>

      {result && (
        <div
          className={
            "rounded-md border p-3 text-xs " +
            (result.error
              ? "border-danger/40 bg-danger/10 text-danger"
              : "border-border bg-background-overlay text-muted-foreground")
          }
        >
          {result.error ? (
            result.error
          ) : (
            <>
              Found {result.adsFound} ad{result.adsFound === 1 ? "" : "s"}, ingested{" "}
              {result.adsIngested}.
              {result.brands.length > 0 && (
                <>
                  {" "}
                  Brand{result.brands.length === 1 ? "" : "s"}: {result.brands.join(", ")}.
                </>
              )}
            </>
          )}
        </div>
      )}
    </form>
  );
}
