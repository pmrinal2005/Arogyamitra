"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchEnv } from "@/lib/env-client";
import { useApp } from "@/lib/store";
import { demoEnv } from "@/lib/demo-data";

// Default coordinates (New Delhi) used only when the user hasn't set a location.
const DEFAULT_LAT = 28.61;
const DEFAULT_LNG = 77.21;

export function useEnv() {
  const profile = useApp((s) => s.profile);
  const lat = profile?.home_lat ?? DEFAULT_LAT;
  const lng = profile?.home_lng ?? DEFAULT_LNG;
  return useQuery({
    queryKey: ["env", lat, lng],
    queryFn: () => fetchEnv(lat, lng),
    staleTime: 60 * 60 * 1000,
    placeholderData: demoEnv,
  });
}
