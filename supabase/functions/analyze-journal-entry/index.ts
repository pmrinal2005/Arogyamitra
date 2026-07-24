// Edge Function: analyze-journal-entry
// Triggered by a Supabase Database Webhook on INSERT into journal_entries
// (or invoked directly). Runs LLM sentiment/theme/risk-flag extraction and
// writes structured results back to the row. The client-side crisis keyword
// check runs INDEPENDENTLY and SYNCHRONOUSLY in the browser before this — so
// crisis detection never waits on the LLM.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { extractJson, runLLM } from "../_shared/llm.ts";
import { NEUTRAL_JOURNAL_ANALYSIS } from "../_shared/fallbacks.ts";

interface Analysis {
  sentiment: number; // -1..1
  themes: string[];
  risk_flags: string[];
}

const SYSTEM =
  "You are a careful, non-clinical wellbeing reflection assistant. You analyze a personal journal entry and return ONLY strict JSON. Never diagnose. Keys: sentiment (number -1..1), themes (array of 1-4 short lowercase theme words like 'isolation','overwhelm','hope','connection'), risk_flags (array; include 'self_harm_language' or 'hopelessness' only if strongly present, else empty).";

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const sb = serviceClient();
    const payload = await req.json().catch(() => ({}));

    // Support both direct calls { entry_id } and webhook { record: {...} }
    const entryId: string | undefined = payload.entry_id ?? payload.record?.id;
    let content: string | undefined = payload.content ?? payload.record?.content;
    let userId: string | undefined = payload.user_id ?? payload.record?.user_id;

    if (!entryId) return jsonResponse({ ok: false, error: "entry_id required" }, 400);

    if (!content) {
      const { data } = await sb.from("journal_entries")
        .select("content,user_id").eq("id", entryId).single();
      content = data?.content;
      userId = data?.user_id;
    }
    if (!content) return jsonResponse({ ok: false, error: "no content" }, 400);

    const llm = await runLLM(
      `Journal entry:\n"""${content.slice(0, 4000)}"""\nReturn JSON only.`,
      SYSTEM,
    );

    let analysis: Analysis;
    let status = "done";
    if (llm.ok) {
      const parsed = extractJson<Analysis>(llm.text);
      analysis = parsed ?? { ...NEUTRAL_JOURNAL_ANALYSIS };
      if (!parsed) status = "unavailable";
    } else {
      analysis = { ...NEUTRAL_JOURNAL_ANALYSIS };
      status = "unavailable";
    }

    await sb.from("journal_entries").update({
      nlp_sentiment_score: analysis.sentiment ?? 0,
      nlp_themes: analysis.themes ?? [],
      nlp_risk_flags: analysis.risk_flags ?? [],
      nlp_status: status,
    }).eq("id", entryId);

    // If LLM flagged risk language, log a crisis escalation audit event too
    // (redundant with client-side check — defense in depth).
    if (userId && (analysis.risk_flags ?? []).length > 0) {
      await sb.from("crisis_escalation_events").insert({
        user_id: userId,
        trigger_source: "journal_keyword",
        resource_shown: "server_flag_pending_client_display",
        acknowledged: false,
      });
    }

    // Recompute index after new analyzed journal data
    if (userId) {
      await sb.rpc("compute_behavioral_health_index", {
        p_user: userId, p_date: new Date().toISOString().slice(0, 10),
      });
    }

    return jsonResponse({ ok: true, analysis, provider: llm.provider, status });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
