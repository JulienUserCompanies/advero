"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { PlatformDot } from "@/components/platform-dot";
import type { Platform } from "@/lib/types";

export interface FacetCount {
  key: string;
  label: string;
  count: number;
}

interface FiltersSidebarProps {
  platforms: FacetCount[];
  industries: FacetCount[];
  formats: FacetCount[];
  ctas: FacetCount[];
  selected: {
    platforms: Set<string>;
    industries: Set<string>;
    formats: Set<string>;
    ctas: Set<string>;
  };
  onToggle: (group: "platforms" | "industries" | "formats" | "ctas", key: string) => void;
}

function Group({
  title,
  items,
  selectedKeys,
  onToggle,
  dot,
}: {
  title: string;
  items: FacetCount[];
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  dot?: boolean;
}) {
  return (
    <div className="border-b border-border px-4 py-3.5">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center gap-2 text-sm text-foreground/90 hover:text-foreground"
          >
            <Checkbox
              checked={selectedKeys.has(item.key)}
              onCheckedChange={() => onToggle(item.key)}
            />
            {dot && <PlatformDot platform={item.key as Platform} />}
            <span className="flex-1 truncate">{item.label}</span>
            <span
              className={
                "mono-tabular text-xs " +
                (item.count === 0 ? "text-muted-foreground/40" : "text-muted-foreground")
              }
            >
              {item.count}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function FiltersSidebar({
  platforms,
  industries,
  formats,
  ctas,
  selected,
  onToggle,
}: FiltersSidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
      <div className="sticky top-[57px]">
        <Group
          title="Platform"
          items={platforms}
          selectedKeys={selected.platforms}
          onToggle={(k) => onToggle("platforms", k)}
          dot
        />
        <Group
          title="Industry"
          items={industries}
          selectedKeys={selected.industries}
          onToggle={(k) => onToggle("industries", k)}
        />
        <Group
          title="Format"
          items={formats}
          selectedKeys={selected.formats}
          onToggle={(k) => onToggle("formats", k)}
        />
        <Group
          title="CTA"
          items={ctas}
          selectedKeys={selected.ctas}
          onToggle={(k) => onToggle("ctas", k)}
        />
      </div>
    </aside>
  );
}
