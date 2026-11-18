-- 2차 업데이트: 설정(디데이·장소·회차) + 푸시 알림 구독 + 의결서 회차
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),   -- 항상 한 줄만
  dday timestamptz not null,
  place text not null check (char_length(place) between 1 and 60),
  round int not null check (round between 1 and 999),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  device text not null default '',
  created_at timestamptz not null default now()
);

alter table public.responses add column if not exists round int;

-- 브라우저 직접 접근 차단 (서버 secret 키로만)
alter table public.settings enable row level security;
alter table public.push_subscriptions enable row level security;
