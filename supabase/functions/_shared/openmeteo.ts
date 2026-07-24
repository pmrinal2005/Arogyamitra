// Open-Meteo is free, no API key required. We fetch air quality + weather.
// Exponential backoff; returns null on total failure so callers use fallback.

export interface EnvData {
  pm25: number | null;
  pm10: number | null;
  aqi: number | null;
  pollen_index: number | null;
  uv_index: number | null;
  temperature: number | null;
  humidity: number | null;
}

async function fetchWithBackoff(url: string, tries = 3): Promise<Response | null> {
  for (let i = 0; i < tries; i++) {
    try {
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), 8000);
      const res = await fetch(url, { signal: c.signal });
      clearTimeout(id);
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
        continue;
      }
      return null;
    } catch {
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
    }
  }
  return null;
}

export async function fetchEnvironmental(lat: number, lng: number): Promise<EnvData | null> {
  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
    `&current=pm2_5,pm10,us_aqi,uv_index,ragweed_pollen,grass_pollen,birch_pollen`;
  const wxUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m`;

  const [aqRes, wxRes] = await Promise.all([
    fetchWithBackoff(aqUrl),
    fetchWithBackoff(wxUrl),
  ]);

  if (!aqRes && !wxRes) return null;

  let pm25 = null, pm10 = null, aqi = null, uv = null, pollen = null;
  let temp = null, humidity = null;

  if (aqRes) {
    try {
      const j = await aqRes.json();
      const c = j.current ?? {};
      pm25 = c.pm2_5 ?? null;
      pm10 = c.pm10 ?? null;
      aqi = c.us_aqi ?? null;
      uv = c.uv_index ?? null;
      const pollens = [c.ragweed_pollen, c.grass_pollen, c.birch_pollen].filter(
        (v) => typeof v === "number",
      ) as number[];
      pollen = pollens.length ? Math.max(...pollens) : null;
    } catch { /* ignore */ }
  }
  if (wxRes) {
    try {
      const j = await wxRes.json();
      const c = j.current ?? {};
      temp = c.temperature_2m ?? null;
      humidity = c.relative_humidity_2m ?? null;
    } catch { /* ignore */ }
  }

  return { pm25, pm10, aqi, pollen_index: pollen, uv_index: uv, temperature: temp, humidity };
}

// Coarse grid key (2 dp ~ 1km) for shared caching across nearby users.
export function gridKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}
