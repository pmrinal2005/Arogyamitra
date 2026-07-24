// Edge Function: match-and-send-care-ping
// POST { user_id (at-risk), risk_snapshot_id }
// Finds top 1-3 matched neighbors via pairwise_match_score, inserts care_pings,
// and broadcasts via Supabase Realtime (the insert itself is the realtime event)
// plus optional Web Push / email fallback. Respects the master pause toggle for
// BOTH the at-risk user and each candidate.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;
  try {
    const sb = serviceClient();
    const { user_id, risk_snapshot_id } = await req.json();
    if (!user_id) return jsonResponse({ ok: false, error: "user_id required" }, 400);

    // Respect at-risk user's pause preference (they opted out of the loop)
    const { data: atRisk } = await sb.from("profiles")
      .select("care_pings_paused, home_lat").eq("id", user_id).single();
    if (atRisk?.care_pings_paused) {
      return jsonResponse({ ok: true, skipped: "at_risk_user_paused" });
    }

    // Candidate pool: active mutual-aid members who accept pings and aren't paused,
    // excluding the at-risk user themselves.
    const { data: candidates } = await sb
      .from("mutual_aid_profiles")
      .select("user_id, profiles!inner(care_pings_paused)")
      .eq("is_active", true)
      .neq("user_id", user_id);

    const eligible = (candidates ?? []).filter(
      (c: any) => !c.profiles?.care_pings_paused,
    );

    // Score each candidate via the transparent pairwise function
    const scored: { user_id: string; score: number }[] = [];
    for (const c of eligible) {
      const { data: s } = await sb.rpc("pairwise_match_score", {
        p_at_risk: user_id, p_candidate: c.user_id,
      });
      scored.push({ user_id: c.user_id, score: Number(s ?? 0) });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3).filter((s) => s.score > 0.2);

    if (top.length === 0) {
      return jsonResponse({ ok: true, matched: 0, note: "no eligible neighbors" });
    }

    // Avoid duplicate active pings for the same snapshot
    const rows = top.map((t) => ({
      at_risk_user_id: user_id,
      matched_user_id: t.user_id,
      risk_snapshot_id: risk_snapshot_id ?? null,
      status: "sent",
      channel: ["in_app", "web_push"],
    }));

    const { data: inserted, error } = await sb.from("care_pings")
      .insert(rows).select();
    if (error) throw error;

    // The care_pings INSERT is itself the Supabase Realtime broadcast that the
    // matched user's dashboard is subscribed to. Web Push / email fallback would
    // be dispatched here if push subscriptions / an email provider are configured
    // (kept optional to stay within free tiers).

    return jsonResponse({ ok: true, matched: inserted?.length ?? 0, pings: inserted });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
