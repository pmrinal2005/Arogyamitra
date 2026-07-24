"use client";
// Client-side write helpers. All are safe no-ops in demo mode. After an EMA or
// journal write they trigger a near-real-time recompute of the Behavioral Health
// Index via the Postgres RPC (transparent, rule-based). All wrapped so a failure
// never breaks the UI.
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export interface EmaInput {
  mood_score: number;
  energy_score: number;
  anxiety_score: number;
  sleep_quality_last_night: number;
  social_connection_score: number;
  pain_symptom_flags?: string[];
  medication_adherence?: boolean | null;
  perceived_trigger_notes?: string | null;
}

async function recomputeIndex(userId: string) {
  try {
    const sb = getSupabaseBrowser();
    await sb.rpc("compute_behavioral_health_index", { p_user: userId });
  } catch {
    /* the scheduled job will recompute later; never block the UI */
  }
}

export async function submitEma(userId: string | null, input: EmaInput) {
  if (!isSupabaseConfigured() || !userId) return { ok: true, demo: true };
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("ema_checkins").insert({ user_id: userId, ...input });
  if (error) return { ok: false, error: error.message };
  void recomputeIndex(userId);
  return { ok: true };
}

export async function submitScale(
  userId: string | null,
  scaleType: string,
  rawAnswers: Record<string, number>,
  computedScore: number,
) {
  if (!isSupabaseConfigured() || !userId) return { ok: true, demo: true };
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("validated_scales").insert({
    user_id: userId,
    scale_type: scaleType,
    raw_answers: rawAnswers,
    computed_score: computedScore,
    administered_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  void recomputeIndex(userId);
  return { ok: true };
}

export async function submitJournal(
  userId: string | null,
  content: string,
  inputMethod: "typed" | "voice",
) {
  if (!isSupabaseConfigured() || !userId) return { ok: true, demo: true };
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("journal_entries").insert({
    user_id: userId,
    content,
    input_method: inputMethod,
    nlp_status: "pending",
  });
  if (error) return { ok: false, error: error.message };
  void recomputeIndex(userId);
  return { ok: true };
}

// --- Mutual aid / timebank -------------------------------------------------

export async function offerTimeExchange(
  fromUserId: string | null,
  toUserId: string,
  hours: number,
  description: string,
) {
  if (!isSupabaseConfigured() || !fromUserId) return { ok: true, demo: true };
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("time_credits_ledger").insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    hours,
    exchange_description: description,
    status: "offered",
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function updateExchangeStatus(
  id: string,
  status: "accepted" | "completed" | "declined",
  rating?: number,
) {
  if (!isSupabaseConfigured()) return { ok: true, demo: true };
  const sb = getSupabaseBrowser();
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (rating != null) patch.rating = rating;
  const { error } = await sb.from("time_credits_ledger").update(patch).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

// --- Care pings ------------------------------------------------------------

export async function respondToPing(
  id: string,
  status: "seen" | "accepted" | "declined",
  outcomeNotes?: string,
  outcomeRating?: number,
) {
  if (!isSupabaseConfigured()) return { ok: true, demo: true };
  const sb = getSupabaseBrowser();
  const patch: Record<string, unknown> = { status, responded_at: new Date().toISOString() };
  if (outcomeNotes != null) patch.outcome_notes = outcomeNotes;
  if (outcomeRating != null) patch.outcome_rating = outcomeRating;
  const { error } = await sb.from("care_pings").update(patch).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function logManualMetric(
  userId: string | null,
  metricType: string,
  value: unknown,
  source: "manual" | "csv_import" | "json_import" = "manual",
) {
  if (!isSupabaseConfigured() || !userId) return { ok: true, demo: true };
  const sb = getSupabaseBrowser();
  const { error } = await sb.from("manual_metric_logs").insert({
    user_id: userId,
    metric_type: metricType,
    value,
    source,
    logged_at: new Date().toISOString(),
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
