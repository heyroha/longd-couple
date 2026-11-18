-- 8차 업데이트: 문의하기(상대방) → 문의함(지민)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_avatar text not null default '',
  from_name text not null default '',
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'open',      -- open | done
  resolved_at timestamptz
);
create index if not exists inquiries_created_at on public.inquiries (created_at desc);
alter table public.inquiries enable row level security;
