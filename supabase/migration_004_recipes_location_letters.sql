-- 4차 업데이트: 메뉴 메모 · 처음 만난 날 · 거리 · 레시피 노트 · 매일 편지 · 배포 안내
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)

-- 메뉴 요청사항 메모
alter table public.menus add column if not exists memo text not null default '';

-- 설정: 처음 만난 날, 가장 멀었던 거리, 배포 중 안내, 말투 카드
alter table public.settings add column if not exists start_date date;
alter table public.settings add column if not exists max_km numeric not null default 0;
alter table public.settings add column if not exists maintenance boolean not null default false;
alter table public.settings add column if not exists maintenance_at timestamptz;
alter table public.settings add column if not exists style_cards jsonb not null default '{}'::jsonb;

-- 알림 구독에 캐릭터(boy/girl) 표시 → 편지를 받을 사람 구분
alter table public.push_subscriptions add column if not exists avatar text not null default '';

-- 각자 위치 (좌표는 약 1km 단위로 반올림해서 저장, 화면에는 거리만 표시)
create table if not exists public.locations (
  avatar text primary key check (avatar in ('boy', 'girl')),
  name text not null default '',
  area text not null default '',           -- 동네 이름 (예: 대구광역시 달빛구)
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 레시피 노트
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  category text not null default '',
  minutes int,
  servings int,
  ingredients text not null default '',
  steps text not null default '',
  memo text not null default '',
  image_thumb text not null default '',   -- 갤러리 사진 (작은 썸네일, data URL)
  image_full text not null default '',    -- 갤러리 사진 (상세용, data URL)
  image_url text not null default '',     -- 자동 이미지 (Pexels)
  image_credit text not null default '',
  favorite boolean not null default false,
  author text not null default '',
  source text not null default '',        -- 채팅 검색에서 저장한 경우 출처
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 매일 11:30 편지
create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  to_avatar text not null default '',
  from_name text not null default '',
  to_name text not null default '',
  title text not null default '',
  body text not null default '',
  poem_title text not null default '',
  poem_author text not null default '',
  poem_text text not null default '',
  weather jsonb not null default '{}'::jsonb
);

alter table public.locations add column if not exists area text not null default '';

alter table public.locations enable row level security;
alter table public.recipes enable row level security;
alter table public.letters enable row level security;
