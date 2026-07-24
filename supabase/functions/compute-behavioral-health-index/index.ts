// Edge Function: compute-behavioral-health-index
// Calls the transparent Postgres function compute_behavioral_health_index for
// one user (on-demand after a submission) or all recently-active users (cron).
// POST { user_id?: string, all?: boolean }
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const sb = serviceClient();
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const { user_id, all } = body as { user_id?: string; all?: boolean };

    if (all) {
      const { error } = await sb.rpc("recompute_all_bhi");
      if (error) throw error;
      return jsonResponse({ ok: true, mode: "all" });
    }

    if (!user_id) return jsonResponse({ ok: false, error: "user_id required" }, 400);

    const { data, error } = await sb.rpc("compute_behavioral_health_index", {
      p_user: user_id,
      p_date: new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;

    // If the freshly computed index is 'elevated', kick off downstream flows.
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.risk_bucket === "elevated") {
      // fire-and-forget: generate a micro-intervention + send care ping
      const base = Deno.env.get("SUPABASE_URL")!;
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${key}` };
      const payload = JSON.stringify({ user_id, risk_snapshot_id: row.id });
      // Do not await hard — but capture errors quietly
      await Promise.allSettled([
        fetch(`${base}/functions/v1/generate-micro-intervention`, { method: "POST", headers, body: payload }),
        fetch(`${base}/functions/v1/match-and-send-care-ping`, { method: "POST", headers, body: payload }),
      ]);
    }

    return jsonResponse({ ok: true, index: row });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
