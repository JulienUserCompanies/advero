import { ArchiveClient } from "../archive-client";
import { getArchiveData } from "@/lib/get-ads";

export default async function ArchivePage() {
  const { ads } = await getArchiveData();
  return <ArchiveClient ads={ads} />;
}
