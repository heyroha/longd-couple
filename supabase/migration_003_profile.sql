-- 3차 업데이트: 의결서에 프로필(이름 + 캐릭터) 기록
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
alter table public.responses add column if not exists profile_name text not null default '';
alter table public.responses add column if not exists profile_avatar text not null default '';
