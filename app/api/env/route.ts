// ---------------------------------------------------------------------------
// Lightweight server-side proxy for Open-Meteo (free, no key).
// Keeps the external call off the client, coarsens coordinates to a ~1km grid
// for cache reuse, and returns a normalized snapshot. Edge runtime keeps it
// well within Vercel Hobby limits. Degrades gracefully to a static fallback.
// ---------------------------------------------------------------------------
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const FALLBACK = {
  pm25: 18,
  pm10: 32,
  aqi: 64,
  pollen_index: 2.1,
  uv_index: 4,
  temperature: 24,
  humidity: 52,
  source: "fallback" as const,
};

function coarsen(n: number, decimals = 2): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function usAqiFromPm25(pm25: number | null): number | null {
  if (pm25 == null) return null;
  const bp: number[][] = [
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = coarsen(parseFloat(searchParams.get("lat") ?? "28.61"));
  const lng = coarsen(parseFloat(searchParams.get("lng") ?? "77.21"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(FALLBACK, { status: 200 });
  }

  try {
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm2_5,pm10,uv_index,us_aqi&hourly=alder_pollen,birch_pollen,grass_pollen`;
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m`;

    const [airRes, wxRes] = await Promise.all([
      fetch(airUrl, { next: { revalidate: 3600 } }),
      fetch(wxUrl, { next: { revalidate: 3600 } }),
    ]);
    if (!airRes.ok || !wxRes.ok) throw new Error("upstream");

    const air = await airRes.json();
    const wx = await wxRes.json();
    const pm25 = air?.current?.pm2_5 ?? null;
    const pollenVals = [
      air?.hourly?.alder_pollen?.[0],
      air?.hourly?.birch_pollen?.[0],
      air?.hourly?.grass_pollen?.[0],
    ].filter((v: unknown) => typeof v === "number") as number[];
    const pollen_index = pollenVals.length
      ? Math.round((pollenVals.reduce((a, b) => a + b, 0) / pollenVals.length) * 10) / 10
      : null;

    const snap = {
      pm25,
      pm10: air?.current?.pm10 ?? null,
      aqi: air?.current?.us_aqi ?? usAqiFromPm25(pm25),
      pollen_index,
      uv_index: air?.current?.uv_index ?? null,
      temperature: wx?.current?.temperature_2m ?? null,
      humidity: wx?.current?.relative_humidity_2m ?? null,
      source: "open-meteo" as const,
    };

    return NextResponse.json(snap, {
      status: 200,
      headers: {
        // 1h edge cache + SWR so nearby users reuse the same response.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    // Never crash the dashboard — return a static last-known snapshot.
    return NextResponse.json(FALLBACK, { status: 200 });
  }
}
