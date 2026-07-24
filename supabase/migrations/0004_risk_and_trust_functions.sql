-- ============================================================================
-- AROGYASETU — 0004_risk_and_trust_functions.sql
-- Transparent, rule-based/weighted risk-scoring (Part 3) and trust-scoring
-- (Part 4). NO black-box ML. The LLM is called elsewhere only to narrate the
-- already-computed numeric factors — never to compute the score.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- helper: normalize a delta (raw change vs baseline) into a 0..100 risk points
-- scale where "worse than baseline" => higher risk. `direction` = 1 means a
-- HIGHER value is worse (e.g. anxiety), -1 means a LOWER value is worse (e.g.
-- mood/sleep/energy/social).
-- ---------------------------------------------------------------------------
create or replace function public.norm_delta(
  current_val numeric, baseline numeric, direction int
) returns numeric language plpgsql immutable as $$
declare
  d numeric;
begin
  if current_val is null or baseline is null then
    return 0; -- graceful zero contribution when data missing
  end if;
  -- raw delta scaled to 0..10 sub-scores; multiply by 10 to reach a 0..100 band
  d := (baseline - current_val) * direction * -1; -- worse => positive
  -- If direction=-1 (lower is worse): baseline-current when current<baseline is positive
  -- normalize: each 1-point shift on a 0..10 scale ~ 10 risk points
  return greatest(0, least(100, d * 10));
end;
$$;

-- ---------------------------------------------------------------------------
-- compute_behavioral_health_index(user, date)
-- Returns void; upserts one behavioral_health_index row.
-- Weights (defaults; tunable per-user via risk_sensitivity):
--   0.30 validated_scale_delta
--   0.25 ema_composite_delta
--   0.20 journal_nlp_delta
--   0.10 engagement_rhythm_delta
--   0.15 environmental_risk_weighted_delta
-- Baseline = user's own 14-day rolling average (personal, not population).
-- ---------------------------------------------------------------------------
create or replace function public.compute_behavioral_health_index(
  p_user uuid,
  p_date date default current_date
) returns public.behavioral_health_index
language plpgsql
security definer
set search_path = public
as $$
declare
  w_scale numeric := 0.30;
  w_ema numeric := 0.25;
  w_journal numeric := 0.20;
  w_engage numeric := 0.10;
  w_env numeric := 0.15;
  sensitivity_mult numeric := 1.0;
  v_sensitivity text;

  -- recent (last 2 days) vs baseline (last 14 days)
  cur_mood numeric; base_mood numeric;
  cur_energy numeric; base_energy numeric;
  cur_anx numeric; base_anx numeric;
  cur_sleep numeric; base_sleep numeric;
  cur_social numeric; base_social numeric;

  ema_delta numeric := 0;
  scale_delta numeric := 0;
  journal_delta numeric := 0;
  engage_delta numeric := 0;
  env_delta numeric := 0;

  cur_scale numeric; base_scale numeric;
  cur_sent numeric; base_sent numeric;
  late_night_recent int; late_night_base numeric;
  env_aqi numeric; lag_corr numeric;

  composite numeric := 0;
  bucket text;
  factors jsonb := '[]'::jsonb;
  result public.behavioral_health_index;
