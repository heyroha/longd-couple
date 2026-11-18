-- 6차 업데이트: 레시피 채팅 기록 · 힌트 우체통 (매일 17:00 까치 힌트)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)

-- 레시피 채팅 기록 (누가 무엇을 물어봤는지)
create table if not exists public.recipe_chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  avatar text not null default '',        -- 물어본 사람 boy | girl
  name text not null default '',
  question text not null default '',
  answer text not null default '',
  recipe_title text not null default ''
);
create index if not exists recipe_chats_created_at on public.recipe_chats (created_at desc);

-- 힌트 우체통 (까치가 상대방의 오늘 검색을 살짝 알려줌)
create table if not exists public.hints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  day date not null,                      -- 한국 날짜
  to_avatar text not null default '',     -- 받는 사람
  about_avatar text not null default '',  -- 검색한 사람
  about_name text not null default '',
  title text not null default '',
  body text not null default '',
  evidence text not null default '',
  searches jsonb not null default '[]'::jsonb,
  read_at timestamptz
);
create unique index if not exists hints_one_per_day on public.hints (day, to_avatar);

alter table public.recipe_chats enable row level security;
alter table public.hints enable row level security;

-- 예약 상태 확인 함수: 편지(11:30) + 힌트(17:00) 둘 다 보이게
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
  where j.jobname like 'kk-daily-%';
$$;
revoke all on function public.letter_cron_status() from public, anon, authenticated;
grant execute on function public.letter_cron_status() to service_role;
