-- 10차 업데이트: 오늘의 편지 = 날씨 브리핑 + 포춘쿠키 운세 + 시, 그리고 직접 쓰는 편지
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
alter table public.letters add column if not exists kind text not null default 'daily';     -- daily(매일 11:30) | user(직접 쓴 편지)
alter table public.letters add column if not exists from_avatar text not null default '';
alter table public.letters add column if not exists fortune jsonb not null default '{}'::jsonb; -- {text, color, item, number}
