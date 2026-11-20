import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/types";

const COLOR: Record<Platform, string> = {
  meta: "bg-platform-meta",
  tiktok: "bg-platform-tiktok",
  linkedin: "bg-platform-linkedin",
};

export function PlatformDot({ platform, className }: { platform: Platform; className?: string }) {
  return <span className={cn("inline-block size-1.5 rounded-full", COLOR[platform], className)} />;
}
