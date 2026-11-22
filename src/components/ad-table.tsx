import { PlatformDot } from "@/components/platform-dot";
import { PLATFORM_LABEL, FORMAT_LABEL, CTA_LABEL } from "@/lib/labels";
import type { Ad } from "@/lib/types";

export function AdTable({ ads }: { ads: Ad[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background-raised text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Brand</th>
            <th className="px-3 py-2 font-medium">Headline</th>
            <th className="px-3 py-2 font-medium">Platform</th>
            <th className="px-3 py-2 font-medium">Format</th>
            <th className="px-3 py-2 font-medium">CTA</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Runtime</th>
          </tr>
        </thead>
        <tbody>
          {ads.map((ad) => (
            <tr key={ad.id} className="border-b border-border last:border-0 hover:bg-background-raised">
              <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">{ad.brandName}</td>
              <td className="max-w-[320px] truncate px-3 py-2 text-muted-foreground">{ad.headline}</td>
              <td className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-foreground/90">
                  <PlatformDot platform={ad.platform} />
                  {PLATFORM_LABEL[ad.platform]}
                </span>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{FORMAT_LABEL[ad.format]}</td>
              <td className="px-3 py-2 text-muted-foreground">{CTA_LABEL[ad.cta]}</td>
              <td className="px-3 py-2">
                <span
                  className={
                    ad.status === "active"
                      ? "rounded-full border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent"
                      : "rounded-full border border-border-strong px-1.5 py-0.5 text-[11px] text-muted-foreground"
                  }
                >
                  {ad.status}
                </span>
              </td>
              <td className="mono-tabular px-3 py-2 text-right text-muted-foreground">
                {ad.durationDays}d
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
