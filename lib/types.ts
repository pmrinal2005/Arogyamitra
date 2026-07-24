// Shared domain types mirroring the Supabase schema (subset used by the UI).

export type RiskBucket = "low" | "moderate" | "elevated";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  home_location_label: string | null;
  home_lat: number | null;
  home_lng: number | null;
  condition_tags: string[];
  preferred_language: string;
  accessibility_prefs: AccessibilityPrefs;
  risk_sensitivity: "subtle" | "balanced" | "strong";
  care_pings_paused: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessibilityPrefs {
  contrast?: "normal" | "high";
  motion?: "normal" | "reduced";
  fontScale?: "sm" | "md" | "lg" | "xl";
}

export interface Consent {
  id: string;
  user_id: string;
  consent_type: string;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  updated_at: string;
}

export interface EmaCheckin {
  id: string;
  user_id: string;
  mood_score: number | null;
  energy_score: number | null;
  anxiety_score: number | null;
  sleep_quality_last_night: number | null;
  social_connection_score: number | null;
  pain_symptom_flags: string[] | null;
  medication_adherence: boolean | null;
  perceived_trigger_notes: string | null;
  submitted_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  input_method: "typed" | "voice";
  nlp_sentiment_score: number | null;
  nlp_themes: string[] | null;
  nlp_risk_flags: string[] | null;
  nlp_status: "pending" | "done" | "unavailable";
  created_at: string;
}

export interface BehavioralHealthIndex {
  id: string;
  user_id: string;
  index_date: string;
  composite_score: number;
  risk_bucket: RiskBucket;
  contributing_factors: ContributingFactor[];
  computed_at: string;
}

export interface ContributingFactor {
  factor: string;
  weight: number;
  score: number;
  delta_description: string;
}

export interface EnvSnapshot {
  pm25: number | null;
  pm10: number | null;
  aqi: number | null;
  pollen_index: number | null;
  uv_index: number | null;
  temperature: number | null;
  humidity: number | null;
}

export interface MutualAidDirectoryRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  offers_help_with: string[];
  verification_status: string;
  visible_lat: number | null;
  visible_lng: number | null;
  availability_calendar: Record<string, unknown>;
  composite_trust_score: number;
  condition_tags: string[];
  bio: string | null;
  public_badges: string[];
}

export interface CarePing {
  id: string;
  at_risk_user_id: string;
  matched_user_id: string;
  risk_snapshot_id: string | null;
  status: "sent" | "seen" | "accepted" | "declined" | "expired";
  channel: string[];
  outcome_notes: string | null;
  outcome_rating: number | null;
  created_at: string;
  responded_at: string | null;
}

export interface MicroIntervention {
  id: string;
  user_id: string;
  risk_snapshot_id: string | null;
  intervention_type: string;
  generated_text: string;
  source: "llm" | "template_fallback";
  user_response: string | null;
  created_at: string;
}

export interface TimeCredit {
  id: string;
  from_user_id: string;
  to_user_id: string;
  hours: number;
  exchange_description: string | null;
  status: "offered" | "accepted" | "completed" | "declined";
  rating: number | null;
  created_at: string;
  completed_at: string | null;
}
