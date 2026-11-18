// 알림 기록 보기: node tools/push_logs.mjs [개수=20] [종류]
//   예) node tools/push_logs.mjs 50        최근 50개
//       node tools/push_logs.mjs 30 메뉴    "메뉴 추가" 알림만
process.loadEnvFile(new URL('../.env', import.meta.url));
const limit = Number(process.argv[2]) || 20;
const kind = process.argv[3] || '';
const url = `${process.env.SUPABASE_URL}/rest/v1/push_logs?select=*&order=created_at.desc&limit=${limit}`;
const res = await fetch(url, { headers: { apikey: process.env.SUPABASE_SECRET_KEY } });
if (!res.ok) { console.error('불러오기 실패', res.status, await res.text()); process.exit(1); }
const kst = (t) => new Date(new Date(t).getTime() + 9 * 3600e3).toISOString().slice(5, 16).replace('T', ' ');
const AV = { boy: '男', girl: '女' };
const rows = (await res.json()).filter((r) => !kind || r.kind.includes(kind));
if (!rows.length) console.log('알림 기록이 없어요.');
for (const r of rows) {
  console.log(`\n[${kst(r.created_at)}] ${r.kind} · ${r.sent}/${r.total}대 · 대상: ${r.target}`);
  console.log(`  이유: ${r.reason || '-'}`);
  console.log(`  알림: ${r.title}${r.body ? ` — ${r.body}` : ''}`);
  for (const p of r.recipients || []) console.log(`   - ${p.device || '(이름 없음)'} ${AV[p.avatar] || ''} → ${p.result}`);
}
