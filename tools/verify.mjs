// 기능 검증: node tools/verify.mjs [주소] [--ai]
//  - --ai 를 붙일 때만 Gemini(레시피 채팅·매일 편지) 검사 — 하루 사용량이 있어서 평소엔 건너뜀
//  - 로컬(기본 http://127.0.0.1:5500): 쓰기 포함 전체 검증 (로컬 저장소로 실행한 서버에서만!)
//  - 실제 주소: 데이터를 바꾸지 않는 검증만 + 테스트 레시피는 만들고 바로 삭제
process.loadEnvFile(new URL('../.env', import.meta.url));
const ARGS = process.argv.slice(2), AI = ARGS.includes('--ai');
const BASE = ARGS.find((a) => !a.startsWith('--')) || 'http://127.0.0.1:5500';
const LOCAL = /127\.0\.0\.1|localhost/.test(BASE);
const CRON = LOCAL ? (process.env.LOCAL_CRON_SECRET || 'localtest') : process.env.CRON_SECRET;

let pass = 0, failN = 0;
const results = [];
async function check(name, fn) {
  const t = Date.now();
  try {
    const note = await fn();
    pass++; results.push(`✅ ${name}${note ? ` — ${note}` : ''} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  } catch (e) {
    failN++; results.push(`❌ ${name} — ${e.message}`);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { status: r.status, d };
}

// ---- 읽기 (공통) ----
await check('상태 /api/status', async () => { const { status, d } = await api('/api/status'); assert(status === 200 && d.version, status); return `version ${d.version.slice(0, 7)}, 배포중=${d.maintenance}`; });
await check('정적 파일 (화면·테마·아이콘·영상·시)', async () => {
  for (const p of ['/', '/css/notebook.css', '/js/main.js', '/icons/doodle/heart.svg', '/assets/intro.mp4', '/data/ourstory.json', '/sw.js', '/manifest.webmanifest']) {
    const r = await fetch(BASE + p, { headers: p.endsWith('.mp4') ? { Range: 'bytes=0-99' } : {} }); assert(r.ok, `${p} ${r.status}`);
  }
});
await check('비공개 파일 차단', async () => { for (const p of ['/server.js', '/.env', '/lib/handlers.js', '/lib/poems.json']) { const r = await fetch(BASE + p); assert(r.status === 404, `${p} ${r.status}`); } });
await check('설정 조회', async () => { const { d } = await api('/api/settings'); assert(d.ok && d.settings.round, JSON.stringify(d)); return `제 ${d.settings.round}차 · 처음 만난 날 ${d.settings.start_date || '(미설정)'} · 푸시키 ${d.vapidPublicKey ? '있음' : '없음'}`; });
await check('메뉴 목록 (메모 칸)', async () => { const { d } = await api('/api/menus'); assert(d.ok && Array.isArray(d.menus), 'menus'); return `${d.menus.length}개`; });
await check('의결서 목록', async () => { const { d } = await api('/api/responses'); assert(d.ok, 'responses'); return `${d.responses.length}건`; });
await check('거리 조회 (좌표 비공개)', async () => { const { d } = await api('/api/location'); assert(d.ok && !JSON.stringify(d).includes('"lat"'), '좌표 노출'); return d.km == null ? '한 명만 위치 저장됨' : `${d.km}km`; });
await check('편지함', async () => { const { d } = await api('/api/letters'); assert(d.ok, 'letters'); return `${d.letters.length}통`; });
await check('힌트 우체통 목록', async () => { const { d } = await api('/api/hints?avatar=girl'); assert(d.ok && Array.isArray(d.hints), 'hints'); return `${d.hints.length}통 (안 읽음 ${d.unread})`; });
await check('없는 주소는 404', async () => { const { status } = await api('/api/nope'); assert(status === 404, status); });
await check('비밀값 없는 예약·관리 호출 차단', async () => {
  assert((await api('/api/cron/letter', { method: 'POST' })).status === 401, 'cron');
  assert((await api('/api/cron/hint', { method: 'POST' })).status === 401, 'cron hint');
  assert((await api('/api/admin/deploy', { method: 'POST', body: { phase: 'start' } })).status === 401, 'admin');
});

// ---- Gemini (실제 키, --ai 일 때만) ----
if (AI) {
if (LOCAL) { // 로컬은 편지 받을 사람 위치를 먼저 넣어둠
  await api('/api/location', { method: 'POST', body: { avatar: 'girl', name: '지민', area: '서울특별시 하늘구', lat: 37.48, lng: 126.99 } });
}
await check('Gemini 레시피 채팅 #1', async () => {
  const { status, d } = await api('/api/recipes/chat', { method: 'POST', body: { messages: [{ role: 'user', text: '둘이 먹기 좋은 간단한 파스타 추천' }], profileAvatar: LOCAL ? 'girl' : '' } });
  assert(status === 200 && d.text, d?.error || status); assert(d.recipe?.title && d.recipe.ingredients && d.recipe.steps, '레시피 카드 없음');
  return `"${d.recipe.title}" · 재료 ${d.recipe.ingredients.split('\n').length}개 · 단계 ${d.recipe.steps.split('\n').length}개`;
});
await check('Gemini 레시피 채팅 #2 (이어 묻기)', async () => {
  const { status, d } = await api('/api/recipes/chat', { method: 'POST', body: { messages: [
    { role: 'user', text: '비 오는 날 얼큰한 국물 요리' }, { role: 'model', text: '얼큰 수제비 어때?' }, { role: 'user', text: '좋아! 그거 2인분 레시피 알려줘' }] } });
  assert(status === 200 && d.recipe?.title, d?.error || status);
  return `"${d.recipe.title}" ${d.recipe.servings || '?'}인분`;
});
await check('Gemini 요리 아닌 질문 처리', async () => {
  const { status, d } = await api('/api/recipes/chat', { method: 'POST', body: { messages: [{ role: 'user', text: '오늘 기분 어때?' }] } });
  assert(status === 200 && d.text, d?.error || status); return d.recipe ? '레시피 카드 생성됨(허용)' : '카드 없이 짧게 답함';
});
await check('Gemini 매일 편지 미리보기 (날씨+시+말투)', async () => {
  const { status, d } = await api('/api/cron/letter?dry=1', { method: 'POST', headers: { 'x-cron-secret': CRON } });
  assert(status === 200, d?.error || status);
  const made = d.results.filter((r) => r.letter);
  assert(made.length, '편지 대상 없음 (위치 저장된 사람 없음)');
  const l = made[0].letter;
  assert(l.body.length > 20 && l.poem_text && l.fortune?.text, '브리핑/운세/시 없음');
  return made.map((r) => `${r.toAvatar}: ${r.letter.weather.label} · 🥠 ${r.letter.fortune.text.slice(0, 30)} · 「${r.letter.poem_title}」`).join(' / ');
});

} else results.push('⏭️ Gemini 검사 건너뜀 (하루 사용량 아끼기 · 필요하면 --ai)');

// ---- 쓰기 ----
await check('레시피 만들기→수정→삭제', async () => {
  const c = await api('/api/recipes', { method: 'POST', body: { title: '🧪 검증용 레시피', category: '기타', minutes: 5, servings: 1, ingredients: '물', steps: '1. 끓인다' } });
  assert(c.status === 201, c.d?.error || c.status);
  const id = c.d.recipe.id;
  const u = await api(`/api/recipes/${id}`, { method: 'PATCH', body: { favorite: true } }); assert(u.d.recipe.favorite, '즐겨찾기 실패');
  const bad = await api(`/api/recipes/${id}`, { method: 'PATCH', body: { image_full: 'data:text/html;base64,AA' } }); assert(bad.status === 400, '잘못된 사진 허용됨');
  const g = await api(`/api/recipes/${id}`); assert(g.d.recipe.steps, '상세 없음');
  const del = await api(`/api/recipes/${id}`, { method: 'DELETE' }); assert(del.status === 200, '삭제 실패');
  assert((await api(`/api/recipes/${id}`)).status === 404, '삭제 후 남아있음');
});

if (LOCAL) {
  await check('[로컬] 메뉴 추가(메모)→수정→삭제', async () => {
    const c = await api('/api/menus', { method: 'POST', body: { name: '검증 메뉴', memo: '덜 맵게' } }); assert(c.d.menu.memo === '덜 맵게', 'memo');
    const u = await api(`/api/menus/${c.d.menu.id}`, { method: 'PATCH', body: { name: '검증 메뉴2', memo: '' } }); assert(u.d.menu.name === '검증 메뉴2', 'patch');
    assert((await api(`/api/menus/${c.d.menu.id}`, { method: 'DELETE' })).status === 200, 'delete');
  });
  await check('[로컬] 설정 저장 (처음 만난 날)', async () => {
    const { d } = await api('/api/settings', { method: 'PUT', body: { dday: '2026-11-27T10:00:00Z', place: '우리집', round: 3, start_date: '2025-03-01' } });
    assert(d.settings.start_date === '2025-03-01', JSON.stringify(d));
  });
  await check('[로컬] 위치 2명 → 거리·최대거리', async () => {
    await api('/api/location', { method: 'POST', body: { avatar: 'girl', name: '지민', area: '서울특별시 하늘구', lat: 37.48, lng: 126.99 } });
    const a = await api('/api/location', { method: 'POST', body: { avatar: 'boy', name: '준호', area: '대구광역시 달빛구', lat: 35.87, lng: 128.6 } });
    const b = await api('/api/location', { method: 'POST', body: { avatar: 'boy', name: '준호', area: '대전광역시 별빛구', lat: 36.36, lng: 127.36 } });
    assert(a.d.km > 300 && b.d.km < a.d.km && b.d.maxKm >= a.d.km, JSON.stringify(b.d));
    return `바닷가 ${a.d.km}km → 대전 ${b.d.km}km (최대 ${b.d.maxKm}km 유지)`;
  });
  await check('[로컬] 의결서 복수 메뉴 등록→삭제', async () => {
    const c = await api('/api/responses', { method: 'POST', body: { foods: ['A', 'B'], message: 'hi', sticker: '💖', profileName: '지민', profileAvatar: 'girl' } });
    assert(c.d.response.food === 'A · B', c.d.response.food);
    assert((await api(`/api/responses/${c.d.response.id}`, { method: 'DELETE' })).status === 200, 'delete');
  });
  await check('[로컬] 매일 편지 실제 저장·편지함 조회', async () => {
    const { d } = await api('/api/cron/letter', { method: 'POST', headers: { 'x-cron-secret': CRON } });
    const id = d.results.find((r) => r.id)?.id; assert(id, JSON.stringify(d));
    const l = await api(`/api/letters/${id}`); assert(l.d.letter.body, 'letter');
    return `${d.results.length}통 저장`;
  });
  await check('[로컬] 힌트 우체통 (채팅 기록 → 17시 까치 힌트 → 읽음)', async () => {
    for (const q of ['오늘 너무 피곤해 달달한 디저트 뭐 만들까', '초코 브라우니 쉽게 만드는 법']) {
      const r = await api('/api/recipes/chat', { method: 'POST', body: { messages: [{ role: 'user', text: q }], profileAvatar: 'girl', profileName: '지민' } });
      assert(r.status === 200, r.d?.error || r.status);
    }
    const dry = await api('/api/cron/hint?dry=1', { method: 'POST', headers: { 'x-cron-secret': CRON } });
    const h = dry.d.results.find((x) => x.hint)?.hint; assert(h && /짹짹-!$/.test(h.evidence), JSON.stringify(dry.d));
    for (const old of (await api('/api/hints?avatar=boy')).d.hints) await api(`/api/hints/${old.id}`, { method: 'DELETE' }); // 이전 검증 기록 정리
    const real = await api('/api/cron/hint', { method: 'POST', headers: { 'x-cron-secret': CRON } });
    const id = real.d.results.find((x) => x.id)?.id; assert(id, JSON.stringify(real.d));
    const again = await api('/api/cron/hint', { method: 'POST', headers: { 'x-cron-secret': CRON } });
    assert(again.d.results.some((x) => x.skipped === '오늘 이미 보냄'), '하루 두 번 보냄');
    const before = await api('/api/hints?avatar=boy'); assert(before.d.unread >= 1, 'unread');
    await api(`/api/hints/${id}`, { method: 'PATCH', body: {} });
    const after = await api('/api/hints?avatar=boy'); assert(after.d.unread === before.d.unread - 1, 'read');
    assert((await api('/api/hints?avatar=girl')).d.hints.every((x) => x.to_avatar === 'girl'), '받는 사람 섞임');
    return `"${h.title}" / ${h.evidence}`;
  });
  await check('[로컬] 배포 안내 켜기→끄기', async () => {
    const h = { 'x-admin-token': process.env.LOCAL_ADMIN_TOKEN || 'localadmin' };
    await api('/api/admin/deploy', { method: 'POST', headers: h, body: { phase: 'start' } });
    assert((await api('/api/status')).d.maintenance === true, 'on');
    await api('/api/admin/deploy', { method: 'POST', headers: h, body: { phase: 'failed' } });
    assert((await api('/api/status')).d.maintenance === false, 'off');
  });
}

console.log(`\n검증 대상: ${BASE}\n` + results.join('\n') + `\n\n통과 ${pass} / 실패 ${failN}`);
process.exit(failN ? 1 : 0);
