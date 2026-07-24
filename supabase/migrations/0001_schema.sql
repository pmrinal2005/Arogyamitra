-- ============================================================================
-- AROGYASETU — 0001_schema.sql
-- Core schema: extensions, tables. RLS is enabled here (default-deny) and
-- policies are added in 0002_rls_policies.sql. Views/functions/triggers follow.
-- ============================================================================

create extension if not exists "pgcrypto";       -- gen_random_uuid()
create extension if not exists "pg_cron";         -- scheduled jobs (available on Supabase)

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  home_location_label text,
  home_lat numeric,
  home_lng numeric,
  condition_tags text[] default '{}',
  preferred_language text not null default 'en',
  accessibility_prefs jsonb not null default '{}'::jsonb,
  -- User-tunable sensitivity for the risk engine: 'subtle' | 'balanced' | 'strong'
  risk_sensitivity text not null default 'balanced',
  -- Master kill-switch: when true this user neither sends nor receives care pings
  care_pings_paused boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- consents
-- ---------------------------------------------------------------------------
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null,
  granted boolean not null default false,
  granted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, consent_type)
);

-- ---------------------------------------------------------------------------
-- ema_checkins
-- ---------------------------------------------------------------------------
create table if not exists public.ema_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mood_score smallint check (mood_score between 0 and 10),
  energy_score smallint check (energy_score between 0 and 10),
  anxiety_score smallint check (anxiety_score between 0 and 10),
  sleep_quality_last_night smallint check (sleep_quality_last_night between 0 and 10),
  social_connection_score smallint check (social_connection_score between 0 and 10),
  pain_symptom_flags text[],
  medication_adherence boolean,
  perceived_trigger_notes text,
  submitted_at timestamptz not null default now()
);
create index if not exists idx_ema_user_time on public.ema_checkins (user_id, submitted_at desc);

-- ---------------------------------------------------------------------------
-- validated_scales (PHQ-4, GAD-2, UCLA-3, ...)
-- ---------------------------------------------------------------------------
create table if not exists public.validated_scales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scale_type text not null,
  raw_answers jsonb not null default '{}'::jsonb,
  computed_score numeric not null,
  administered_at timestamptz not null default now()
);
create index if not exists idx_scales_user_time on public.validated_scales (user_id, administered_at desc);

-- ---------------------------------------------------------------------------
-- journal_entries
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  input_method text not null default 'typed', -- 'typed' | 'voice'
  nlp_sentiment_score numeric,
  nlp_themes text[],
  nlp_risk_flags text[],
  nlp_status text not null default 'pending', -- 'pending' | 'done' | 'unavailable'
  created_at timestamptz not null default now()
);
create index if not exists idx_journal_user_time on public.journal_entries (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- manual_metric_logs
-- ---------------------------------------------------------------------------
create table if not exists public.manual_metric_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric_type text not null,
  value jsonb not null default '{}'::jsonb,
  source text not null default 'manual', -- 'manual' | 'csv_import' | 'json_import'
  logged_at timestamptz not null default now()
);
create index if not exists idx_metrics_user_time on public.manual_metric_logs (user_id, logged_at desc);

-- ---------------------------------------------------------------------------
-- site_engagement_signals
-- ---------------------------------------------------------------------------
create table if not exists public.site_engagement_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_start timestamptz not null default now(),
  session_end timestamptz,
  tab_switch_count int not null default 0,
  time_of_day_bucket text, -- 'morning'|'afternoon'|'evening'|'late_night'
  created_at timestamptz not null default now()
);
create index if not exists idx_engagement_user_time on public.site_engagement_signals (user_id, created_at desc);

-- Aggregated daily rollup that survives the 30-day raw purge
create table if not exists public.engagement_daily_rollup (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rollup_date date not null,
  session_count int not null default 0,
  total_tab_switches int not null default 0,
  late_night_sessions int not null default 0,
  unique (user_id, rollup_date)
);

-- ---------------------------------------------------------------------------
-- behavioral_health_index (daily computed rollup)
-- ---------------------------------------------------------------------------
create table if not exists public.behavioral_health_index (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  index_date date not null,
  composite_score numeric not null check (composite_score between 0 and 100),
  risk_bucket text not null, -- 'low' | 'moderate' | 'elevated'
  contributing_factors jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null default now(),
  unique (user_id, index_date)
);
create index if not exists idx_bhi_user_date on public.behavioral_health_index (user_id, index_date desc);

-- ---------------------------------------------------------------------------
-- environmental_snapshots  (+ shared grid cache)
-- ---------------------------------------------------------------------------
create table if not exists public.environmental_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  location_label text,
  lat numeric,
  lng numeric,
  pm25 numeric, pm10 numeric, aqi numeric,
  pollen_index numeric, uv_index numeric,
  temperature numeric, humidity numeric,
  fetched_at timestamptz not null default now()
);
create index if not exists idx_env_user_time on public.environmental_snapshots (user_id, fetched_at desc);

