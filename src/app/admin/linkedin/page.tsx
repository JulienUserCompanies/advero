import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { IngestForm } from "./ingest-form";

// Reads the session on every request to gate this page — same reason
// archive/page.tsx has this: a Cache Components build can't statically
// prerender a page whose content depends on cookies().
export const instant = false;

export default async function LinkedInAdminPage() {
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
      <h1 className="mt-4 text-sm font-medium text-foreground">Add LinkedIn ads</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        LinkedIn has no API for competitor ad data, so this is manual: open{" "}
        <code className="rounded bg-background-overlay px-1 py-0.5">linkedin.com/ad-library/search</code>{" "}
        in your own browser, search for a competitor, scroll to load the ads you want, then view the
        page source (or copy the <code className="rounded bg-background-overlay px-1 py-0.5">&lt;html&gt;</code>{" "}
        element&rsquo;s outer HTML) and paste it below.
      </p>
      <div className="mt-6">
        <IngestForm />
      </div>
    </div>
  );
}
