-- 12차 업데이트: 우리 동네(베타) — 실시간 같이 움직이기 + 채팅
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
create table if not exists public.town_presence (
  avatar text primary key check (avatar in ('boy', 'girl')),
  scene text not null default 'street',
  x real not null default 0,
  y real not null default 0,
  face text not null default 'down',
  moving boolean not null default false,
  pose text not null default '',          -- '' | sit | lie
  act text not null default '',           -- 마지막 행동 JSON (안기·뽀뽀·기타)
  tv text not null default '',            -- TV 켜짐 JSON {on, at}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.town_presence enable row level security;

create table if not exists public.town_chat (
  id uuid primary key default gen_random_uuid(),
  avatar text not null check (avatar in ('boy', 'girl')),
  text text not null check (char_length(text) between 1 and 200),
  created_at timestamptz not null default now()
);
create index if not exists town_chat_created on public.town_chat (created_at desc);
alter table public.town_chat enable row level security;

-- 집 가구 배치 (꾹 눌러 옮긴 위치, 둘이 같이 봄)
create table if not exists public.town_layout (
  id text primary key,                   -- 'home'
  data text not null default '{}',       -- {"bed":{"x":3,"y":1}, ...}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.town_layout enable row level security;
