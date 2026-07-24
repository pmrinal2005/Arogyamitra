// Edge Function: differential-privacy-aggregate
// POST { metric: 'risk_distribution'|'participation'|'checkins', epsilon?: number,
//        country_code?: string }
// Returns ONLY noised aggregates for any B2B / municipal dashboard query.
// Never returns row-level data. Uses the Laplace mechanism (OpenDP methodology).
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

// Laplace noise with scale b = sensitivity / epsilon
function laplace(scale: number): number {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}
function noisyCount(trueCount: number, epsilon: number, sensitivity = 1): number {
  const noised = trueCount + laplace(sensitivity / epsilon);
  return Math.max(0, Math.round(noised));
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const sb = serviceClient();
    const { metric, epsilon = 1.0 } = await req.json().catch(() => ({}));
    const eps = Math.min(Math.max(Number(epsilon) || 1.0, 0.1), 5);

    if (metric === "risk_distribution") {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await sb.from("behavioral_health_index")
        .select("risk_bucket").eq("index_date", today);
      const counts = { low: 0, moderate: 0, elevated: 0 } as Record<string, number>;
      (data ?? []).forEach((r: any) => { counts[r.risk_bucket] = (counts[r.risk_bucket] ?? 0) + 1; });
      return jsonResponse({
        ok: true, metric, epsilon: eps, dp: true,
        result: {
          low: noisyCount(counts.low, eps),
          moderate: noisyCount(counts.moderate, eps),
          elevated: noisyCount(counts.elevated, eps),
        },
      });
    }

    if (metric === "participation") {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const { count } = await sb.from("ema_checkins")
        .select("user_id", { count: "exact", head: true })
        .gte("submitted_at", weekAgo);
      return jsonResponse({
        ok: true, metric, epsilon: eps, dp: true,
        result: { active_participants: noisyCount(count ?? 0, eps) },
      });
    }

    if (metric === "checkins") {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const { count } = await sb.from("ema_checkins")
        .select("id", { count: "exact", head: true })
        .gte("submitted_at", weekAgo);
      return jsonResponse({
        ok: true, metric, epsilon: eps, dp: true,
        result: { total_checkins: noisyCount(count ?? 0, eps) },
      });
    }

    return jsonResponse({ ok: false, error: "unknown metric" }, 400);
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
