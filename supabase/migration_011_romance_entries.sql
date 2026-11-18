-- 11차 업데이트: 이달의 낭만 리스트 — 날짜별로 각자 기록 (글 또는 사진)
-- 내가 그날 기록해야 상대방 기록이 보여요 (서버에서 가려서 보냄)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
create table if not exists public.romance_entries (
  id text primary key,                         -- "2026-11-06_girl" (하루에 한 사람당 하나)
  day text not null,                           -- 2026-11-06
  month text not null,                         -- 2026-11 (달력 표시용)
  avatar text not null check (avatar in ('boy', 'girl')),
  kind text not null check (kind in ('text', 'photo')),
  body text not null default '',
  photo text not null default '',              -- data:image/jpeg;base64,...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists romance_entries_month on public.romance_entries (month);
alter table public.romance_entries enable row level security;
