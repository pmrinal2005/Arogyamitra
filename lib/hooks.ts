"use client";
// TanStack Query hooks over Supabase, each with a static demo fallback so a
// missing/rate-limited backend never crashes a widget. When Supabase isn't
// configured (or no user), hooks return deterministic demo data.
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import type {
  BehavioralHealthIndex,
  CarePing,
  EmaCheckin,
  JournalEntry,
  MicroIntervention,
  MutualAidDirectoryRow,
  TimeCredit,
} from "@/lib/types";
import * as demo from "@/lib/demo-data";

function live() {
  return isSupabaseConfigured();
}

export function useBHIHistory() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["bhi-history", userId],
    queryFn: async (): Promise<BehavioralHealthIndex[]> => {
      if (!live() || !userId) return demo.demoBHIHistory;
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("behavioral_health_index")
        .select("*")
        .eq("user_id", userId)
        .order("index_date", { ascending: true })
        .limit(30);
      if (error) throw error;
      return (data as unknown as BehavioralHealthIndex[]) ?? [];
    },
    placeholderData: demo.demoBHIHistory,
  });
}

export function useLatestBHI() {
  const h = useBHIHistory();
  const list = h.data ?? [];
  return { ...h, data: list.length ? list[list.length - 1] : demo.demoBHILatest };
}

export function useRecentEma() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["ema-recent", userId],
    queryFn: async (): Promise<EmaCheckin[]> => {
      if (!live() || !userId) return demo.demoEmaRecent;
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("ema_checkins")
        .select("*")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false })
        .limit(14);
      if (error) throw error;
      return (data as unknown as EmaCheckin[]) ?? [];
    },
    placeholderData: demo.demoEmaRecent,
  });
}

export function useJournal() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["journal", userId],
    queryFn: async (): Promise<JournalEntry[]> => {
      if (!live() || !userId) return demo.demoJournal;
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("journal_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as JournalEntry[]) ?? [];
    },
    placeholderData: demo.demoJournal,
  });
}

export function useCarePings() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["care-pings", userId],
    queryFn: async (): Promise<CarePing[]> => {
      if (!live() || !userId) return demo.demoCarePings;
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("care_pings")
        .select("*")
        .or(`at_risk_user_id.eq.${userId},matched_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as CarePing[]) ?? [];
    },
    placeholderData: demo.demoCarePings,
  });
}

export function useTimeCredits() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["time-credits", userId],
    queryFn: async (): Promise<TimeCredit[]> => {
      if (!live() || !userId) return demo.demoTimeCredits;
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("time_credits_ledger")
        .select("*")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as TimeCredit[]) ?? [];
    },
    placeholderData: demo.demoTimeCredits,
  });
}

export function useDirectory() {
  return useQuery({
    queryKey: ["mutual-aid-directory"],
    queryFn: async (): Promise<MutualAidDirectoryRow[]> => {
      if (!live()) return demo.demoDirectory;
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("public_mutual_aid_directory")
        .select("*")
        .limit(200);
      if (error) throw error;
      const rows = (data as unknown as MutualAidDirectoryRow[]) ?? [];
      return rows.length ? rows : demo.demoDirectory;
    },
    placeholderData: demo.demoDirectory,
  });
}

export function useLatestIntervention() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["intervention", userId],
    queryFn: async (): Promise<MicroIntervention | null> => {
      if (!live() || !userId) return demo.demoIntervention;
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("micro_interventions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MicroIntervention) ?? null;
    },
    placeholderData: demo.demoIntervention,
  });
}

export function useResilience() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["resilience", userId],
    queryFn: async () => {
      if (!live() || !userId) return demo.demoResilience;
      const sb = getSupabaseBrowser();
      const { data } = await sb
        .from("resilience_points")
        .select("points")
        .eq("user_id", userId);
      const points = (data ?? []).reduce(
        (sum: number, r: { points: number }) => sum + (r.points || 0),
        0,
      );
      return { points, streak: demo.demoResilience.streak };
    },
    placeholderData: demo.demoResilience,
  });
}

export function useBadges() {
  const userId = useApp((s) => s.userId);
  return useQuery({
    queryKey: ["badges", userId],
    queryFn: async () => {
      if (!live() || !userId) return demo.demoBadges;
      const sb = getSupabaseBrowser();
      const { data } = await sb
        .from("badges")
        .select("badge_type, earned_at")
        .eq("user_id", userId);
      return (data as { badge_type: string; earned_at: string }[]) ?? [];
    },
    placeholderData: demo.demoBadges,
  });
}