-- Shared cache keyed by coarse grid cell (lat/lng rounded to 2 dp ~ 1km)
create table if not exists public.environmental_grid_cache (
  id uuid primary key default gen_random_uuid(),
  grid_key text not null unique,   -- e.g. '40.71,-74.01'
  lat numeric, lng numeric,
  pm25 numeric, pm10 numeric, aqi numeric,
  pollen_index numeric, uv_index numeric,
  temperature numeric, humidity numeric,
  fetched_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- personal_exposure_lag_model
-- ---------------------------------------------------------------------------
create table if not exists public.personal_exposure_lag_model (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  lag_days smallint not null check (lag_days between 0 and 3),
  correlation_strength numeric not null default 0,
  last_computed_at timestamptz not null default now(),
  unique (user_id, lag_days)
);

-- ---------------------------------------------------------------------------
-- mutual_aid_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.mutual_aid_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  offers_help_with text[] default '{}',
  availability_calendar jsonb not null default '{}'::jsonb,
  verification_status text not null default 'unverified', -- 'unverified' | 'orientation_completed'
  bio text,
  visible_lat numeric,   -- deliberately coarsened for map display
  visible_lng numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- time_credits_ledger
-- ---------------------------------------------------------------------------
create table if not exists public.time_credits_ledger (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  hours numeric not null default 0,
  exchange_description text,
  status text not null default 'offered', -- 'offered'|'accepted'|'completed'|'declined'
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_ledger_from on public.time_credits_ledger (from_user_id);
create index if not exists idx_ledger_to on public.time_credits_ledger (to_user_id);

-- ---------------------------------------------------------------------------
-- trust_scores (computed, cached)
-- ---------------------------------------------------------------------------
create table if not exists public.trust_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  proximity_component numeric not null default 0,
  shared_condition_component numeric not null default 0,
  reliability_component numeric not null default 0,
  response_latency_component numeric not null default 0,
  composite_trust_score numeric not null default 0,
  last_computed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- care_pings
-- ---------------------------------------------------------------------------
create table if not exists public.care_pings (
  id uuid primary key default gen_random_uuid(),
  at_risk_user_id uuid not null references public.profiles(id) on delete cascade,
  matched_user_id uuid not null references public.profiles(id) on delete cascade,
  risk_snapshot_id uuid references public.behavioral_health_index(id) on delete set null,
  status text not null default 'sent', -- 'sent'|'seen'|'accepted'|'declined'|'expired'
  channel text[] default '{in_app}',
  outcome_notes text,
  outcome_rating smallint check (outcome_rating between 1 and 5),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists idx_pings_matched on public.care_pings (matched_user_id, created_at desc);
create index if not exists idx_pings_atrisk on public.care_pings (at_risk_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- micro_interventions
-- ---------------------------------------------------------------------------
create table if not exists public.micro_interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  risk_snapshot_id uuid references public.behavioral_health_index(id) on delete set null,
  intervention_type text not null,
  generated_text text not null,
  source text not null default 'llm', -- 'llm' | 'template_fallback'
  user_response text, -- 'helpful'|'not_helpful'|'dismissed'
  created_at timestamptz not null default now()
);
create index if not exists idx_micro_user_time on public.micro_interventions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- crisis_escalation_events (append-only audit)
-- ---------------------------------------------------------------------------
create table if not exists public.crisis_escalation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trigger_source text not null, -- 'journal_keyword'|'ema_extreme_score'|'manual_selfreport'
  resource_shown text,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_crisis_user_time on public.crisis_escalation_events (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- resilience_points (gamification ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.resilience_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points int not null default 0,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_points_user on public.resilience_points (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- badges
-- ---------------------------------------------------------------------------
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_type text not null,
  is_public boolean not null default false,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_type)
);

-- ---------------------------------------------------------------------------
-- community_resources (public directory)
-- ---------------------------------------------------------------------------
create table if not exists public.community_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  address text,
  lat numeric, lng numeric,
  phone text,
  url text,
  is_crisis_resource boolean not null default false,
  country_code text,
  submitted_by uuid references public.profiles(id) on delete set null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_resources_country on public.community_resources (country_code);

-- ---------------------------------------------------------------------------
-- data_export_requests / data_deletion_requests (audit)
-- ---------------------------------------------------------------------------
create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested', -- 'requested'|'processing'|'completed'|'failed'
  export_url text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'requested', -- 'requested'|'processing'|'completed'|'failed'
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- caregiver_circle  (permissioned family/circle view — supports settings/family)
-- ---------------------------------------------------------------------------
create table if not exists public.caregiver_circle (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_user_id uuid references public.profiles(id) on delete cascade,
  caregiver_email text,
  scope text[] not null default '{risk_bucket}', -- which fields caregiver may see
  status text not null default 'invited', -- 'invited'|'active'|'revoked'
  created_at timestamptz not null default now(),
  unique (owner_user_id, caregiver_email)
);
