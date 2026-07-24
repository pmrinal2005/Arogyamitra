// Edge Function: purge-stale-engagement-data
// POST {} — invokes the Postgres purge_stale_engagement() which rolls up raw
// site_engagement_signals older than 30 days into engagement_daily_rollup and
// deletes the raw rows (data-minimization). Also runnable via pg_cron directly.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const sb = serviceClient();
    const { error } = await sb.rpc("purge_stale_engagement");
    if (error) throw error;
    return jsonResponse({ ok: true, purged: true });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
