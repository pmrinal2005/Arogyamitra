// Edge Function: generate-micro-intervention
// POST { user_id, risk_snapshot_id }
// Given an 'elevated' behavioral_health_index row, ask the LLM to turn the
// numeric contributing factors into an empathetic, plain-language micro-
// intervention. Falls back to the static template library if all LLMs fail.
// The LLM NEVER computes risk — it only narrates already-computed factors.
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { runLLM } from "../_shared/llm.ts";
import { InterventionType, pickTemplate } from "../_shared/fallbacks.ts";

const SYSTEM =
  "You are AROGYASETU's warm, non-clinical wellbeing companion. Given a list of numeric wellbeing factors (already computed by a transparent rule-based engine), write ONE short (2-4 sentence) supportive micro-intervention. Be gentle, concrete, and empowering. Do NOT diagnose, do NOT mention scores or numbers, do NOT use alarming language. Offer one tiny doable step (a breath, a sip of water, a short note, reaching out).";

const TYPES: InterventionType[] = [
  "breathing_exercise", "grounding_prompt", "journaling_prompt",
  "hydration_med_reminder", "telehealth_nudge", "educational_snippet",
];

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const sb = serviceClient();
    const { user_id, risk_snapshot_id } = await req.json();
    if (!user_id) return jsonResponse({ ok: false, error: "user_id required" }, 400);

    // Respect the master pause toggle
    const { data: profile } = await sb.from("profiles")
      .select("care_pings_paused").eq("id", user_id).single();

    // Load contributing factors
    let factors: unknown = [];
    if (risk_snapshot_id) {
      const { data } = await sb.from("behavioral_health_index")
        .select("contributing_factors").eq("id", risk_snapshot_id).maybeSingle();
      factors = data?.contributing_factors ?? [];
    }

    // Choose an intervention type from the top contributing factor
    let type: InterventionType = "grounding_prompt";
    try {
      const arr = factors as Array<{ factor: string; score: number }>;
      const top = [...arr].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
      if (top?.factor?.toLowerCase().includes("check-in")) type = "breathing_exercise";
      else if (top?.factor?.toLowerCase().includes("journal")) type = "journaling_prompt";
      else if (top?.factor?.toLowerCase().includes("environment")) type = "hydration_med_reminder";
      else if (top?.factor?.toLowerCase().includes("scales")) type = "telehealth_nudge";
    } catch { /* keep default */ }

    const prompt =
      `Wellbeing factors (JSON): ${JSON.stringify(factors)}. ` +
      `Preferred intervention style: ${type.replace(/_/g, " ")}. Write the micro-intervention now.`;

    const llm = await runLLM(prompt, SYSTEM);
    const text = llm.ok ? llm.text : pickTemplate(type);
    const source = llm.ok ? "llm" : "template_fallback";

    const { data: inserted, error } = await sb.from("micro_interventions").insert({
      user_id,
      risk_snapshot_id: risk_snapshot_id ?? null,
      intervention_type: type,
      generated_text: text,
      source,
    }).select().single();
    if (error) throw error;

    return jsonResponse({
      ok: true, intervention: inserted, provider: llm.provider,
      paused: !!profile?.care_pings_paused,
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
