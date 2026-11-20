import { ArchiveClient } from "./archive-client";
import { generateMockAds } from "@/lib/mock-data";

export default function Home() {
  const ads = generateMockAds();
  return <ArchiveClient ads={ads} />;
}