begin
  select risk_sensitivity into v_sensitivity from public.profiles where id = p_user;
  sensitivity_mult := case v_sensitivity
    when 'subtle' then 1.25   -- more sensitive => amplifies deltas
    when 'strong' then 0.8    -- only strong signals => dampens deltas
    else 1.0 end;

  -- ---- EMA sub-scores: recent 2d vs 14d baseline ----
  select avg(mood_score), avg(energy_score), avg(anxiety_score),
         avg(sleep_quality_last_night), avg(social_connection_score)
    into cur_mood, cur_energy, cur_anx, cur_sleep, cur_social
    from public.ema_checkins
   where user_id = p_user and submitted_at >= (p_date - interval '2 days');

  select avg(mood_score), avg(energy_score), avg(anxiety_score),
         avg(sleep_quality_last_night), avg(social_connection_score)
    into base_mood, base_energy, base_anx, base_sleep, base_social
    from public.ema_checkins
   where user_id = p_user and submitted_at >= (p_date - interval '14 days');

  ema_delta := (
      norm_delta(cur_mood,   base_mood,   -1) +
      norm_delta(cur_energy, base_energy, -1) +
      norm_delta(cur_anx,    base_anx,     1) +
      norm_delta(cur_sleep,  base_sleep,  -1) +
      norm_delta(cur_social, base_social, -1)
    ) / 5.0;

  -- ---- Validated scales: recent vs baseline (higher score = worse) ----
  select avg(computed_score) into cur_scale from public.validated_scales
    where user_id = p_user and administered_at >= (p_date - interval '3 days');
  select avg(computed_score) into base_scale from public.validated_scales
    where user_id = p_user and administered_at >= (p_date - interval '21 days');
  if cur_scale is not null and base_scale is not null then
    -- PHQ4/GAD2/UCLA3 scale roughly 0..12; each point ~ 8 risk pts
    scale_delta := greatest(0, least(100, (cur_scale - base_scale) * 8 + cur_scale * 4));
  elsif cur_scale is not null then
    scale_delta := greatest(0, least(100, cur_scale * 8));
  end if;

  -- ---- Journal NLP sentiment delta (degrade to 0 if unanalyzed) ----
  select avg(nlp_sentiment_score) into cur_sent from public.journal_entries
    where user_id = p_user and nlp_status = 'done'
      and created_at >= (p_date - interval '3 days');
  select avg(nlp_sentiment_score) into base_sent from public.journal_entries
    where user_id = p_user and nlp_status = 'done'
      and created_at >= (p_date - interval '14 days');
  if cur_sent is not null and base_sent is not null then
    -- sentiment in -1..1 ; drop in sentiment => positive risk
    journal_delta := greatest(0, least(100, (base_sent - cur_sent) * 100));
  end if;

  -- ---- Engagement rhythm delta (late-night clustering) ----
  select count(*) into late_night_recent from public.site_engagement_signals
    where user_id = p_user and time_of_day_bucket = 'late_night'
      and created_at >= (p_date - interval '3 days');
  select coalesce(avg(late_night_sessions),0) into late_night_base
    from public.engagement_daily_rollup
    where user_id = p_user and rollup_date >= (p_date - interval '14 days');
  engage_delta := greatest(0, least(100, (late_night_recent - late_night_base) * 15));

  -- ---- Environmental risk weighted by personal lag model ----
  select aqi into env_aqi from public.environmental_snapshots
    where user_id = p_user order by fetched_at desc limit 1;
  select max(correlation_strength) into lag_corr
    from public.personal_exposure_lag_model where user_id = p_user;
  if env_aqi is not null then
    -- AQI 0..300+ ; normalize to 0..100, weight by personal correlation (default 0.5)
    env_delta := greatest(0, least(100, (env_aqi / 3.0) * coalesce(lag_corr, 0.5)));
  end if;

  -- ---- Composite ----
  composite := clamp_0_100(
      (w_scale  * scale_delta +
       w_ema    * ema_delta +
       w_journal* journal_delta +
       w_engage * engage_delta +
       w_env    * env_delta) * sensitivity_mult
  );

  bucket := case
    when composite >= 70 then 'elevated'
    when composite >= 40 then 'moderate'
    else 'low' end;

  -- ---- Explainability: contributing factors (plain-language deltas) ----
  factors := jsonb_build_array(
    jsonb_build_object('factor','Validated scales','weight',w_scale,
      'score',round(scale_delta,1),
      'delta_description', case when cur_scale is not null
        then 'Recent clinical-scale scores trending ' || (case when scale_delta>10 then 'higher (worse)' else 'stable' end)
        else 'No recent validated scale on file' end),
    jsonb_build_object('factor','Daily check-ins','weight',w_ema,
      'score',round(ema_delta,1),
      'delta_description', build_ema_note(cur_sleep, base_sleep, cur_mood, base_mood, cur_anx, base_anx)),
    jsonb_build_object('factor','Journaling sentiment','weight',w_journal,
      'score',round(journal_delta,1),
      'delta_description', case when cur_sent is not null
        then 'Journal tone ' || (case when journal_delta>10 then 'more negative than your 2-week norm' else 'consistent with your norm' end)
        else 'No analyzed journal entries yet' end),
    jsonb_build_object('factor','Usage rhythm','weight',w_engage,
      'score',round(engage_delta,1),
      'delta_description', case when engage_delta>10
        then 'More late-night activity than usual' else 'Usage rhythm steady' end),
    jsonb_build_object('factor','Environment','weight',w_env,
      'score',round(env_delta,1),
      'delta_description', case when env_aqi is not null
        then 'Local air quality (AQI ' || round(env_aqi) || ') factored by your personal sensitivity'
        else 'No environmental data yet' end)
  );

  insert into public.behavioral_health_index
    (user_id, index_date, composite_score, risk_bucket, contributing_factors, computed_at)
  values (p_user, p_date, round(composite,1), bucket, factors, now())
  on conflict (user_id, index_date) do update
    set composite_score = excluded.composite_score,
        risk_bucket = excluded.risk_bucket,
        contributing_factors = excluded.contributing_factors,
        computed_at = now()
  returning * into result;

  return result;
end;
$$;

-- clamp helper
create or replace function public.clamp_0_100(v numeric)
returns numeric language sql immutable as $$
  select greatest(0, least(100, coalesce(v,0)));
$$;

