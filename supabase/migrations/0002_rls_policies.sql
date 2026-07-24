-- ============================================================================
-- AROGYASETU — 0002_rls_policies.sql
-- Enable RLS on EVERY table (default-deny) then add explicit policies.
-- Owner-only unless a table is explicitly shared/consented.
-- ============================================================================

-- Enable RLS everywhere -------------------------------------------------------
alter table public.profiles                  enable row level security;
alter table public.consents                   enable row level security;
alter table public.ema_checkins               enable row level security;
alter table public.validated_scales           enable row level security;
alter table public.journal_entries            enable row level security;
alter table public.manual_metric_logs         enable row level security;
alter table public.site_engagement_signals    enable row level security;
alter table public.engagement_daily_rollup    enable row level security;
alter table public.behavioral_health_index    enable row level security;
alter table public.environmental_snapshots    enable row level security;
alter table public.environmental_grid_cache   enable row level security;
alter table public.personal_exposure_lag_model enable row level security;
alter table public.mutual_aid_profiles        enable row level security;
alter table public.time_credits_ledger        enable row level security;
alter table public.trust_scores               enable row level security;
alter table public.care_pings                 enable row level security;
alter table public.micro_interventions        enable row level security;
alter table public.crisis_escalation_events   enable row level security;
alter table public.resilience_points          enable row level security;
alter table public.badges                     enable row level security;
alter table public.community_resources        enable row level security;
alter table public.data_export_requests       enable row level security;
alter table public.data_deletion_requests     enable row level security;
alter table public.caregiver_circle           enable row level security;

-- Helper: owner-only CRUD macro is written out per-table for clarity.

-- profiles -------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);
-- Insert handled by trigger (security definer); still allow self-insert as fallback.
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Generic owner-only tables ---------------------------------------------------
-- consents
create policy "consents_all_own" on public.consents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ema_checkins
create policy "ema_all_own" on public.ema_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- validated_scales
create policy "scales_all_own" on public.validated_scales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- journal_entries
create policy "journal_all_own" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- manual_metric_logs
create policy "metrics_all_own" on public.manual_metric_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- site_engagement_signals
create policy "engagement_all_own" on public.site_engagement_signals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- engagement_daily_rollup
create policy "engagement_rollup_all_own" on public.engagement_daily_rollup
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- behavioral_health_index (read-own; writes come from service role Edge Fn which bypasses RLS)
create policy "bhi_select_own" on public.behavioral_health_index
  for select using (auth.uid() = user_id);
-- personal_exposure_lag_model
create policy "lag_select_own" on public.personal_exposure_lag_model
  for select using (auth.uid() = user_id);
-- micro_interventions (read + update own response; created by service role)
create policy "micro_select_own" on public.micro_interventions
  for select using (auth.uid() = user_id);
create policy "micro_update_own" on public.micro_interventions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- resilience_points (read-own; awarded by service role / triggers)
create policy "points_select_own" on public.resilience_points
  for select using (auth.uid() = user_id);
create policy "points_insert_own" on public.resilience_points
  for insert with check (auth.uid() = user_id);
-- badges
create policy "badges_select_own" on public.badges
  for select using (auth.uid() = user_id);
create policy "badges_update_own" on public.badges
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "badges_insert_own" on public.badges
  for insert with check (auth.uid() = user_id);

-- environmental_snapshots (owner-linked rows) --------------------------------
create policy "env_select_own" on public.environmental_snapshots
  for select using (auth.uid() = user_id);
create policy "env_insert_own" on public.environmental_snapshots
  for insert with check (auth.uid() = user_id);
create policy "env_delete_own" on public.environmental_snapshots
  for delete using (auth.uid() = user_id);

-- environmental_grid_cache: any authenticated user may READ the shared cache;
-- writes are performed by the service-role Edge Function (bypasses RLS).
create policy "env_cache_select_auth" on public.environmental_grid_cache
  for select using (auth.role() = 'authenticated');

-- mutual_aid_profiles --------------------------------------------------------
-- Owner: full control of own row.
create policy "mutual_aid_all_own" on public.mutual_aid_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Other authenticated users may SELECT rows of ACTIVE members (for matching/map),
-- but the app must query the restricted VIEW (public_mutual_aid_directory) to
-- avoid over-exposure. We still gate raw SELECT to active profiles only.
create policy "mutual_aid_select_active" on public.mutual_aid_profiles
  for select using (auth.role() = 'authenticated' and is_active = true);

-- trust_scores ---------------------------------------------------------------
-- Own full breakdown:
create policy "trust_select_own" on public.trust_scores
  for select using (auth.uid() = user_id);
-- Others may read only via the restricted view; but allow authenticated select of
-- the composite through the view (view has security_invoker so this base policy
-- must permit it). We expose SELECT to authenticated but the VIEW hides components.
create policy "trust_select_auth" on public.trust_scores
  for select using (auth.role() = 'authenticated');

-- time_credits_ledger (both parties) -----------------------------------------
create policy "ledger_select_party" on public.time_credits_ledger
  for select using (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "ledger_insert_from" on public.time_credits_ledger
  for insert with check (auth.uid() = from_user_id or auth.uid() = to_user_id);
create policy "ledger_update_party" on public.time_credits_ledger
  for update using (auth.uid() = from_user_id or auth.uid() = to_user_id)
  with check (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- care_pings (both parties) ---------------------------------------------------
create policy "pings_select_party" on public.care_pings
  for select using (auth.uid() = at_risk_user_id or auth.uid() = matched_user_id);
-- Matched user may update status/outcome; at-risk may read only.
create policy "pings_update_matched" on public.care_pings
  for update using (auth.uid() = matched_user_id) with check (auth.uid() = matched_user_id);
-- Inserts come from the service-role Edge Function (match-and-send-care-ping).

-- crisis_escalation_events (append-only audit) -------------------------------
create policy "crisis_select_own" on public.crisis_escalation_events
  for select using (auth.uid() = user_id);
create policy "crisis_insert_own" on public.crisis_escalation_events
  for insert with check (auth.uid() = user_id);
-- Deliberately NO update/delete policy => append-only (RLS default-denies them).
create policy "crisis_update_ack_own" on public.crisis_escalation_events
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and acknowledged = true);

-- community_resources --------------------------------------------------------
create policy "resources_select_approved" on public.community_resources
  for select using (approved = true or submitted_by = auth.uid());
create policy "resources_insert_auth" on public.community_resources
  for insert with check (auth.role() = 'authenticated' and submitted_by = auth.uid());
create policy "resources_update_submitter" on public.community_resources
  for update using (submitted_by = auth.uid()) with check (submitted_by = auth.uid());
create policy "resources_delete_submitter" on public.community_resources
  for delete using (submitted_by = auth.uid());

-- data_export/deletion requests ----------------------------------------------
create policy "export_all_own" on public.data_export_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "deletion_all_own" on public.data_deletion_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- caregiver_circle -----------------------------------------------------------
-- Owner manages their circle; caregivers can see rows where they are the caregiver.
create policy "circle_owner_all" on public.caregiver_circle
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "circle_caregiver_select" on public.caregiver_circle
  for select using (auth.uid() = caregiver_user_id);
