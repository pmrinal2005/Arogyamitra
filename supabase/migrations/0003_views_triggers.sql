-- ============================================================================
-- AROGYASETU — 0003_views_triggers.sql
-- Restricted privacy views, new-user trigger, updated_at triggers, and the
-- public mutual-aid directory that never leaks health/journal/EMA data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- handle_new_user: auto-create a profile row on signup + default consents
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  -- Seed default consent rows (all denied by default = privacy-by-default)
  insert into public.consents (user_id, consent_type, granted)
  values
    (new.id, 'ema_checkins', false),
    (new.id, 'journaling_nlp', false),
    (new.id, 'environmental_location', false),
    (new.id, 'mutual_aid_matching', false),
    (new.id, 'webcam_scan', false),
    (new.id, 'care_ping_receiving', false),
    (new.id, 'aggregate_research_sharing', false)
  on conflict (user_id, consent_type) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_mutual_aid_touch on public.mutual_aid_profiles;
create trigger trg_mutual_aid_touch before update on public.mutual_aid_profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Restricted view: public_mutual_aid_directory
-- Exposes ONLY minimized matching fields for OTHER users. Never address,
-- never journal/EMA/health data. security_invoker so RLS of the caller applies.
-- ---------------------------------------------------------------------------
create or replace view public.public_mutual_aid_directory
with (security_invoker = true) as
select
  m.user_id,
  p.display_name,
  p.avatar_url,
  m.offers_help_with,
  m.verification_status,
  -- coarsened location only
  round(m.visible_lat::numeric, 2) as visible_lat,
  round(m.visible_lng::numeric, 2) as visible_lng,
  m.availability_calendar,
  coalesce(t.composite_trust_score, 0) as composite_trust_score,
  -- shared condition tags for match transparency (tags are opt-in, non-clinical)
  p.condition_tags,
  m.bio,
  -- public badges only
  coalesce(
    (select array_agg(b.badge_type)
       from public.badges b
      where b.user_id = m.user_id and b.is_public = true),
    '{}'::text[]
  ) as public_badges
from public.mutual_aid_profiles m
join public.profiles p on p.id = m.user_id
left join public.trust_scores t on t.user_id = m.user_id
where m.is_active = true;

comment on view public.public_mutual_aid_directory is
  'Minimized, privacy-safe directory for mutual-aid matching. No raw address, no health data. Only composite trust score (never sub-components).';

-- ---------------------------------------------------------------------------
-- Gamification: award resilience points on key events
-- ---------------------------------------------------------------------------
create or replace function public.award_points(p_user uuid, p_points int, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.resilience_points (user_id, points, reason)
  values (p_user, p_points, p_reason);
end;
$$;

-- +5 points per EMA check-in
create or replace function public.on_ema_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_points(new.user_id, 5, 'checkin_streak');
  return new;
end;
$$;
drop trigger if exists trg_ema_points on public.ema_checkins;
create trigger trg_ema_points after insert on public.ema_checkins
  for each row execute function public.on_ema_insert();

-- +8 points per journal entry
create or replace function public.on_journal_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_points(new.user_id, 8, 'journal_logged');
  return new;
end;
$$;
drop trigger if exists trg_journal_points on public.journal_entries;
create trigger trg_journal_points after insert on public.journal_entries
  for each row execute function public.on_journal_insert();

-- +15 points when a matched user accepts a care ping
create or replace function public.on_care_ping_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform public.award_points(new.matched_user_id, 15, 'care_ping_answered');
    -- Award "First Care Ping Answered" badge
    insert into public.badges (user_id, badge_type)
    values (new.matched_user_id, 'First Care Ping Answered')
    on conflict (user_id, badge_type) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_care_ping_points on public.care_pings;
create trigger trg_care_ping_points after update on public.care_pings
  for each row execute function public.on_care_ping_update();
