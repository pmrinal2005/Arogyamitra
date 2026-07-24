"use client";
// Passwordless magic-link auth (free, no SMS) + optional free OAuth (Google/GitHub).
// If Supabase isn't configured, offer a "Explore demo" path so the app is usable.
import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button, Card, CardBody, Input } from "@/components/ui";
import { SAFETY_DISCLAIMER } from "@/lib/crisis-resources";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : undefined;

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const sb = getSupabaseBrowser();
      const { error } = await sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "github") => {
    try {
      const sb = getSupabaseBrowser();
      await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed.");
    }
  };

  return (
    <main className="app-shell font-scale-md flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardBody className="pt-6">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-brand-800">AROGYASETU</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to your privacy-first wellbeing dashboard
            </p>
          </div>

          {!configured ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Supabase isn&apos;t configured in this environment yet. You can
                still explore the dashboard in <strong>demo mode</strong>.
              </div>
              <Link href="/dashboard">
                <Button className="w-full">Explore demo dashboard</Button>
              </Link>
            </div>
          ) : sent ? (
            <div className="rounded-xl bg-brand-50 border border-brand-200 p-4 text-sm text-brand-800">
              Check your inbox — we sent a secure sign-in link to{" "}
              <strong>{email}</strong>. It works on this device only.
            </div>
          ) : (
            <>
              <form onSubmit={sendMagicLink} className="space-y-3">
                <label className="block text-sm font-medium text-slate-700" htmlFor="email">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Sending…" : "Send magic link"}
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" /> or continue with{" "}
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => oauth("google")}>
                  Google
                </Button>
                <Button variant="outline" onClick={() => oauth("github")}>
                  GitHub
                </Button>
              </div>
            </>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <p className="mt-6 text-xs leading-relaxed text-slate-400">
            {SAFETY_DISCLAIMER}
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
