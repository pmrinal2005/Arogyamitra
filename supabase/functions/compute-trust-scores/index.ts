// Edge Function: compute-trust-scores
// POST { user_id?: string, all?: boolean }
// Recomputes the transparent weighted trust formula (Part 4) via Postgres.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const sb = serviceClient();
    const { user_id, all } = await req.json().catch(() => ({}));

    if (all) {
      const { error } = await sb.rpc("recompute_all_trust_scores");
      if (error) throw error;
      return jsonResponse({ ok: true, mode: "all" });
    }
    if (!user_id) return jsonResponse({ ok: false, error: "user_id required" }, 400);

    const { data, error } = await sb.rpc("compute_trust_score", { p_user: user_id });
    if (error) throw error;
    return jsonResponse({ ok: true, trust: Array.isArray(data) ? data[0] : data });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
