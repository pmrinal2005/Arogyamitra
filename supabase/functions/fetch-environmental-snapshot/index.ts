// Edge Function: fetch-environmental-snapshot
// POST { lat, lng, location_label?, user_id? }
// Checks the shared grid cache (<1h old) before calling Open-Meteo. Writes to
// the grid cache and (if user_id given) a user-linked snapshot row.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { fetchEnvironmental, gridKey } from "../_shared/openmeteo.ts";
import { FALLBACK_ENV } from "../_shared/fallbacks.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const sb = serviceClient();
    const { lat, lng, location_label, user_id } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return jsonResponse({ ok: false, error: "lat/lng required" }, 400);
    }

    const key = gridKey(lat, lng);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 1) Try fresh cache
    const { data: cached } = await sb.from("environmental_grid_cache")
      .select("*").eq("grid_key", key).gte("fetched_at", oneHourAgo).maybeSingle();

    let env = cached
      ? {
          pm25: cached.pm25, pm10: cached.pm10, aqi: cached.aqi,
          pollen_index: cached.pollen_index, uv_index: cached.uv_index,
          temperature: cached.temperature, humidity: cached.humidity,
        }
      : null;
    let source = cached ? "cache" : "live";

    // 2) Fetch live if no fresh cache
    if (!env) {
      const live = await fetchEnvironmental(lat, lng);
      if (live) {
        env = live;
        await sb.from("environmental_grid_cache").upsert({
          grid_key: key, lat, lng, ...live, fetched_at: new Date().toISOString(),
        }, { onConflict: "grid_key" });
      } else {
        // 3) Total failure: reuse any stale cache, else fallback nulls
        const { data: stale } = await sb.from("environmental_grid_cache")
          .select("*").eq("grid_key", key).maybeSingle();
        env = stale
          ? {
              pm25: stale.pm25, pm10: stale.pm10, aqi: stale.aqi,
              pollen_index: stale.pollen_index, uv_index: stale.uv_index,
              temperature: stale.temperature, humidity: stale.humidity,
            }
          : { ...FALLBACK_ENV };
        source = stale ? "stale_cache" : "unavailable";
      }
    }

    // Persist a user-linked snapshot for lag-model correlation
    if (user_id) {
      await sb.from("environmental_snapshots").insert({
        user_id, location_label: location_label ?? key, lat, lng, ...env,
      });
    }

    return jsonResponse({ ok: true, source, data: env });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
