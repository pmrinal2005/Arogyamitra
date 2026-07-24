"use client";
// Top-level client providers: TanStack Query + a session bootstrap that loads
// the Supabase user & profile into the Zustand store, applies accessibility
// preferences globally, and mounts the global CrisisInterstitial.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import CrisisInterstitial from "@/components/crisis/CrisisInterstitial";

function A11yApplier() {
  const a11y = useApp((s) => s.a11y);
  useEffect(() => {
    // Applied to any mounted `.app-shell` (dashboard/auth). Landing page unaffected.
    const shells = document.querySelectorAll(".app-shell");
    shells.forEach((el) => {
      el.classList.toggle("contrast-high", a11y.contrast === "high");
      el.classList.toggle("reduced-motion", a11y.motion === "reduced");
      ["sm", "md", "lg", "xl"].forEach((s) =>
        el.classList.remove(`font-scale-${s}`),
      );
      el.classList.add(`font-scale-${a11y.fontScale || "md"}`);
    });
  }, [a11y]);
  return null;
}

function SessionBootstrap() {
  const setSession = useApp((s) => s.setSession);
  const setProfile = useApp((s) => s.setProfile);
  const setDemoMode = useApp((s) => s.setDemoMode);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setDemoMode(true);
      return;
    }
    const sb = getSupabaseBrowser();
    let active = true;

    const load = async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!active) return;
      if (!user) {
        setSession(null, null);
        return;
      }
      setSession(user.id, user.email ?? null);
      const { data } = await sb
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (active && data) setProfile(data as unknown as Profile);
    };
    void load();

    const { data: sub } = sb.auth.onAuthStateChange(() => void load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [setSession, setProfile, setDemoMode]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <SessionBootstrap />
      <A11yApplier />
      {children}
      <CrisisInterstitial />
    </QueryClientProvider>
  );
}
