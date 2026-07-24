"use client";
// Client-side environmental fetch via Open-Meteo (free, no key). Results are
// cached per coarse grid cell in sessionStorage (1h TTL) to minimize calls, and
// a static fallback is returned if the API is unreachable/rate-limited.
import type { EnvSnapshot } from "@/lib/types";
import { coarsen } from "@/lib/utils";
import { demoEnv } from "@/lib/demo-data";

const TTL = 60 * 60 * 1000; // 1 hour

function usAqiFromPm25(pm25: number | null): number | null {
  if (pm25 == null) return null;
  // Simplified US AQI breakpoints for PM2.5.
  const bp = [
    [0, 12, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 500.4, 301, 500],
  ];
  for (const [cl, ch, il, ih] of bp) {
    if (pm25 >= cl && pm25 <= ch) {
      return Math.round(((ih - il) / (ch - cl)) * (pm25 - cl) + il);
    }
  }
  return 500;
}

export async function fetchEnv(lat: number, lng: number): Promise<EnvSnapshot> {
  const clat = coarsen(lat, 2);
  const clng = coarsen(lng, 2);
  const key = `env:${clat}:${clng}`;

  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      const { at, snap } = JSON.parse(cached);
      if (Date.now() - at < TTL) return snap as EnvSnapshot;
    }
  } catch {
    /* ignore */
  }

  try {
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${clat}&longitude=${clng}&current=pm2_5,pm10,uv_index,us_aqi&hourly=alder_pollen,birch_pollen,grass_pollen`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${clat}&longitude=${clng}&current=temperature_2m,relative_humidity_2m`;

    const [airRes, wxRes] = await Promise.all([
      fetch(airUrl, { cache: "no-store" }),
      fetch(wxUrl, { cache: "no-store" }),
    ]);
    if (!airRes.ok || !wxRes.ok) throw new Error("api");

    const air = await airRes.json();
    const wx = await wxRes.json();

    const pm25 = air?.current?.pm2_5 ?? null;
    const pollenVals = [
      air?.hourly?.alder_pollen?.[0],
      air?.hourly?.birch_pollen?.[0],
      air?.hourly?.grass_pollen?.[0],
    ].filter((v) => typeof v === "number");
    const pollen_index = pollenVals.length
      ? Math.round((pollenVals.reduce((a, b) => a + b, 0) / pollenVals.length) * 10) / 10
      : null;

    const snap: EnvSnapshot = {
      pm25,
      pm10: air?.current?.pm10 ?? null,
      aqi: air?.current?.us_aqi ?? usAqiFromPm25(pm25),
      pollen_index,
      uv_index: air?.current?.uv_index ?? null,
      temperature: wx?.current?.temperature_2m ?? null,
      humidity: wx?.current?.relative_humidity_2m ?? null,
    };

    try {
      sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), snap }));
    } catch {
      /* ignore */
    }
    return snap;
  } catch {
    // Graceful degradation: never crash; return last-known/static values.
    return demoEnv;
  }
}
