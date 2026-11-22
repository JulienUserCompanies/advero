"use client";

import { useActionState } from "react";
import { ingestLinkedInAction } from "./actions";
import { Button } from "@/components/ui/button";

export function IngestForm() {
  const [result, formAction, pending] = useActionState(ingestLinkedInAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="html" className="text-xs text-muted-foreground">
          Saved page HTML
        </label>
        <textarea
          id="html"
          name="html"
          required
          rows={14}
          placeholder="Paste the full page source from linkedin.com/ad-library/search here…"
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
