"use client";
// Lightweight client state (Zustand). Holds the auth session snapshot, profile,
// live locale + accessibility prefs, and a crisis-interstitial trigger that any
// free-text surface can raise synchronously.
import { create } from "zustand";
import type { Profile, AccessibilityPrefs } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { CrisisSeverity } from "@/lib/crisis";

interface CrisisState {
  open: boolean;
  severity: CrisisSeverity;
  source: string;
}

interface AppState {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  locale: Locale;
  a11y: AccessibilityPrefs;
  demoMode: boolean;
  crisis: CrisisState;

  setSession: (userId: string | null, email: string | null) => void;
  setProfile: (p: Profile | null) => void;
  setLocale: (l: Locale) => void;
  setA11y: (a: AccessibilityPrefs) => void;
  setDemoMode: (v: boolean) => void;
  raiseCrisis: (severity: CrisisSeverity, source: string) => void;
  clearCrisis: () => void;
}

export const useApp = create<AppState>((set) => ({
  userId: null,
  email: null,
  profile: null,
  locale: "en",
  a11y: {},
  demoMode: false,
  crisis: { open: false, severity: "none", source: "" },

  setSession: (userId, email) => set({ userId, email }),
  setProfile: (profile) =>
    set((s) => ({
      profile,
      locale: (profile?.preferred_language as Locale) || s.locale,
      a11y: profile?.accessibility_prefs || s.a11y,
    })),
  setLocale: (locale) => set({ locale }),
  setA11y: (a11y) => set({ a11y }),
  setDemoMode: (demoMode) => set({ demoMode }),
  raiseCrisis: (severity, source) =>
    set({ crisis: { open: true, severity, source } }),
  clearCrisis: () => set({ crisis: { open: false, severity: "none", source: "" } }),
}));