-- friendly EMA note builder for the "Why?" card
create or replace function public.build_ema_note(
  cur_sleep numeric, base_sleep numeric,
  cur_mood numeric, base_mood numeric,
  cur_anx numeric, base_anx numeric
) returns text language plpgsql immutable as $$
declare parts text[] := '{}';
begin
  if cur_sleep is not null and base_sleep is not null and cur_sleep < base_sleep - 1 then
    parts := array_append(parts,
      'Sleep quality down ~' || round((base_sleep-cur_sleep)/nullif(base_sleep,0)*100) || '% vs your 2-week average');
  end if;
  if cur_mood is not null and base_mood is not null and cur_mood < base_mood - 1 then
    parts := array_append(parts, 'Mood below your recent baseline');
  end if;
  if cur_anx is not null and base_anx is not null and cur_anx > base_anx + 1 then
    parts := array_append(parts, 'Anxiety above your recent baseline');
  end if;
  if array_length(parts,1) is null then
    return 'Check-in scores steady vs your 2-week average';
  end if;
  return array_to_string(parts, '; ');
end;
$$;

-- ---------------------------------------------------------------------------
-- compute_trust_score(user)
-- ---------------------------------------------------------------------------
create or replace function public.compute_trust_score(p_user uuid)
returns public.trust_scores
language plpgsql security definer set search_path = public
as $$
declare
  prox numeric := 0.5;   -- neutral default until proximity computed against pool
  shared numeric := 0;
  reliability numeric := 0;
  latency numeric := 0.5;
  composite numeric := 0;
  n_completed numeric; n_offered numeric; avg_rating numeric;
  avg_latency_secs numeric;
  result public.trust_scores;
begin
  -- reliability: completed / (offered+accepted+completed) + rating bonus
  select count(*) filter (where status='completed'),
         count(*) filter (where status in ('offered','accepted','completed')),
         avg(rating)
    into n_completed, n_offered, avg_rating
    from public.time_credits_ledger
   where from_user_id = p_user or to_user_id = p_user;
  if coalesce(n_offered,0) > 0 then
    reliability := least(1, (n_completed / n_offered) * 0.7 + coalesce(avg_rating,3)/5.0 * 0.3);
  end if;

  -- response latency: normalized inverse of avg (responded_at - created_at)
  select avg(extract(epoch from (responded_at - created_at)))
    into avg_latency_secs
    from public.care_pings
   where matched_user_id = p_user and responded_at is not null;
  if avg_latency_secs is not null then
    -- < 5 min => ~1.0 ; > 24h => ~0.0
    latency := greatest(0, least(1, 1 - (avg_latency_secs / 86400.0)));
  end if;

  -- shared_condition_component & proximity are pairwise; here we store a
  -- self-baseline (1.0 if the user has tags/location). Pairwise Jaccard is
  -- applied at match time in match-and-send-care-ping / the directory query.
  select case when array_length(condition_tags,1) > 0 then 0.5 else 0 end,
         case when home_lat is not null then 0.6 else 0.3 end
    into shared, prox
    from public.profiles where id = p_user;

  composite := 0.35*prox + 0.25*shared + 0.20*reliability + 0.20*latency;

  insert into public.trust_scores
    (user_id, proximity_component, shared_condition_component,
     reliability_component, response_latency_component,
     composite_trust_score, last_computed_at)
  values (p_user, round(prox,3), round(shared,3), round(reliability,3),
          round(latency,3), round(composite,3), now())
  on conflict (user_id) do update
    set proximity_component = excluded.proximity_component,
        shared_condition_component = excluded.shared_condition_component,
        reliability_component = excluded.reliability_component,
        response_latency_component = excluded.response_latency_component,
        composite_trust_score = excluded.composite_trust_score,
        last_computed_at = now()
  returning * into result;

  return result;
end;
$$;

-- Pairwise trust for matching: proximity (inverse distance) + Jaccard tag overlap
create or replace function public.pairwise_match_score(p_at_risk uuid, p_candidate uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  d numeric; prox numeric; jac numeric; base_trust numeric;
  a_tags text[]; b_tags text[]; inter int; uni int;
  lat1 numeric; lng1 numeric; lat2 numeric; lng2 numeric;
begin
  select home_lat, home_lng, condition_tags into lat1, lng1, a_tags from public.profiles where id = p_at_risk;
  select visible_lat, visible_lng into lat2, lng2 from public.mutual_aid_profiles where user_id = p_candidate;
  select condition_tags into b_tags from public.profiles where id = p_candidate;

  -- crude distance (deg) -> proximity in 0..1
  if lat1 is not null and lat2 is not null then
    d := sqrt(power(lat1-lat2,2) + power(lng1-lng2,2));
    prox := greatest(0, least(1, 1 - (d/0.5)));  -- within ~50km-ish => high
  else prox := 0.3; end if;

  -- Jaccard
  select count(*) into inter from (select unnest(a_tags) intersect select unnest(b_tags)) s;
  select count(*) into uni from (select unnest(a_tags) union select unnest(b_tags)) s;
  jac := case when uni > 0 then inter::numeric/uni else 0 end;

  select composite_trust_score into base_trust from public.trust_scores where user_id = p_candidate;

  return 0.35*prox + 0.25*jac + 0.40*coalesce(base_trust,0.3);
end;
$$;
