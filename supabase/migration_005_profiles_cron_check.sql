-- 5차 업데이트: 두 사람 프로필 공유 · 매일 편지 예약 상태 확인
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)

-- 두 사람 프로필 {"boy": {"name": "..."}, "girl": {"name": "..."}} → 상대방 폰에도 보임
alter table public.settings add column if not exists profiles jsonb not null default '{}'::jsonb;

-- 매일 11:30 편지 예약(pg_cron)이 등록돼 있는지 서버에서 확인하는 함수 (서버 비밀키로만 호출 가능)
create or replace function public.letter_cron_status()
returns table (jobname text, schedule text, active boolean, last_status text, last_start timestamptz, last_message text)
language sql
security definer
set search_path = public, cron
as $$
  select j.jobname::text, j.schedule::text, j.active,
         d.status::text, d.start_time, left(d.return_message, 200)
  from cron.job j
  left join lateral (
    select r.status, r.start_time, r.return_message
    from cron.job_run_details r
    where r.jobid = j.jobid
    order by r.start_time desc
    limit 1
  ) d on true
  where j.jobname = 'kk-daily-letter';
$$;

revoke all on function public.letter_cron_status() from public, anon, authenticated;
grant execute on function public.letter_cron_status() to service_role;
