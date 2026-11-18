-- 9차 업데이트: 알림 기록 (누구에게 · 어떤 알림이 · 왜 갔는지)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
create table if not exists public.push_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null default '',          -- 의결서 · 메뉴 추가 · 오늘의 편지 · 우체통 · 문의 · 문의 해결 · 배포 완료 …
  reason text not null default '',        -- 사람이 읽는 이유 (예: 지민공주🌸가 메뉴 "소주" 추가)
  title text not null default '',
  body text not null default '',
  url text not null default '',
  target text not null default '',        -- 받을 대상 규칙 (예: 모두 · 女만 · 보낸 기기 제외)
  sent int not null default 0,
  total int not null default 0,
  recipients jsonb not null default '[]'::jsonb  -- [{device, avatar, result}]
);
create index if not exists push_logs_created_at on public.push_logs (created_at desc);
alter table public.push_logs enable row level security;
