"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "sign-up" ? "sign-up" : "sign-in"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Accounts aren't configured yet — missing Supabase environment variables.");
      return;
    }

    if (mode === "sign-in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/archive");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      // If email confirmations are on, there's no session yet — tell the
      // person to check their inbox instead of silently doing nothing.
      if (!data.session) {
        setCheckEmail(true);
        return;
      }
      router.push("/archive");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded bg-accent text-accent-foreground">
          <Terminal className="size-3.5" strokeWidth={2.5} />
        </div>
        <span className="mono-tabular text-sm font-semibold tracking-tight text-foreground">
          ADVERO
        </span>
      </Link>

      <div className="w-full max-w-sm rounded-md border border-border bg-background-raised p-6">
        <h1 className="text-sm font-medium text-foreground">
          {mode === "sign-in" ? "Log in" : "Create your account"}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "sign-in"
            ? "Welcome back."
            : "Free accounts can follow up to 3 competitors."}
        </p>

        {checkEmail ? (
          <p className="mt-4 rounded-md border border-border bg-background-overlay p-3 text-xs text-muted-foreground">
            Check <span className="text-foreground">{email}</span> for a confirmation
            link, then come back and log in.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs text-muted-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs text-muted-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button type="submit" size="sm" className="mt-1" disabled={loading}>
              {loading ? "One moment…" : mode === "sign-in" ? "Log in" : "Create account"}
            </Button>
          </form>
        )}

        {!checkEmail && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "sign-in" ? (
              <>
                No account yet?{" "}
                <button
                  type="button"
                  onClick={() => setMode("sign-up")}
                  className="text-foreground underline underline-offset-2"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("sign-in")}
                  className="text-foreground underline underline-offset-2"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <Link href="/" className="mt-6 text-xs text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
    </div>
  );
}
