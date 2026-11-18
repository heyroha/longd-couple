-- 7차 업데이트: 메뉴를 식사 / 주류·음료 두 파트로 · 의결서에 주류 칸
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
alter table public.menus add column if not exists kind text not null default 'food';   -- food | drink
alter table public.responses add column if not exists drinks text not null default '';  -- 고른 주류·음료 (· 로 연결)
