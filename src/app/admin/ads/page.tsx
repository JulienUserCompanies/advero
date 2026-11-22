import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { IngestForm } from "./ingest-form";

// Reads the session on every request to gate this page — same reason
// archive/page.tsx has this: a Cache Components build can't statically
// prerender a page whose content depends on cookies().
export const instant = false;

export default async function AdsAdminPage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!user) redirect("/login");

  if (!isAdminEmail(user.email)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-foreground">You don&rsquo;t have access to this page.</p>
        <Link href="/archive" className="mt-3 text-xs text-muted-foreground hover:text-foreground">
          ← Back to the archive
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/archive" className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to the archive
      </Link>
      <h1 className="mt-4 text-sm font-medium text-foreground">Add ads</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        For platforms with no usable competitor-search API (or where our own API access isn&rsquo;t
        approved yet), this is manual: pick a platform below, open its Ad Library in your own browser,
        and paste in the saved page&rsquo;s HTML.
      </p>
      <div className="mt-6">
        <IngestForm />
      </div>
    </div>
  );
}
