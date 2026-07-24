-- ============================================================================
-- AROGYASETU — 0005_cron_and_storage.sql
-- Scheduled jobs (pg_cron) + Storage buckets and their RLS policies.
-- NOTE: pg_cron http calls to Edge Functions use pg_net if available. If your
-- project cannot use pg_net, schedule these via Vercel Cron hitting the Edge
-- Function URLs instead (see README "Scheduling" section). The SQL below is
-- safe to run; the http calls are wrapped in a guard.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- purge-stale-engagement-data (pure SQL — no external call needed)
-- Roll up raw engagement > 30 days into engagement_daily_rollup then delete raw.
-- ---------------------------------------------------------------------------
create or replace function public.purge_stale_engagement()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.engagement_daily_rollup
    (user_id, rollup_date, session_count, total_tab_switches, late_night_sessions)
  select user_id,
         date(created_at) as rollup_date,
         count(*),
         coalesce(sum(tab_switch_count),0),
         count(*) filter (where time_of_day_bucket = 'late_night')
    from public.site_engagement_signals
   where created_at < now() - interval '30 days'
   group by user_id, date(created_at)
  on conflict (user_id, rollup_date) do update
    set session_count = excluded.session_count,
        total_tab_switches = excluded.total_tab_switches,
        late_night_sessions = excluded.late_night_sessions;

  delete from public.site_engagement_signals
   where created_at < now() - interval '30 days';
end;
$$;

-- Schedule daily purge at 03:15 UTC
select cron.schedule('purge-stale-engagement', '15 3 * * *',
  $$select public.purge_stale_engagement();$$)
where not exists (select 1 from cron.job where jobname = 'purge-stale-engagement');

-- Recompute trust scores nightly for active mutual-aid members at 03:30 UTC
create or replace function public.recompute_all_trust_scores()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select user_id from public.mutual_aid_profiles where is_active = true loop
    perform public.compute_trust_score(r.user_id);
  end loop;
end;
$$;
select cron.schedule('recompute-trust', '30 3 * * *',
  $$select public.recompute_all_trust_scores();$$)
where not exists (select 1 from cron.job where jobname = 'recompute-trust');

-- Recompute behavioral health index nightly at 02:00 UTC for all users with
-- any recent activity (last 14 days).
create or replace function public.recompute_all_bhi()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select distinct user_id from public.ema_checkins where submitted_at >= now() - interval '14 days'
    union
    select distinct user_id from public.journal_entries where created_at >= now() - interval '14 days'
  loop
    perform public.compute_behavioral_health_index(r.user_id, current_date);
  end loop;
end;
$$;
select cron.schedule('recompute-bhi', '0 2 * * *',
  $$select public.recompute_all_bhi();$$)
where not exists (select 1 from cron.job where jobname = 'recompute-bhi');

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('journal-artifacts', 'journal-artifacts', false)
on conflict (id) do nothing;

-- Storage RLS: owner-only per folder path {bucket}/{user_id}/...
-- avatars: public read, owner write
create policy "avatars_read_public" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_write_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- exports: owner-only read/write
create policy "exports_all_own" on storage.objects
  for all using (
    bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- journal-artifacts: owner-only read/write
create policy "journal_artifacts_all_own" on storage.objects
  for all using (
    bucket_id = 'journal-artifacts' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'journal-artifacts' and (storage.foldername(name))[1] = auth.uid()::text
  );
