// 매일 11:30 편지 · 17:00 힌트 예약 SQL 만들기 → tools/out/cron_letter.sql (비밀값이 들어 있어 깃에 안 올라감)
// 실행: node tools/make_cron_sql.mjs  → 생성된 SQL을 Supabase SQL Editor 에서 Run
import { writeFileSync, mkdirSync } from 'node:fs';
process.loadEnvFile(new URL('../.env', import.meta.url));
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error('.env 에 CRON_SECRET 이 없어요');
const site = process.env.SITE_URL || 'https://your-app.vercel.app';
const sql = `-- 매일 오전 11:30 (한국 시간 = UTC 02:30) 편지 보내기
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'kk-daily-letter';

select cron.schedule('kk-daily-letter', '30 2 * * *', $job$
  select net.http_post(
    url := '${site}/api/cron/letter',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '${secret}'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

-- 매일 오후 5시 (한국 시간 = UTC 08:00) 힌트 우체통
select cron.unschedule(jobid) from cron.job where jobname = 'kk-daily-hint';

select cron.schedule('kk-daily-hint', '0 8 * * *', $job$
  select net.http_post(
    url := '${site}/api/cron/hint',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '${secret}'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$job$);

-- 확인: select jobname, schedule, active from cron.job;
`;
mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/cron_letter.sql', import.meta.url), sql);
console.log('생성: tools/out/cron_letter.sql');
