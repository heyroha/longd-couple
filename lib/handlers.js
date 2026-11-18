// API 처리 (로컬 server.js 와 Vercel api/router.js 가 같이 사용)
const path = require('path');
const crypto = require('crypto');
const { createStore } = require('./store');
const push = require('./push');
const gemini = require('./gemini');
const photos = require('./photos');
const letters = require('./letter');
const hints = require('./hint');

const store = createStore(path.join(__dirname, '..', 'data'));
const VERSION = process.env.VERCEL_GIT_COMMIT_SHA || process.env.APP_VERSION || 'local';

// =====================================================================
// 공통
// =====================================================================
function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
const ok = (res, body = {}, status = 200) => sendJson(res, status, { ok: true, ...body });
const fail = (res, status, error) => sendJson(res, status, { ok: false, error });

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

async function readJson(req, limit = 16 * 1024) {
  try {
    // Vercel은 req.body를 미리 파싱해 줌, 로컬 서버는 스트림에서 직접 읽음
    if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    return JSON.parse(await readBody(req, limit));
  } catch {
    return null;
  }
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const avatarOf = (v) => (v === 'boy' || v === 'girl' ? v : '');
// 받침 있으면 a(이/을), 없으면 b(가/를) — 마지막 한글 글자 기준 (이모지·영문 무시)
function josa(word, a, b) {
  const ch = [...String(word)].reverse().find((c) => c >= '가' && c <= '힣');
  if (!ch) return `${a}(${b})`;
  return (ch.charCodeAt(0) - 0xac00) % 28 ? a : b;
}
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// 등록 내역에 기기 이름 (프로필 없을 때 대신 표시)
function deviceLabel(ua = '') {
  if (/SM-F9\d\d/i.test(ua)) return '갤럭시 Z폴드';
  if (/SM-F7\d\d/i.test(ua)) return '갤럭시 Z플립';
  if (/iPhone/i.test(ua)) return '아이폰';
  if (/iPad/i.test(ua)) return '아이패드';
  if (/Android/i.test(ua)) return /SM-/i.test(ua) ? '갤럭시' : '안드로이드';
  if (/Macintosh/i.test(ua)) return '맥';
  if (/Windows/i.test(ua)) return 'PC';
  return '';
}

// =====================================================================
// 설정 (디데이 · 장소 · 회차 · 처음 만난 날)
// =====================================================================
const DEFAULT_PLACE = '우리집 (별빛)';
const DEFAULT_ROUND = 3;
// 앱 주인(문의함을 보는 사람 · 배포 알림 받는 사람). 상대방 앱에는 "문의하기"가 보임
const OWNER_AVATAR = process.env.OWNER_AVATAR === 'boy' ? 'boy' : 'girl';

// 설정이 없을 때: 이번 달 마지막 금요일 저녁 7시(한국 시간), 이미 지났으면 다음 달
function defaultDday(now = new Date()) {
  const KST = 9 * 60 * 60 * 1000;
  const k = new Date(now.getTime() + KST);
  for (let add = 0; add < 3; add++) {
    const last = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + add + 1, 0, 19, 0));
    last.setUTCDate(last.getUTCDate() - ((last.getUTCDay() - 5 + 7) % 7));
    const utc = new Date(last.getTime() - KST);
    if (utc > now) return utc.toISOString();
  }
  return new Date(now.getTime() + 14 * 864e5).toISOString();
}

async function rawSettings() {
  try { return (await store.getSettings()) || {}; } catch (e) { console.error('[설정 읽기 실패]', e.message); return {}; }
}

async function currentSettings() {
  const s = await rawSettings();
  return {
    dday: s.dday || defaultDday(),
    place: s.place || DEFAULT_PLACE,
    round: Number(s.round) || DEFAULT_ROUND,
    start_date: s.start_date || '',
    profiles: s.profiles && typeof s.profiles === 'object' ? s.profiles : {},
    owner: OWNER_AVATAR,
    saved: Boolean(s.place),
  };
}

// 설정 저장 시 기존 칸(max_km, style_cards 등)을 지우지 않도록 합쳐서 저장
async function patchSettings(patch) {
  const s = await rawSettings();
  const base = {
    dday: s.dday || defaultDday(),
    place: s.place || DEFAULT_PLACE,
    round: Number(s.round) || DEFAULT_ROUND,
  };
  return store.saveSettings({ ...base, ...patch });
}

// =====================================================================
// 메뉴 (안건 02) — 이름 + 요청사항 메모
// =====================================================================
async function handleMenus(req, res, id) {
  if (!id && req.method === 'GET') return ok(res, { menus: await store.listMenus() });

  // 순서 바꾸기 { ids: [...] }
  if (id === 'order' && req.method === 'PUT') {
    const body = await readJson(req);
    const ids = (Array.isArray(body?.ids) ? body.ids : []).map((x) => str(x, 64)).filter(Boolean).slice(0, 100);
    if (!ids.length) return fail(res, 400, '순서 정보가 없어요.');
    await store.reorderMenus(ids);
    return ok(res, { menus: await store.listMenus() });
  }

  if (req.method === 'POST' || req.method === 'PATCH') {
    const body = await readJson(req);
    const name = str(body?.name, 40);
    if (!name) return fail(res, 400, '메뉴 이름을 적어주세요.');
    const memo = str(body?.memo, 100);
    if (!id && req.method === 'POST') {
      const kind = body.kind === 'drink' ? 'drink' : 'food';
      const menu = await store.addMenu(name, memo, kind);
      console.log(`[메뉴 추가] ${name}${memo ? ` (메모: ${memo})` : ''}`);
      return ok(res, { menu }, 201);
    }
    if (id) {
      const menu = await store.updateMenu(id, { name, memo });
      return menu ? ok(res, { menu }) : fail(res, 404, '이미 삭제된 메뉴예요.');
    }
  }

  if (id && req.method === 'DELETE') {
    return (await store.deleteMenu(id)) ? ok(res) : fail(res, 404, '이미 삭제된 메뉴예요.');
  }
  return fail(res, 405, '허용되지 않는 요청');
}

// =====================================================================
// 의결서
// =====================================================================
async function handleResponses(req, res, id) {
  if (id) {
    if (req.method !== 'DELETE') return fail(res, 405, '허용되지 않는 요청');
    return (await store.deleteResponse(id)) ? ok(res) : fail(res, 404, '이미 삭제된 의결서예요.');
  }

  if (req.method === 'GET') return ok(res, { responses: await store.listResponses() });

  if (req.method === 'POST') {
    const body = await readJson(req);
    if (!body) return fail(res, 400, '잘못된 요청이에요.');
    // 여러 메뉴 선택 가능 → foods 배열, 예전 앱은 food 문자열
    const foods = (Array.isArray(body.foods) ? body.foods : [body.food]).map((f) => str(f, 40)).filter(Boolean).slice(0, 10);
    if (!foods.length) return fail(res, 400, '메뉴를 골라주세요.');
    const drinks = (Array.isArray(body.drinks) ? body.drinks : []).map((f) => str(f, 40)).filter(Boolean).slice(0, 10);
    const { round } = await currentSettings();
    const row = await store.addResponse({
      attend: true,
      food: foods.join(' · '),
      ...(drinks.length ? { drinks: drinks.join(' · ') } : {}),
      message: str(body.message, 300),
      sticker: str(body.sticker, 8),
      no_attempts: int(body.noAttempts, 0, 999) || 0,
      device: deviceLabel(req.headers['user-agent']),
      round,
      profile_name: str(body.profileName, 12),
      profile_avatar: avatarOf(body.profileAvatar),
    });
    console.log(`[의결서 등록] 제${round}차 ${row.profile_name || row.device} 메뉴=${row.food}`);

    const msg = row.message ? ` · "${row.message.slice(0, 40)}"` : '';
    const pushResult = await push
      .notifyAll(store, {
        title: row.profile_name ? `💌 ${row.profile_name}님의 의결서 도착!` : `💌 제 ${round}차 월례 의결서 도착!`,
        body: `제 ${round}차 · ${row.food}${row.drinks ? ` + ${row.drinks}` : ''}${msg} ${row.sticker}`.trim(),
        url: '/?view=history',
        tag: `response-${row.id}`,
      }, str(body.endpoint, 1000), '', `${row.profile_name || row.device} 제${round}차 의결서 등록`)
      .catch((e) => (console.error('[푸시 실패]', e.message), { sent: 0 }));

    return ok(res, { response: row, notified: pushResult.sent }, 201);
  }
  return fail(res, 405, '허용되지 않는 요청');
}

// =====================================================================
// 설정 API
// =====================================================================
async function handleSettings(req, res) {
  if (req.method === 'GET') return ok(res, { settings: await currentSettings(), vapidPublicKey: push.publicKey() });

  if (req.method === 'PUT') {
    const body = await readJson(req);
    if (!body) return fail(res, 400, '잘못된 요청이에요.');
    const dday = new Date(body.dday);
    if (isNaN(dday)) return fail(res, 400, '날짜를 확인해주세요.');
    const place = str(body.place, 60);
    if (!place) return fail(res, 400, '장소를 적어주세요.');
    const round = int(body.round, 1, 999);
    if (!round) return fail(res, 400, '회차는 1~999 사이로 적어주세요.');
    const start = str(body.start_date, 10);
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return fail(res, 400, '처음 만난 날을 확인해주세요.');

    await patchSettings({ dday: dday.toISOString(), place, round, start_date: start || null });
    console.log(`[설정 저장] 제${round}차 · ${dday.toISOString()} · ${place} · 시작 ${start || '-'}`);
    return ok(res, { settings: await currentSettings() });
  }
  return fail(res, 405, '허용되지 않는 요청');
}

// =====================================================================
// 프로필 (두 사람 공유) — 이름을 바꾸면 예전 의결서·위치·알림 기기 이름도 같이 바뀜
// =====================================================================
async function handleProfile(req, res) {
  if (req.method === 'GET') return ok(res, { profiles: (await currentSettings()).profiles });
  if (req.method !== 'PUT') return fail(res, 405, '허용되지 않는 요청');
  const body = await readJson(req);
  const avatar = avatarOf(body?.avatar);
  const name = str(body?.name, 12);
  if (!avatar || !name) return fail(res, 400, '이름과 캐릭터(男/女)를 정해주세요.');
  const s = await rawSettings();
  if (!('profiles' in s) && store.kind === 'supabase') {
    return fail(res, 503, '서버 준비 중이에요 (Supabase에 migration_005 SQL 실행 필요).');
  }
  const profiles = { ...(s.profiles || {}), [avatar]: { name, updated_at: new Date().toISOString() } };
  await patchSettings({ profiles });
  const renamed = await store.renameProfile(avatar, name, str(body.oldName, 12)).catch((e) => (console.error('[이름 동기화 실패]', e.message), 0));
  console.log(`[프로필] ${avatar} = ${name} (의결서 ${renamed}건 이름 반영)`);
  return ok(res, { profiles, renamed });
}

// =====================================================================
// 알림 구독
// =====================================================================
async function handlePush(req, res) {
  const body = await readJson(req);
  const endpoint = str(body?.endpoint, 1000);
  if (!/^https:\/\//.test(endpoint)) return fail(res, 400, '알림 구독 정보가 올바르지 않아요.');

  if (req.method === 'POST') {
    const p256dh = str(body.keys?.p256dh, 200);
    const auth = str(body.keys?.auth, 100);
    if (!p256dh || !auth) return fail(res, 400, '알림 구독 정보가 올바르지 않아요.');
    const who = str(body.profileName, 12) || deviceLabel(req.headers['user-agent']);
    await store.saveSubscription({ endpoint, p256dh, auth, device: who, avatar: avatarOf(body.profileAvatar) });
    return ok(res, {}, 201);
  }
  if (req.method === 'DELETE') {
    await store.deleteSubscription(endpoint);
    return ok(res);
  }
  return fail(res, 405, '허용되지 않는 요청');
}

// =====================================================================
// 우리 사이 거리 — 좌표는 약 1m 단위(소수점 5자리)로 저장, 화면·API에는 거리와 구·동만
// =====================================================================
function haversineKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function distanceInfo() {
  const rows = await store.listLocations().catch(() => []);
  const people = Object.fromEntries(rows.map((r) => [r.avatar, r]));
  const s = await rawSettings();
  const km = people.boy && people.girl ? Math.round(haversineKm(people.boy, people.girl) * 100) / 100 : null;
  let maxKm = Number(s.max_km) || 0;
  if (km != null && km > maxKm) {
    maxKm = km;
    await patchSettings({ max_km: km }).catch((e) => console.error('[최대 거리 저장 실패]', e.message));
  }
  const pub = (p) => p && { name: p.name, area: p.area || '', updated_at: p.updated_at };
  return { km, maxKm: maxKm || km, people: { boy: pub(people.boy), girl: pub(people.girl) } };
}

async function handleLocation(req, res) {
  if (req.method === 'GET') return ok(res, await distanceInfo());
  if (req.method === 'POST') {
    const body = await readJson(req);
    const avatar = avatarOf(body?.avatar);
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!avatar) return fail(res, 400, '프로필(男/女)을 먼저 정해주세요.');
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return fail(res, 400, '위치 정보가 올바르지 않아요.');
    await store.saveLocation({
      avatar,
      name: str(body.name, 12),
      area: str(body.area, 40),
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
    });
    return ok(res, await distanceInfo());
  }
  return fail(res, 405, '허용되지 않는 요청');
}

// =====================================================================
// 레시피 노트
// =====================================================================
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function recipeFields(body) {
  const r = {
    title: str(body.title, 60),
    category: str(body.category, 20),
    minutes: int(body.minutes, 0, 1440),
    servings: int(body.servings, 0, 50),
    ingredients: str(body.ingredients, 3000),
    steps: str(body.steps, 6000),
    memo: str(body.memo, 2000),
    favorite: Boolean(body.favorite),
    author: str(body.author, 12),
    source: str(body.source, 500),
  };
  if (typeof body.image_full === 'string') {
    // 갤러리 사진: 화면에서 줄여서 보냄. 빈 문자열이면 사진 삭제
    if (body.image_full && !DATA_URL.test(body.image_full)) throw new Error('사진 형식이 올바르지 않아요.');
    if (body.image_thumb && !DATA_URL.test(body.image_thumb)) throw new Error('사진 형식이 올바르지 않아요.');
    r.image_full = body.image_full;
    r.image_thumb = body.image_thumb || '';
    if (body.image_full) { r.image_url = ''; r.image_credit = ''; }
  }
  return r;
}

async function autoImage(title) {
  if (!photos.enabled || !title) return null;
  let query = title;
  if (gemini.enabled) {
    // 한국어 요리 이름 → 영어 검색어 (Pexels는 영어 검색이 정확)
    try {
      const { text } = await gemini.generate({
        temperature: 0,
        timeoutMs: 8000,
        system: 'Translate the Korean dish name into a short English search query for a food illustration (2-4 words, dish name only). Reply with the query only.',
        messages: [{ role: 'user', text: title }],
      });
      if (text && text.length < 60) query = text.replace(/["'\n]/g, '').trim();
    } catch (e) { console.error('[검색어 변환 실패]', e.message); }
  }
  return photos.findFoodImage(query).catch((e) => (console.error('[자동 이미지 실패]', e.message), null));
}

async function handleRecipes(req, res, id, action) {
  // 채팅으로 새 레시피 찾기
  if (id === 'chat' && req.method === 'POST') return handleRecipeChat(req, res);

  if (!id && req.method === 'GET') {
    const list = (await store.listRecipes()).map(({ image_full, steps, ...r }) => r); // 재료는 레시피 노트(재료 아이콘)에 씀
    return ok(res, { recipes: list, ai: gemini.enabled, autoImage: photos.enabled });
  }

  if (!id && req.method === 'POST') {
    const body = await readJson(req, 4 * 1024 * 1024);
    if (!body) return fail(res, 400, '잘못된 요청이에요. (사진이 너무 크면 다시 골라주세요)');
    let row;
    try { row = recipeFields(body); } catch (e) { return fail(res, 400, e.message); }
    if (!row.title) return fail(res, 400, '레시피 이름을 적어주세요.');
    if (!row.image_full) Object.assign(row, (await autoImage(row.title)) || {});
    const recipe = await store.addRecipe(row);
    console.log(`[레시피 추가] ${row.title}`);
    // 상대방에게 "○○가 ○○를 먹고 싶나봐요!" (쓴 기기는 제외)
    const av = avatarOf(row.author);
    const who = (av && (await currentSettings()).profiles[av]?.name) || (av ? '' : row.author);
    if (who) {
      const food = row.title.replace(/^[^\p{L}\p{N}]+/u, '').trim() || row.title;
      await push.notifyAll(store, {
        title: `🍽 ${who}${josa(who, '이', '가')} ${food}${josa(food, '을', '를')} 먹고 싶나봐요!`,
        body: '레시피 노트에 새 레시피가 올라왔어요',
        url: `/?view=recipe&id=${recipe.id}`,
        tag: `recipe-${recipe.id}`,
      }, str(body.endpoint, 1000), '', `${who}${josa(who, '이', '가')} 레시피 노트에 "${row.title}" 추가`).catch((e) => console.error('[레시피 알림 실패]', e.message));
    }
    return ok(res, { recipe }, 201);
  }

  if (id && action === 'auto-image' && req.method === 'POST') {
    const r = await store.getRecipe(id);
    if (!r) return fail(res, 404, '없는 레시피예요.');
    const img = await autoImage(r.title);
    if (!img) return fail(res, 404, photos.enabled ? '어울리는 그림을 못 찾았어요.' : '자동 그림(Pixabay) 키가 아직 없어요.');
    return ok(res, { recipe: await store.updateRecipe(id, { image_full: '', image_thumb: '', ...img }) });
  }

  if (id && req.method === 'GET') {
    const r = await store.getRecipe(id);
    return r ? ok(res, { recipe: r }) : fail(res, 404, '없는 레시피예요.');
  }

  if (id && req.method === 'PATCH') {
    const body = await readJson(req, 4 * 1024 * 1024);
    if (!body) return fail(res, 400, '잘못된 요청이에요.');
    let patch;
    try { patch = recipeFields(body); } catch (e) { return fail(res, 400, e.message); }
    // 보낸 칸만 수정
    for (const k of Object.keys(patch)) if (!(k in body) && !(k.startsWith('image_') && 'image_full' in body)) delete patch[k];
    if ('title' in patch && !patch.title) return fail(res, 400, '레시피 이름을 적어주세요.');
    // 작성자는 처음 쓴 사람 그대로 (상대방이 고쳐도 안 바뀜)
    if ('author' in patch) {
      const prev = await store.getRecipe(id);
      if (prev && prev.author) delete patch.author;
    }
    const r = await store.updateRecipe(id, patch);
    return r ? ok(res, { recipe: r }) : fail(res, 404, '없는 레시피예요.');
  }

  if (id && req.method === 'DELETE') {
    return (await store.deleteRecipe(id)) ? ok(res) : fail(res, 404, '이미 삭제된 레시피예요.');
  }
  return fail(res, 405, '허용되지 않는 요청');
}

async function styleCardFor(avatar) {
  const s = await rawSettings();
  return (s.style_cards || {})[avatar] || null;
}

async function handleRecipeChat(req, res) {
  if (!gemini.enabled) return fail(res, 503, 'AI 검색 키(Gemini)가 아직 연결되지 않았어요.');
  const body = await readJson(req, 64 * 1024);
  const history = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-12)
    .map((m) => ({ role: m.role === 'model' ? 'model' : 'user', text: str(m.text, 2000) }))
    .filter((m) => m.text);
  if (!history.length || history[history.length - 1].role !== 'user') return fail(res, 400, '궁금한 요리를 적어주세요.');

  // 말투: 질문한 사람의 상대방 말투로 답함
  const me = avatarOf(body.profileAvatar);
  const partner = me ? letters.OTHER[me] : '';
  const card = partner ? await styleCardFor(partner) : null;
  const tone = card?.samples?.length
    ? `말투는 아래 예시처럼 해:\n- ${card.samples.slice(0, 10).join('\n- ')}\n`
    : '말투는 다정한 연인처럼 반말로, 짧고 귀엽게.\n';

  try {
    const { text, sources } = await gemini.generate({
      search: true,
      temperature: 0.7,
      system:
        '너는 커플 앱 "롱디\'s 월례"의 레시피 도우미야. 집에서 둘이 해 먹기 좋은 레시피를 찾아준다. ' + tone +
        '답변 형식: 먼저 3~6문장으로 레시피를 소개하고 핵심 팁을 알려줘. ' +
        '그 다음 반드시 ```json 코드블록에 {"title":"요리 이름","category":"한식/양식/일식/중식/디저트/기타 중 하나",' +
        '"minutes":조리 분(숫자),"servings":인분(숫자),"ingredients":["재료 분량",...],"steps":["1단계",...]} 를 넣어. ' +
        '요리와 관계없는 질문이면 json 없이 짧게 답해.',
      messages: history,
    });
    const recipe = gemini.extractJson(text);
    const answer = text.replace(/```(?:json)?[\s\S]*?```/g, '').trim();
    const clean = recipe?.title
      ? {
          title: str(recipe.title, 60),
          category: str(recipe.category, 20),
          minutes: int(recipe.minutes, 0, 1440),
          servings: int(recipe.servings, 0, 50),
          ingredients: (recipe.ingredients || []).map((x) => str(String(x), 100)).join('\n'),
          steps: (recipe.steps || []).map((x, i) => `${i + 1}. ${str(String(x), 300).replace(/^\d+[.)]\s*/, '')}`).join('\n'),
        }
      : null;
    // 우체통용 기록 (누가 무엇을 찾았는지)
    if (me) {
      await store.addChat({
        avatar: me,
        name: str(body.profileName, 12),
        question: history[history.length - 1].text.slice(0, 500),
        answer: answer.slice(0, 1500),
        recipe_title: clean?.title || '',
      }).catch((e) => console.error('[채팅 기록 실패]', e.message));
    }
    return ok(res, { text: answer, recipe: clean, sources });
  } catch (e) {
    console.error('[레시피 채팅 실패]', e.message);
    const busy = e.quota || /429|quota|exhausted/i.test(e.message);
    return fail(res, busy ? 429 : 502, busy ? '오늘 쓸 토큰을 다 썼어ㅠㅠ 내일 12시가 넘으면 다시 시도해줘!' : '검색이 잠깐 안 돼요. 잠시 후 다시 해줘!');
  }
}

// =====================================================================
// 상대랑 대화하기 (Beta): LastTalk 방식 — 상대의 말투 예시·이야기를 AI에게 주고 그 사람처럼 대답
// - 내가 여기서 한 말 → 내 말투 예시(samples)와 나에 대한 이야기(facts)로 쌓임 (town_layout 'talk_boy|girl')
// - 상대가 '나랑 대화하기'를 하면 그 기록으로 나처럼 대답함 (서로 배워서 서로의 창에 적용)
// =====================================================================
const TALK_MAX_SAMPLES = 160, TALK_MAX_FACTS = 80;
async function talkMemory(avatar) {
  const row = await store.getTownRow(`talk_${avatar}`).catch(() => null);
  let d = row?.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  return { samples: Array.isArray(d?.samples) ? d.samples : [], facts: Array.isArray(d?.facts) ? d.facts : [], n: Number(d?.n) || 0 };
}
const talkSampleOk = (t) => t.length >= 2 && t.length <= 120 && !/https?:|www\.|\d{3,}[-\s]?\d{3,}|@\w+\./i.test(t);
async function learnTalk(avatar, line, facts) {
  const mem = await talkMemory(avatar);
  const t = line.replace(/\s+/g, ' ').trim();
  if (talkSampleOk(t) && !mem.samples.includes(t)) mem.samples.push(t);
  for (const f of facts) { const x = str(String(f), 80); if (x && !mem.facts.some((y) => y === x)) mem.facts.push(x); }
  mem.samples = mem.samples.slice(-TALK_MAX_SAMPLES); mem.facts = mem.facts.slice(-TALK_MAX_FACTS); mem.n += 1;
  await store.saveTownRow(`talk_${avatar}`, JSON.stringify({ ...mem, at: new Date().toISOString() }));
  return mem;
}
const pickSome = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };

// 카톡 대화 전체 (tools/kakao_corpus.py → town_layout 'kakao_corpus'). 줄마다 맨 앞 글자 b(男)/g(女) + 내용
let corpusCache = { at: 0, data: null };
async function kakaoCorpus() {
  if (Date.now() - corpusCache.at < 10 * 60e3) return corpusCache.data;
  const row = await store.getTownRow('kakao_corpus').catch(() => null);
  let d = row?.data; if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (d && Array.isArray(d.sessions)) {
    const W = 28, step = 14; d.chunks = [];
    const timed = d.v >= 2; // v2: 줄 = b/g + 보낸 시각 HHMM + 내용
    d.sessions.forEach((s, si) => {
      for (let i = 0; i < s.length; i += step) {
        const c = s.slice(i, i + W);
        if (c.length >= 6) d.chunks.push({ day: d.days?.[si] || '', lines: c.map((l) => ({ who: l[0], hm: timed ? l.slice(1, 5) : '----', text: timed ? l.slice(5) : l.slice(1) })) });
        if (i + W >= s.length) break;
      }
    });
    d.text = d.chunks.map((c) => c.lines.map((l) => l.text).join(' '));
  } else d = null;
  corpusCache = { at: Date.now(), data: d };
  return d;
}
// 지금 얘기와 겹치는 단어가 많은 실제 대화 구간 4개 + 아무 구간 4개 (상대가 말을 충분히 한 구간만)
const bigrams = (t) => { const out = new Set(); for (const w of t.match(/[가-힣]{2,}/g) || []) for (let i = 0; i < w.length - 1; i++) out.add(w.slice(i, i + 2)); return out; };
function corpusChunks(corpus, query, partner) {
  const c = partner === 'boy' ? 'b' : 'g';
  const idx = corpus.chunks.map((_, i) => i).filter((i) => corpus.chunks[i].lines.filter((l) => l.who === c).length >= 5);
  const q = [...bigrams(query)];
  const scored = q.length ? idx.map((i) => [i, q.reduce((n, b) => n + (corpus.text[i].includes(b) ? 1 : 0), 0)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]) : [];
  const pick = [];
  for (const [i] of scored) { if (pick.length >= 4) break; if (!pick.some((j) => Math.abs(j - i) < 2)) pick.push(i); }
  // 지금과 비슷한 시간대(±1시간) · 같은 평일/주말 구간 2개 — 이 시간에 보통 뭐 하는지
  const { hour, weekend } = talkNow();
  const near = idx.filter((i) => { const ch = corpus.chunks[i]; const h = Number(ch.lines[0].hm.slice(0, 2)); if (ch.lines[0].hm === '----' || !ch.day) return false;
    const we = [0, 6].includes(new Date(ch.day + 'T12:00:00Z').getUTCDay()); return we === weekend && Math.min(Math.abs(h - hour), 24 - Math.abs(h - hour)) <= 1; });
  for (const i of pickSome(near, 6)) { if (pick.length >= 6) break; if (!pick.includes(i)) pick.push(i); }
  for (const i of pickSome(idx, 12)) { if (pick.length >= 8) break; if (!pick.includes(i)) pick.push(i); }
  return pick.map((i) => corpus.chunks[i]);
}
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function talkNow() {
  const d = new Date(Date.now() + 9 * 3600e3);
  const day = d.getUTCDay();
  return { d, hour: d.getUTCHours(), weekend: day === 0 || day === 6,
    label: `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEK[day]}) ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` };
}

async function handleTalk(req, res, action) {
  const body = req.method === 'POST' ? await readJson(req, 64 * 1024) : null;
  const q = new URL(req.url, 'http://x').searchParams;
  const me = avatarOf(body?.profileAvatar || q.get('avatar'));
  if (!me) return fail(res, 400, '프로필(男/女)을 먼저 골라주세요.');
  const partner = letters.OTHER[me];
  const { profiles } = await currentSettings();
  const meName = profiles[me]?.name || (me === 'girl' ? '지민' : '준호');
  const pName = profiles[partner]?.name || (partner === 'girl' ? '지민' : '준호');

  // 얼마나 배웠는지 (화면 위 작은 안내)
  if (action === 'stat' && req.method === 'GET') {
    const [pm, mm] = await Promise.all([talkMemory(partner), talkMemory(me)]);
    const [card, corpus] = await Promise.all([styleCardFor(partner), kakaoCorpus()]);
    const kakao = corpus?.stats?.[partner]?.messages || (card?.samples?.length || 0) + (card?.pairs?.length || 0);
    return ok(res, { partner: { samples: pm.samples.length, facts: pm.facts.length, kakao }, me: { samples: mm.samples.length, facts: mm.facts.length } });
  }
  if (action !== 'chat' || req.method !== 'POST') return fail(res, 405, '허용되지 않는 요청');
  if (!gemini.enabled) return fail(res, 503, 'AI 키(Gemini)가 아직 연결되지 않았어요.');
  const history = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-16)
    .map((m) => ({ role: m.role === 'model' ? 'model' : 'user', text: str(m.text, 1000) }))
    .filter((m) => m.text);
  if (!history.length || history[history.length - 1].role !== 'user') return fail(res, 400, '하고 싶은 말을 적어주세요.');

  const [pm, mm, card, corpus] = await Promise.all([talkMemory(partner), talkMemory(me), styleCardFor(partner), kakaoCorpus()]);
  const ps = corpus?.stats?.[partner];
  const parts = [
    `너는 "${pName}"이야. 지금 연인 "${meName}"이랑 카톡하고 있어. AI가 아니라 ${pName} 본인처럼 대답해.`,
    `지금은 ${talkNow().label} (한국 시간)이야. "지금 뭐해", "몇 시에 ~해" 같은 말은 이 시각 기준으로 답해.`,
    '모르는 사실(일정·약속·실제로 한 일)은 지어내지 말고 대충 넘기거나 되물어. 위험하거나 진지한 고민이면 다정하게 들어주고 직접 얘기하자고 해.',
  ];
  if (ps) {
    const laugh = Object.entries(ps.laughPct || {}).map(([k, v]) => `${k.repeat(2)}… ${Math.round(v)}%`).join(', ');
        parts.push([
      `${pName}의 실제 카톡 습관 (메시지 ${ps.messages}개 통계, 꼭 지켜):`,
      `- 말풍선 하나는 보통 ${ps.lenMedian}자 안팎, 길어도 ${ps.len90}자. 문장을 길게 이어 쓰지 말고 짧게 끊어.`,
      `- 한 번에 보내는 말풍선 수: ${Object.entries(ps.bubbles || {}).map(([k, v]) => `${k}${k === '5' ? '개 이상' : '개'} ${Math.round(v)}%`).join(', ')}. 매번 여러 개 보내지 말고 이 비율대로 섞어. 말풍선마다 줄을 바꿔서 써 (줄 하나 = 말풍선 하나, 최대 4줄).`,
      `- 이모지는 메시지 100개 중 ${ps.emojiPct < 1 ? '1개도 안 되게' : `${Math.round(ps.emojiPct)}개 정도`}만 써. 거의 안 쓰는 거야.${ps.emojiTop?.length ? ` 쓸 땐 ${ps.emojiTop.slice(0, 3).join(' ')} 중에서.` : ''}`,
      laugh ? `- 웃음·울음은 메시지 중 ${laugh} 비율로만. 매 줄마다 붙이지 마.` : '',
      ps.yoPct != null ? `- 기본은 반말. "~요"로 끝내는 건 메시지 100개 중 ${Math.round(ps.yoPct)}개 정도만. 마침표로 끝내는 건 ${Math.round(ps.periodPct)}개 정도만.` : '',
      '- 말끝·감탄사·맞장구는 아래 실제 대화에서 그대로 가져와 쓰되, 같은 말끝을 연달아 반복하지 마.',
    ].filter(Boolean).join('\n'));
    const rt = (ps.routine || []).map((r) => `- ${r.label}: ${[r.weekday && `평일 보통 ${r.weekday.mid} (${r.weekday.range})`, r.weekend && `주말 보통 ${r.weekend.mid} (${r.weekend.range})`].filter(Boolean).join(', ')}`);
    parts.push([
      `${pName}의 하루 시간 (카톡 보낸 시각으로 확인된 것만):`, ...rt,
      `- 위에 없는 시간(퇴근·출근 시각 등)은 아래 카톡의 [날짜]와 보낸 시각을 보고 실제로 그 말을 한 시각에서 판단해. 카톡에서 확인 안 되면 시각을 지어내지 말고 "아직 몰라~ 끝나면 연락할게"처럼 넘겨.`,
      '- 날짜·시각은 참고만 하고 대답에 "[날짜]"나 시각 표기를 따라 쓰지 마.',
    ].join('\n'));
    const lastUser = history.filter((m) => m.role === 'user').slice(-3).map((m) => m.text).join(' ');
    const chunks = corpusChunks(corpus, lastUser, partner);
    const nm = { b: partner === 'boy' ? pName : meName, g: partner === 'girl' ? pName : meName };
    const fmtDay = (d) => { if (!d) return ''; const [y, m, dd] = d.split('-').map(Number); return `[${m}/${dd} (${WEEK[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]})]\n`; };
    const fmt = (ch) => fmtDay(ch.day) + ch.lines.map((l) => `${l.hm !== '----' ? `${l.hm.slice(0, 2)}:${l.hm.slice(2)} ` : ''}${nm[l.who] || '?'}: ${l.text}`).join('\n');
    parts.push(`${meName}와 ${pName}가 실제로 나눈 카톡 일부 (줄 앞 숫자는 보낸 시각. ${pName}의 말투·리듬·호칭·맞장구만 그대로 따라 해. 이건 몇 달 전 지난 대화라서, 거기 나오는 일정·약속·아픈 일·가족 일·장소 같은 사건은 지금 일이 아니야. 지금 일처럼 꺼내거나 "~했다며"처럼 묻지 마. 지금 대화는 ${meName}가 방금 한 말에만 반응해):\n\n${chunks.map(fmt).join('\n\n---\n\n')}`);
  } else {
    parts.push(`${pName} 본인처럼 반말로, 짧게(1~3문장) 대답해. 설명조·존댓말·AI 같은 말투는 쓰지 마.`);
    if (card?.callsPartner?.length) parts.push(`${meName}을(를) 부르는 호칭: ${card.callsPartner.join(', ')}`);
    const pairs = (card?.pairs || []).filter((x) => x && x.q && x.a);
    if (pairs.length) parts.push(`실제로 주고받은 카톡 (${meName} → ${pName}의 답):\n${pickSome(pairs, 12).map((x) => `${meName}: ${String(x.q).replace(/\n/g, ' / ')}\n${pName}: ${String(x.a).replace(/\n/g, ' / ')}`).join('\n\n')}`);
  }
  // 여기서 쌓인 말 (카톡 이후 '대화하기'에서 한 말)
  if (pm.samples.length) parts.push(`${pName}가 최근 이 앱에서 한 말 (말투 참고용. 그대로 반복하거나 지금 일처럼 꺼내지 마):\n- ${pickSome(pm.samples, 15).join('\n- ')}`);
  if (pm.facts.length) parts.push(`${pName}(너)에 대해 알려진 것:\n- ${pm.facts.slice(-40).join('\n- ')}`);
  if (mm.facts.length) parts.push(`${meName}(상대)에 대해 알려진 것:\n- ${mm.facts.slice(-30).join('\n- ')}`);
  parts.push(`대답 뒤에 반드시 \`\`\`json 코드블록으로 {"facts":[...]} 를 붙여. facts 에는 방금 ${meName}의 마지막 말에서 새로 알게 된 ${meName}에 대한 사실(좋아하는 것·싫어하는 것·습관·계획·기분 등)을 "${meName}는 ~" 형태의 짧은 문장으로 0~3개. 없으면 빈 배열.`);

  try {
    const { text } = await gemini.generate({ temperature: 0.9, system: parts.join('\n\n'), messages: history });
    const j = gemini.extractJson(text);
    // 실제로는 마침표를 거의 안 찍는데 AI는 자주 찍어서, 실제 비율만큼만 남김
    const keepDot = (ps?.periodPct ?? 100) / 100;
    const reply = text.replace(/```(?:json)?[\s\S]*?```/g, '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4)
      .map((l) => (/[^.]\.$/.test(l) && Math.random() > keepDot ? l.slice(0, -1) : l)).join('\n') || 'ㅎㅎ';
    const facts = Array.isArray(j?.facts) ? j.facts.slice(0, 3) : [];
    await learnTalk(me, history[history.length - 1].text, facts).catch((e) => console.error('[대화 배우기 실패]', e.message));
    return ok(res, { text: reply.slice(0, 1500), learned: facts.length });
  } catch (e) {
    console.error('[대화하기 실패]', e.message);
    const busy = e.quota || /429|quota|exhausted/i.test(e.message);
    return fail(res, busy ? 429 : 502, busy ? '오늘 쓸 토큰을 다 썼어ㅠㅠ 내일 다시 얘기하자!' : '잠깐 연결이 안 돼요. 조금 뒤에 다시 말 걸어줘!');
  }
}

// =====================================================================
// 우체통 (매일 17:00, Supabase pg_cron 이 호출)
// 오늘 레시피 채팅을 1번 이상 한 사람 → 상대방에게 까치 힌트
// =====================================================================
async function sendDailyHints({ dry = false } = {}) {
  const { day, startIso } = hints.kstDay();
  const chats = await store.listChatsSince(startIso);
  const already = new Set((await store.hintsOfDay(day).catch(() => [])).map((h) => h.to_avatar));
  const { profiles } = await currentSettings();
  const results = [];
  for (const about of ['girl', 'boy']) {
    const searches = chats.filter((c) => c.avatar === about);
    const to = hints.OTHER[about];
    if (!searches.length) { results.push({ about, skipped: '오늘 검색 없음' }); continue; }
    if (already.has(to) && !dry) { results.push({ about, skipped: '오늘 이미 보냄' }); continue; }
    const aboutName = profiles[about]?.name || searches[searches.length - 1].name || (about === 'girl' ? '지민' : '준호');
    const toName = profiles[to]?.name || (to === 'girl' ? '지민' : '준호');
    const h = await hints.composeHint({ aboutName, toName, searches });
    const row = {
      day, to_avatar: to, about_avatar: about, about_name: aboutName, ...h,
      searches: searches.slice(0, 15).map((c) => ({ q: c.question.slice(0, 80), r: c.recipe_title, at: c.created_at })),
    };
    if (dry) { results.push({ about, hint: row }); continue; }
    const saved = await store.addHint(row);
    const sent = await push.notifyAll(store, {
      title: '🐦 우체통에 까치가 왔어요',
      body: h.title,
      url: '/?view=hints',
      tag: `hint-${saved.id}`,
    }, '', to, `17시 우체통: ${aboutName}의 오늘 레시피 검색 ${searches.length}건`).catch((e) => (console.error('[힌트 푸시 실패]', e.message), { sent: 0 }));
    results.push({ about, to, id: saved.id, notified: sent.sent });
  }
  console.log('[우체통]', JSON.stringify(results.map(({ hint, ...r }) => r)));
  return results;
}

// =====================================================================
// 우리 동네(픽셀 미니게임): 공동현관 · 도어락 비밀번호 확인
//  - 번호는 서버에만 있음 (브라우저 코드·응답에 안 나감). 힌트: 처음 만난 날
// =====================================================================
const TOWN_CODES = { lobby: process.env.TOWN_LOBBY_CODE || '1234', door: process.env.TOWN_DOOR_CODE || '123456' }; // 실제 번호는 .env 에만
const MART = require('./town-mart');
// ----- 우리 동네 공유 상태 (냉장고 · 집 조명 · 펫) : town_layout 표의 'state' 줄에 JSON 으로 -----
const PET_Q = [ // 하루 한 번 펫이 묻는 질문: 고른 답이 성향(E 외향 · N 직관 · F 감성 · P 자유)에 쌓임
  { q: '오늘 밖에서 가장 기억에 남는 소리는 뭐였어?', a: [['친구들 웃음소리', { E: 2, F: 1 }], ['빗소리', { E: -2, N: 1 }], ['처음 듣는 노래', { N: 2, P: 1 }]] },
  { q: '오늘 기분을 색깔로 말하면?', a: [['햇살 같은 노랑', { E: 1, F: 2 }], ['차분한 파랑', { F: -2, P: -1 }], ['몽글몽글 보라', { N: 2, F: 1 }]] },
  { q: '주말에 뭐 하고 싶어?', a: [['처음 가보는 곳 여행', { P: 2, E: 1 }], ['집에서 뒹굴뒹굴', { E: -2, P: 1 }], ['계획 세워서 맛집 투어', { P: -2, E: 1 }]] },
  { q: '속상한 일이 생기면 어떻게 해?', a: [['꼭 안아줘', { F: 2 }], ['해결 방법을 같이 찾아', { F: -2, N: -1 }], ['맛있는 거 먹으러 가', { E: 1, P: 1 }]] },
  { q: '나는 커서 뭐가 되면 좋겠어?', a: [['모두랑 친한 아이', { E: 2, F: 1 }], ['똑똑한 박사님', { F: -2, N: -1 }], ['꿈꾸는 예술가', { N: 2, F: 1 }]] },
  { q: '오늘 하루는 어땠어?', a: [['계획대로 착착!', { P: -2 }], ['즉흥적으로 신났어', { P: 2, E: 1 }], ['조용히 쉬었어', { E: -2 }]] },
  { q: '밤하늘을 보면 무슨 생각 나?', a: [['저 별엔 누가 살까', { N: 2 }], ['내일 할 일', { N: -2, P: -1 }], ['보고 싶은 사람', { F: 2 }]] },
];
const PET_CARE = { // 행동 → 친밀감 · 성향
  wipe: { g: 3, ax: { P: -1, N: -1 }, say: '뽀득뽀득 깨끗해졌어요 ✨' }, guitar: { g: 4, ax: { F: 1, E: 1 }, say: '기타 소리에 신나서 들썩들썩 🎵' },
  warm: { g: 3, ax: { F: 1, E: -1 }, say: '품어주니 따뜻해서 몽글몽글 💗' }, knock: { g: 2, ax: { E: 1 }, say: '톡톡! 안에서 톡톡 대답했어요' },
  talk: { g: 2, ax: { F: 1 }, say: '이야기를 듣고 좋아해요 💬' }, play: { g: 4, ax: { E: 1, P: 1 }, say: '신나게 놀았어요! 🎈' },
  sleep: { g: 2, ax: { P: -1, E: -1 }, say: '쿨쿨… 푹 재웠어요 🌙' },
};
const PET_FOOD = { red: { E: 2, P: 2 }, blue: { E: -2, F: -2 }, yellow: { F: 2, E: 1 }, purple: { N: 2, F: 1 } };
const kstNow = () => new Date(Date.now() + 9 * 3600e3);
const kstDay = () => kstNow().toISOString().slice(0, 10);
function petEvolve(p) {
  const days = Math.floor((Date.now() - Date.parse(p.born)) / 86400e3), a = p.ax, f = p.food;
  if (p.stage === 0 && days >= 3 && p.intimacy >= 30) {
    const sc = { pong: a.F + f.yellow, zzi: a.E + a.P + f.red, muk: -a.E - a.F + f.blue };
    p.line = Object.keys(sc).sort((x, y) => sc[y] - sc[x])[0]; p.form = p.line; p.stage = 1; return '알이 깨지고 아기가 태어났어요! 🐣';
  }
  if (p.stage === 1 && days >= 14 && p.intimacy >= 120) {
    p.form = { pong: a.N >= 0 ? 'lumi' : 'aqua', zzi: a.P >= 0 ? 'zephy' : 'pyro', muk: a.N < 0 ? 'golem' : 'nox' }[p.line]; p.stage = 2; return '쑥쑥 자라서 성장기가 됐어요! 🌱';
  }
  if (p.stage === 2 && days >= 38 && p.intimacy >= 300) {
    if (p.total >= 20 && p.dawn / p.total > 0.6) p.form = 'starfox';
    else { const sc = { solaris: a.E + a.F, chronicle: -a.P - a.F, mirage: a.N + a.F - a.E, boulder: a.P - a.E }; p.form = Object.keys(sc).sort((x, y) => sc[y] - sc[x])[0]; }
    p.stage = 3; return '완전히 다 자랐어요! 세상에 하나뿐인 모습이에요 🌟';
  }
  return '';
}
function petLog(p, text) { p.log = [...(p.log || []), { at: new Date().toISOString(), text }].slice(-40); }
const GIRL_POINTS = 1000000; // 지민 FRESH MART 시작 포인트
const TOWN_SCENES = new Set(['street', 'yunseul', 'beach', 'lobby', 'hall', 'home', 'jumak', 'mart']);
async function townState() {
  const row = await store.getTownRow('state').catch(() => null);
  let st = {}; try { st = JSON.parse(row?.data || '{}'); } catch {}
  const out = { fridge: {}, lights: true, pet: null, lamps: {}, ...st };
  out.points = { girl: GIRL_POINTS, ...(st.points || {}) };
  return out;
}
const presenceOut = (p) => p && { avatar: p.avatar, scene: p.scene, x: p.x, y: p.y, face: p.face, moving: p.moving, pose: p.pose, act: p.act, tv: p.tv, updated_at: p.updated_at };

async function handleTown(req, res, action) {
  if (req.method !== 'POST') return fail(res, 405, '허용되지 않는 요청');
  if (action === 'unlock') {
    const body = await readJson(req, 1024);
    const want = TOWN_CODES[body?.which];
    const code = typeof body?.code === 'string' ? body.code.slice(0, 20) : '';
    if (!want) return fail(res, 400, '어느 문인지 알려주세요.');
    const okay = safeEqual(code, want);
    if (!okay) await new Promise((r) => setTimeout(r, 400)); // 마구 누르기 늦추기
    return ok(res, { ok: okay });
  }
  if (action === 'presence') {
    // 내 위치를 저장하고 상대방 위치 + 새 채팅을 받아감 (0.6초마다)
    const b = await readJson(req, 4 * 1024);
    const me = avatarOf(b?.me);
    if (!me) return fail(res, 400, '내 캐릭터를 알려주세요.');
    if (b.offline === true) { // 나감: 마지막 보고 시각을 옛날로 → 상대 화면에서 바로 오프라인
      await store.savePresence({ avatar: me, moving: false, pose: '', updated_at: new Date(0).toISOString() });
      return ok(res);
    }
    const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 10) / 10 : 0);
    await store.savePresence({
      avatar: me, scene: TOWN_SCENES.has(b.scene) ? b.scene : 'street', x: num(b.x), y: num(b.y),
      face: ['up', 'down', 'left', 'right'].includes(b.face) ? b.face : 'down', moving: Boolean(b.moving),
      pose: ['sit', 'lie'].includes(b.pose) ? b.pose : '', act: str(b.act, 300), tv: str(b.tv, 100), updated_at: new Date().toISOString(),
    });
    const p = await store.getPresence(me === 'boy' ? 'girl' : 'boy');
    const fresh = p && Date.now() - Date.parse(p.updated_at) < 6000; // 0.6초마다 보고하므로 6초면 충분
    const since = typeof b.since === 'string' && !Number.isNaN(Date.parse(b.since)) ? b.since : new Date(Date.now() - 10 * 60e3).toISOString();
    const chats = await store.listTownChat(since).catch(() => []);
    await petReapSoon(); // 알 온기 0이면 하늘나라 (1분에 한 번만 확인)
    const rows = await store.listTownRows().catch(() => []);
    const at = (id) => rows.find((r) => r.id === id)?.updated_at || '';
    const layoutAt = at('home'), stateAt = at('state'), photosAt = at('fridge_photos'), voiceAt = at('voice');
    const dataOf = async (id) => (await store.getTownRow(id).catch(() => null))?.data;
    return ok(res, { partner: fresh ? presenceOut(p) : null, partnerTv: p ? p.tv : '', chats, layoutAt, layout: layoutAt && b.layoutAt !== layoutAt ? await dataOf('home') : undefined,
      stateAt, state: stateAt && b.stateAt !== stateAt ? await dataOf('state') : undefined, photosAt, voiceAt });
  }
  if (action === 'layout') {
    const b = await readJson(req, 8 * 1024);
    const data = b && typeof b.data === 'object' && b.data ? b.data : null;
    if (!data) return fail(res, 400, '배치 정보가 없어요.');
    const clean = {};
    for (const [k, v] of Object.entries(data).slice(0, 60)) {
      if (!/^[a-z0-9_-]{1,20}$/i.test(k)) continue;
      if (v?.inv === true) { clean[k] = { inv: true }; continue; } // 인벤토리에 넣은 가구
      if (Number.isInteger(v?.x) && Number.isInteger(v?.y) && v.x >= 0 && v.x < 40 && v.y >= 0 && v.y < 40) clean[k] = { x: v.x, y: v.y, r: Number.isInteger(v.r) && v.r >= 0 && v.r < 4 ? v.r : 0 };
    }
    const row = await store.saveTownLayout(JSON.stringify(clean));
    return ok(res, { layoutAt: row.updated_at });
  }
  if (action === 'mart') return ok(res, { sections: MART.catalog(), questions: PET_Q.map((x) => ({ q: x.q, a: x.a.map((o) => o[0]) })) });
  if (action === 'state') {
    // 장보기 · 요리(재료 쓰기) · 집 조명 · 펫 돌보기: 서버에서 읽고 → 바꾸고 → 저장
    const b = await readJson(req, 4 * 1024);
    const me = avatarOf(b?.me);
    if (!me) return fail(res, 400, '내 캐릭터를 알려주세요.');
    const st = await townState();
    await petReap(st);
    const items = b.items && typeof b.items === 'object' ? Object.entries(b.items).filter(([id, n]) => MART.ITEMS[id] && Number.isInteger(n) && n > 0 && n <= 99).slice(0, 120) : [];
    let msg = '';
    if (b.op === 'buy') {
      if (!items.length) return fail(res, 400, '장바구니가 비었어요.');
      let total = 0;
      for (const [id, n] of items) total += MART.ITEMS[id].price * n;
      if (me === 'girl') { // 지민: FRESH MART 포인트 100만 점에서 차감
        st.points = st.points || {};
        const bal = st.points.girl ?? GIRL_POINTS;
        if (bal < total) return fail(res, 409, `포인트가 모자라요 (남은 포인트 ${bal.toLocaleString('ko-KR')}P)`);
        st.points.girl = bal - total;
      }
      for (const [id, n] of items) st.fridge[id] = Math.min(999, (st.fridge[id] || 0) + n);
      msg = `${total.toLocaleString('ko-KR')}원 결제 완료`;
    } else if (b.op === 'use') {
      const lack = items.filter(([id, n]) => (st.fridge[id] || 0) < n).map(([id]) => MART.ITEMS[id].name);
      if (lack.length) return fail(res, 409, `재료가 부족해요: ${lack.join(', ')}`);
      for (const [id, n] of items) { st.fridge[id] -= n; if (st.fridge[id] <= 0) delete st.fridge[id]; }
      const ck = b.cooked; // 요리 완성 기록: 레시피 노트의 숙련도·별점
      if (ck && /^[\w-]{1,64}$/.test(String(ck.id || ''))) {
        st.cooked = st.cooked || {};
        const c = st.cooked[ck.id] || { n: 0, best: 0 };
        st.cooked[ck.id] = { n: Math.min(999, c.n + 1), best: Math.max(c.best, Math.max(1, Math.min(3, Number(ck.stars) | 0))), at: new Date().toISOString() };
        const keys = Object.keys(st.cooked); if (keys.length > 300) delete st.cooked[keys.sort((x, y) => String(st.cooked[x].at).localeCompare(String(st.cooked[y].at)))[0]];
      }
    } else if (b.op === 'lights') {
      st.lights = Boolean(b.on);
    } else if (b.op === 'lamp') { // 방마다 무드등: 0 꺼짐 · 1 노랑 · 2 분홍 · 3 파랑 · 4 보라
      if (!/^[a-z0-9]{1,12}$/i.test(String(b.id || ''))) return fail(res, 400, '없는 무드등이에요.');
      st.lamps = st.lamps || {}; st.lamps[b.id] = Math.max(0, Math.min(4, Number(b.mode) | 0));
    } else if (b.op === 'pet') {
      const now = new Date().toISOString();
      if (b.act === 'create') {
        if (st.pet) return ok(res, { state: st });
        if (st.petNext && Date.parse(st.petNext) > Date.now()) return ok(res, { state: st, msg: '새 알은 내일 찾아와요' });
        st.pet = { born: now, name: '', stage: 0, line: '', form: 'egg', intimacy: 0, ax: { E: 0, N: 0, F: 0, P: 0 }, food: { red: 0, blue: 0, yellow: 0, purple: 0 }, last: {}, dawn: 0, total: 0, lastQ: '', follow: null, log: [] };
        petLog(st.pet, '두 사람의 집에 작은 알이 도착했다.');
        msg = '펫 집에 작은 알이 도착했어요! 🥚';
      } else {
        const p = st.pet;
        if (!p) return fail(res, 400, '아직 펫이 없어요.');
        p.last = p.last || {};
        const before = { clean: needNow(p, 'clean'), warm: needNow(p, 'warm'), full: needNow(p, 'full') }; // 돌봐주기 전 수치
        const cold = p.stage === 0 && before.warm < 30; // 돌봐주기 전 온기 기준
        const add = (ax) => { for (const [k, v] of Object.entries(ax)) p.ax[k] = Math.max(-60, Math.min(60, (p.ax[k] || 0) + v)); };
        const tick = (key, gain) => {
          const lk = `${me}:${key}`, prev = p.last[lk] ? Date.parse(p.last[lk]) : 0;
          p.last[lk] = now; p.last[key] = now; p.total = (p.total || 0) + 1;
          const h = kstNow().getUTCHours(); if (h < 5) p.dawn = (p.dawn || 0) + 1;
          const g = Date.now() - prev < 20 * 60e3 ? 0 : cold ? Math.ceil(gain / 2) : gain; p.intimacy += g; return g; // 추울 땐(온기 30 아래) 친밀감 절반
        };
        if (b.act === 'care' && PET_CARE[b.kind]) {
          const c = PET_CARE[b.kind], g = tick(b.kind, c.g);
          if (g) { add(c.ax); needAdd(p, b.kind, before); }
          msg = g ? `${c.say} (친밀감 +${g}${cold ? ' · 추워서 절반' : ''})` : '아까 해줬잖아~ 조금 있다가 또 해줘!';
          if (g) petLog(p, `${me === 'boy' ? '아빠' : '엄마'}가 ${{ wipe: '닦아', guitar: '기타를 쳐', warm: '품어', knock: '두드려', talk: '말을 걸어', play: '놀아', sleep: '재워' }[b.kind]}줬다.`);
        } else if (b.act === 'feed' && PET_FOOD[b.color]) {
          if (p.stage === 0) return fail(res, 400, '알은 아직 못 먹어요. 따뜻하게 품어주세요!');
          const g = tick('feed', 3); add(PET_FOOD[b.color]); if (g) needAdd(p, 'feed', before); p.food[b.color] = (p.food[b.color] || 0) + 1;
          msg = `냠냠 맛있게 먹었어요! (친밀감 +${g})`; petLog(p, `${{ red: '활력의 열매', blue: '사색의 이슬', yellow: '온기의 수프', purple: '몽환의 버섯' }[b.color]}를 먹었다.`);
        } else if (b.act === 'answer') {
          const qi = Number(b.qi), ai = Number(b.ai), Q = PET_Q[qi];
          if (!Q || !Q.a[ai]) return fail(res, 400, '없는 답이에요.');
          if (p.lastQ === kstDay()) return fail(res, 409, '오늘 질문엔 벌써 답했어요.');
          p.lastQ = kstDay(); add(Q.a[ai][1]); p.intimacy += 3; msg = '대답을 듣고 고개를 끄덕여요 (친밀감 +3)'; petLog(p, `"${Q.q}" — "${Q.a[ai][0]}"라고 알려줬다.`);
        } else if (b.act === 'follow') {
          p.follow = b.on ? me : null; msg = b.on ? '졸졸 따라와요!' : '펫 집에서 쉬어요.';
        } else if (b.act === 'name') {
          p.name = str(b.name, 10); msg = `이름은 ${p.name}!`;
        } else return fail(res, 400, '없는 행동이에요.');
        const ev = petEvolve(p); if (ev) { msg = ev; petLog(p, ev); }
      }
    } else return fail(res, 400, '없는 기능이에요.');
    const row = await store.saveTownRow('state', JSON.stringify(st));
    return ok(res, { state: st, stateAt: row.updated_at, msg });
  }
  if (action === 'photos') { // 냉장고 코르크보드 사진 (최대 16장, 작게 줄인 사진)
    const b = await readJson(req, 600 * 1024);
    const row = await store.getTownRow('fridge_photos').catch(() => null);
    let list = []; try { list = JSON.parse(row?.data || '[]'); } catch {}
    if (b?.op === 'add') {
      const me = avatarOf(b.me);
      const img = String(b.img || '');
      if (!me) return fail(res, 400, '내 캐릭터를 알려주세요.');
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(img) || img.length > 400 * 1024) return fail(res, 400, '사진이 너무 크거나 이상해요.');
      if (list.length >= 16) return fail(res, 409, '코르크보드가 꽉 찼어요. 한 장 떼고 붙여주세요.');
      list.push({ id: crypto.randomUUID().slice(0, 8), img, by: me, memo: str(b.memo, 30), rot: Math.round((Math.random() * 14 - 7) * 10) / 10, pin: ['#e8343a', '#f2c230', '#3a8fe0', '#3aa55a', '#e86aa6'][Math.floor(Math.random() * 5)], at: new Date().toISOString() });
    } else if (b?.op === 'remove') {
      list = list.filter((p) => p.id !== b.id);
    } else if (b?.op !== 'list') return fail(res, 400, '없는 기능이에요.');
    let at = row?.updated_at || '';
    if (b.op !== 'list') at = (await store.saveTownRow('fridge_photos', JSON.stringify(list))).updated_at;
    return ok(res, { photos: list, photosAt: at });
  }
  if (action === 'voice') { // 무전기: 꾹 누르고 말한 짧은 음성 (최근 4개만 보관, 15초 · 400KB 이하)
    const b = await readJson(req, 520 * 1024);
    const row = await store.getTownRow('voice').catch(() => null);
    let list = []; try { list = JSON.parse(row?.data || '[]'); } catch {}
    if (b?.op === 'send') {
      const me = avatarOf(b.me), data = String(b.data || '');
      if (!me) return fail(res, 400, '내 캐릭터를 알려주세요.');
      if (!/^data:audio\/[\w.+-]+(;[\w=.+-]+)*;base64,[A-Za-z0-9+/=]+$/.test(data) || data.length > 500 * 1024) return fail(res, 400, '음성이 너무 길거나 이상해요.');
      const clip = { id: crypto.randomUUID().slice(0, 10), from: me, at: new Date().toISOString(), dur: Math.min(15, Math.max(0, Number(b.dur) || 0)), data };
      list = [...list, clip].slice(-4);
      const saved = await store.saveTownRow('voice', JSON.stringify(list));
      return ok(res, { id: clip.id, voiceAt: saved.updated_at });
    }
    if (b?.op === 'latest') { const me = avatarOf(b.me); const clip = [...list].reverse().find((c) => c.from !== me) || null; return ok(res, { clip, voiceAt: row?.updated_at || '' }); }
    return fail(res, 400, '없는 기능이에요.');
  }
  if (action === 'chat') {
    const b = await readJson(req, 2 * 1024);
    const me = avatarOf(b?.me);
    const text = str(b?.text, 200);
    if (!me || !text) return fail(res, 400, '보낼 말을 적어주세요.');
    return ok(res, { chat: await store.addTownChat({ avatar: me, text }) }, 201);
  }
  return fail(res, 404, '없는 기능이에요.');
}

// =====================================================================
// 이달의 낭만 리스트: 날짜별 각자 기록 (글 또는 사진)
//  - 내가 그날 기록해야 상대방 기록이 보임 (안 썼으면 '썼다/안 썼다'만 알려줌)
//  - 오늘까지만 기록 가능 (미래 날짜 X)
// =====================================================================
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const publicEntry = ({ id, month, ...e }) => e;

async function handleRomance(req, res, day) {
  const q = new URL(req.url, 'http://x').searchParams;
  if (!day && req.method === 'GET') {
    const month = q.get('month') || '';
    if (!/^\d{4}-\d{2}$/.test(month)) return fail(res, 400, '달을 알려주세요.');
    const marks = {};
    for (const r of await store.listRomanceMarks(month)) (marks[Number(r.day.slice(8))] ||= []).push(r.avatar);
    return ok(res, { marks });
  }
  if (!day || !DAY_RE.test(day)) return fail(res, 404, '없는 날짜예요.');
  if (req.method === 'GET') {
    const me = avatarOf(q.get('me'));
    const rows = await store.listRomanceDay(day);
    const mine = rows.find((r) => r.avatar === me) || null;
    const partner = rows.find((r) => r.avatar && r.avatar !== me) || null;
    return ok(res, {
      day,
      mine: mine && publicEntry(mine),
      partner: mine && partner ? publicEntry(partner) : null, // 내가 써야 열림
      partnerDone: Boolean(partner),
      canWrite: day <= kstToday(),
    });
  }
  if (req.method === 'PUT') {
    const body = await readJson(req, 3 * 1024 * 1024);
    const me = avatarOf(body?.me);
    if (!me) return fail(res, 400, '설정에서 내 프로필(男/女)을 먼저 골라주세요.');
    if (day > kstToday()) return fail(res, 400, '그날이 되면 기록할 수 있어요.');
    // 글 · 사진 둘 다 함께 올릴 수 있음 (사진이 있으면 kind 'photo', 없으면 'text' — 표의 kind 제약은 그대로)
    const text = str(body.body, 500);
    const photo = String(body.photo || '');
    if (photo && !DATA_URL.test(photo)) return fail(res, 400, '사진을 다시 골라주세요.');
    if (!text && !photo) return fail(res, 400, '오늘의 낭만을 글이나 사진으로 남겨주세요.');
    const kind = photo ? 'photo' : 'text';
    const before = await store.listRomanceDay(day);
    const isNew = !before.some((r) => r.avatar === me);
    const partnerWrote = before.some((r) => r.avatar && r.avatar !== me);
    const row = await store.saveRomance({
      id: `${day}_${me}`, day, month: day.slice(0, 7), avatar: me, kind,
      body: text, photo, updated_at: new Date().toISOString(),
    });
    if (isNew) {
      // 처음 등록할 때만 상대방에게 알림 (수정할 때는 안 보냄)
      const name = (await currentSettings()).profiles[me]?.name || (me === 'boy' ? '男' : '女');
      const when = day === kstToday() ? '오늘' : `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일`;
      await push.notifyAll(store, {
        title: `💌 ${when} ${name}${josa(name, '이의', '의')} 낭만 도착!`,
        body: partnerWrote ? '지금 바로 열어볼 수 있어요' : '나도 낭만을 등록하면 볼 수 있어요',
        url: `/?view=romance&day=${day}`,
        tag: `romance-${day}-${me}`,
      }, '', me === 'boy' ? 'girl' : 'boy', `${name} ${day} 낭만 기록 등록`).catch((e) => console.error('[낭만 알림 실패]', e.message));
    }
    return ok(res, { entry: publicEntry(row) });
  }
  if (req.method === 'DELETE') {
    const me = avatarOf(q.get('me'));
    if (!me) return fail(res, 400, '내 프로필을 먼저 골라주세요.');
    await store.deleteRomance(`${day}_${me}`);
    return ok(res);
  }
  return fail(res, 405, '허용되지 않는 요청');
}

// =====================================================================
// 문의하기 (상대방 → 주인) · 문의함 (주인이 해결 완료 → 상대방에게 알림)
// =====================================================================
async function inqReplies() {
  const row = await store.getTownRow('inq_replies').catch(() => null);
  try { return JSON.parse(row?.data || '{}') || {}; } catch { return {}; }
}
async function handleInquiries(req, res, id) {
  if (!id && req.method === 'GET') {
    const list = await store.listInquiries();
    const rep = await inqReplies();
    list.forEach((q) => { q.replies = rep[q.id] || []; });
    return ok(res, { inquiries: list, owner: OWNER_AVATAR, open: list.filter((q) => q.status !== 'done').length });
  }
  // 문의에 답장(피드백) 달기 → 문의한 사람에게 알림. 답장은 town_layout 의 'inq_replies' 줄에 모아 둠 (새 테이블 없이)
  if (id && req.method === 'POST') {
    const body = await readJson(req);
    const text = str(body?.reply, 500);
    if (!text) return fail(res, 400, '답장 내용을 적어주세요.');
    const prev = await store.getInquiry(id);
    if (!prev) return fail(res, 404, '없는 문의예요.');
    const avatar = avatarOf(body.profileAvatar) || OWNER_AVATAR;
    const name = (await currentSettings()).profiles[avatar]?.name || '';
    const rep = await inqReplies();
    const item = { from: avatar, name, text, at: new Date().toISOString() };
    rep[id] = [...(rep[id] || []), item].slice(-30);
    await store.saveTownRow('inq_replies', JSON.stringify(rep));
    const to = avatar === OWNER_AVATAR ? (prev.from_avatar || (OWNER_AVATAR === 'girl' ? 'boy' : 'girl')) : OWNER_AVATAR;
    await push.notifyAll(store, {
      title: `💬 ${name || '상대방'}님이 문의에 답장했어요`,
      body: text.slice(0, 100),
      url: '/?view=inquiry',
      tag: `inquiry-reply-${id}`,
    }, '', to, '문의 답장').catch((e) => console.error('[답장 알림 실패]', e.message));
    return ok(res, { replies: rep[id] }, 201);
  }
  if (!id && req.method === 'POST') {
    const body = await readJson(req);
    const text = str(body?.body, 1000);
    if (!text) return fail(res, 400, '문의 내용을 적어주세요.');
    const avatar = avatarOf(body.profileAvatar);
    const name = (avatar && (await currentSettings()).profiles[avatar]?.name) || str(body.profileName, 12);
    const row = await store.addInquiry({ from_avatar: avatar, from_name: name, body: text, status: 'open' });
    console.log(`[문의] ${name}: ${text.slice(0, 40)}`);
    await push.notifyAll(store, {
      title: `📮 ${name || '상대방'}님의 새 문의가 왔어요`,
      body: text.slice(0, 100),
      url: '/?view=inquiry',
      tag: `inquiry-${row.id}`,
    }, '', OWNER_AVATAR, `${name || '상대방'} 새 문의 등록`).catch((e) => console.error('[문의 알림 실패]', e.message));
    return ok(res, { inquiry: row }, 201);
  }
  if (id && req.method === 'PATCH') {
    const body = await readJson(req);
    const done = body?.status === 'done';
    const prev = await store.getInquiry(id);
    if (!prev) return fail(res, 404, '없는 문의예요.');
    const row = await store.updateInquiry(id, { status: done ? 'done' : 'open', resolved_at: done ? new Date().toISOString() : null });
    if (done && prev.status !== 'done') {
      await push.notifyAll(store, {
        title: '✅ 문의가 해결되었어요!',
        body: `"${prev.body.slice(0, 60)}" 요청을 반영했어요`,
        url: '/?view=inquiry',
        tag: `inquiry-done-${id}`,
      }, '', prev.from_avatar || (OWNER_AVATAR === 'girl' ? 'boy' : 'girl'), '문의함에서 해결 완료 처리').catch((e) => console.error('[해결 알림 실패]', e.message));
    }
    return ok(res, { inquiry: row });
  }
  if (id && req.method === 'DELETE') {
    return (await store.deleteInquiry(id)) ? ok(res) : fail(res, 404, '없는 문의예요.');
  }
  return fail(res, 405, '허용되지 않는 요청');
}

async function handleHints(req, res, id) {
  if (id) {
    if (req.method === 'PATCH') return (await store.readHint(id)) ? ok(res) : fail(res, 404, '없는 힌트예요.');
    if (req.method === 'DELETE') return (await store.deleteHint(id)) ? ok(res) : fail(res, 404, '없는 힌트예요.');
    return fail(res, 405, '허용되지 않는 요청');
  }
  if (req.method !== 'GET') return fail(res, 405, '허용되지 않는 요청');
  const avatar = avatarOf(new URL(req.url, 'http://x').searchParams.get('avatar'));
  if (!avatar) return ok(res, { hints: [], unread: 0 });
  const list = await store.listHints(avatar).catch(() => []);
  return ok(res, { hints: list, unread: list.filter((h) => !h.read_at).length });
}

// =====================================================================
// 매일 편지 (11:30, Supabase pg_cron 이 호출)
// =====================================================================
async function sendDailyLetters({ dry = false } = {}) {
  const rows = await store.listLocations();
  const people = Object.fromEntries(rows.map((r) => [r.avatar, r]));
  const recent = (await store.listLetters().catch(() => [])).slice(0, 60).map((l) => l.poem_title); // 약 한 달 동안 같은 시 안 보냄
  const s = await rawSettings();
  const results = [];
  for (const toAvatar of ['girl', 'boy']) {
    if (!people[toAvatar]) { results.push({ toAvatar, skipped: '위치 없음' }); continue; }
    const letter = await letters.composeOne({ toAvatar, people, styleCards: s.style_cards || {}, recentTitles: recent });
    recent.push(letter.poem_title); // 두 사람이 같은 날 같은 시를 받지 않게
    if (dry) { results.push({ toAvatar, letter }); continue; }
    const saved = await store.addLetter(letter);
    const sent = await push.notifyAll(store, {
      title: `☀️ 오늘의 편지가 도착했어요`,
      body: `${letter.weather.label} ${letter.weather.max}°/${letter.weather.min}° · 🥠 ${String(letter.fortune?.text || '').slice(0, 60)}`,
      url: `/?view=letter&id=${saved.id}`,
      tag: `letter-${saved.id}`,
    }, '', toAvatar, `11:30 오늘의 편지 (${letter.from_name} → ${letter.to_name})`).catch((e) => (console.error('[편지 푸시 실패]', e.message), { sent: 0 }));
    results.push({ toAvatar, id: saved.id, notified: sent.sent });
  }
  console.log('[매일 편지]', JSON.stringify(results.map(({ letter, ...r }) => r)));
  return results;
}

// 펫 상태 (town.js petNeeds 와 같은 식): 청결 시간당 -8 · 온기 시간당 -10 (한 번도 안 돌봤으면 태어난 때부터)
const petHours = (iso, born) => { const t = iso || born; return t ? (Date.now() - Date.parse(t)) / 3600e3 : 0; };
const lastWarmOf = (p) => [p.last?.warm, p.last?.guitar, p.last?.talk].filter(Boolean).sort().pop() || p.born;
// 수치는 저장된 값에서 시간만큼 줄어듦. 돌봐주면 한 번에 100이 아니라 조금씩 (닦기 +35 · 품기 +35 · 기타 +30 · 말 걸기 +20 · 먹이 +35)
const NEED_RATE = { clean: 8, warm: 10, full: 10 };
const NEED_GAIN = { wipe: ['clean', 35], warm: ['warm', 35], guitar: ['warm', 30], talk: ['warm', 20], knock: ['warm', 10], feed: ['full', 35] };
function needNow(p, k) {
  const n = p.need && p.need[k];
  if (n) return Math.max(0, n.v - petHours(n.at) * NEED_RATE[k]);
  const legacy = k === 'clean' ? p.last?.wipe : k === 'warm' ? lastWarmOf(p) : p.last?.feed; // 예전 펫: 마지막으로 해준 때부터
  return Math.max(0, 100 - petHours(legacy, p.born) * NEED_RATE[k]);
}
function needAdd(p, kind, before) { const g = NEED_GAIN[kind]; if (!g) return; const [k, amt] = g; p.need = p.need || {}; p.need[k] = { v: Math.min(100, Math.round((before ? before[k] : needNow(p, k)) + amt)), at: new Date().toISOString() }; }
const warmMarkOf = (p) => p.need?.warm?.at || lastWarmOf(p);
function petNeedsOf(p) {
  return { clean: Math.round(needNow(p, 'clean')), warm: Math.round(needNow(p, 'warm')), full: Math.round(needNow(p, 'full')) };
}
const PET_ALERT_AT = [40, 30, 20, 10];
// 알 온기가 0이 되면 하늘나라로: 추모 기록을 남기고, 다음 날(한국 시간) 새 알이 찾아옴
async function petReap(st) {
  const p = st.pet;
  if (!p || p.stage !== 0 || petNeedsOf(p).warm > 0) return false;
  const w = p.need?.warm, died = new Date(w ? Date.parse(w.at) + (w.v / NEED_RATE.warm) * 3600e3 : Date.parse(lastWarmOf(p)) + 10 * 3600e3).toISOString();
  const name = p.name || '우리 알';
  st.petGone = [...(st.petGone || []), { name, born: p.born, died, intimacy: p.intimacy || 0, days: Math.max(1, Math.ceil((Date.parse(died) - Date.parse(p.born)) / 86400e3)), log: (p.log || []).slice(-6) }].slice(-10);
  const k = kstNow(); k.setUTCHours(24, 0, 0, 0); st.petNext = new Date(k.getTime() - 9 * 3600e3).toISOString(); // 내일 0시(한국)
  st.pet = null;
  await store.saveTownRow('state', JSON.stringify(st));
  await push.notifyAll(store, { title: `🕊️ ${name}이(가) 하늘나라로 갔어요`, body: '너무 추웠나 봐요… 내일 새 알이 찾아올 거예요', url: '/town?scene=home', tag: 'pet-gone' }, '', '', `펫 하늘나라 (${name})`).catch((e) => console.error('[펫 알림 실패]', e.message));
  return true;
}
let reapAt = 0;
async function petReapSoon() { if (Date.now() - reapAt < 60e3) return; reapAt = Date.now(); try { await petReap(await townState()); } catch (e) { console.error('[펫 확인 실패]', e.message); } }
async function petCheck() { // 밤낮 없이: 청결·온기가 40·30·20·10 아래로 내려갈 때마다 한 번씩
  const st = await townState(), p = st.pet;
  if (!p) return { skipped: '펫 없음' };
  if (await petReap(st)) return { gone: true };
  const n = petNeedsOf(p), name = p.name || (p.stage === 0 ? '알' : '펫'), sent = [];
  p.alert = p.alert || {};
  const want = [
    ['clean', n.clean, p.need?.clean?.at || p.last?.wipe || p.born, `🧽 ${name}이(가) 꼬질꼬질해요 (청결 ${n.clean}%)`, '닦아주러 가요! 우리 집 펫 집에서 기다리고 있어요'],
    ...(p.stage === 0 ? [['warm', n.warm, warmMarkOf(p), `🥶 ${name}이(가) 추워해요 (온기 ${n.warm}%)`, n.warm <= 10 ? '이대로면 하늘나라로 가요… 지금 품어주세요!' : '품어주거나 기타를 쳐주거나 말을 걸어주세요']] : []),
  ];
  for (const [k, v, mark, title, body] of want) {
    const lv = PET_ALERT_AT.filter((t) => v <= t).pop(); // 지금 지나온 가장 낮은 단계
    if (lv == null) continue;
    const prev = p.alert[k] && p.alert[k].mark === mark ? p.alert[k].lv : null; // 같은 '떨어짐' 동안 이미 보낸 단계
    if (prev != null && prev <= lv) continue;
    await push.notifyAll(store, { title, body, url: '/town?scene=home', tag: `pet-${k}` }, '', '', `펫 ${k === 'clean' ? '청결' : '온기'} ${v}%`).catch((e) => console.error('[펫 알림 실패]', e.message));
    p.alert[k] = { mark, lv }; sent.push(`${k}${lv}`);
  }
  if (sent.length) await store.saveTownRow('state', JSON.stringify(st));
  return { needs: n, sent };
}
async function handleCron(req, res, job) {
  const secret = process.env.CRON_SECRET || '';
  const given = req.headers['x-cron-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || !safeEqual(given, secret)) return fail(res, 401, '권한이 없어요.');
  if (job === 'letter') {
    const url = new URL(req.url, 'http://x');
    return ok(res, { results: await sendDailyLetters({ dry: url.searchParams.get('dry') === '1' }) });
  }
  if (job === 'pet') { // 30분마다 (GitHub Actions): 펫 청결·온기가 40·30·20·10 아래로 내려갈 때마다 둘에게 알림, 알 온기 0이면 하늘나라
    return ok(res, await petCheck());
  }
  if (job === 'hint') {
    const url = new URL(req.url, 'http://x');
    return ok(res, { results: await sendDailyHints({ dry: url.searchParams.get('dry') === '1' }) });
  }
  return fail(res, 404, '없는 작업이에요.');
}

async function handleLetters(req, res, id) {
  // 직접 쓴 편지 보내기 { body, profileAvatar } → 상대방에게
  if (!id && req.method === 'POST') {
    const body = await readJson(req);
    const text = str(body?.body, 2000);
    const from = avatarOf(body?.profileAvatar);
    if (!from) return fail(res, 400, '프로필(男/女)을 먼저 정해주세요.');
    if (!text) return fail(res, 400, '편지 내용을 적어주세요.');
    const to = letters.OTHER[from];
    const { profiles } = await currentSettings();
    const fromName = profiles[from]?.name || str(body.profileName, 12) || (from === 'girl' ? '지민' : '준호');
    const toName = profiles[to]?.name || (to === 'girl' ? '지민' : '준호');
    const row = await store.addLetter({
      kind: 'user', from_avatar: from, to_avatar: to, from_name: fromName, to_name: toName,
      title: str(body.title, 40) || `${fromName}의 편지`, body: text,
    });
    await push.notifyAll(store, {
      title: `💌 ${fromName}의 편지가 도착했어요`,
      body: text.slice(0, 80),
      url: `/?view=letter&id=${row.id}`,
      tag: `letter-${row.id}`,
    }, '', to, `${fromName}${josa(fromName, '이', '가')} 직접 쓴 편지`).catch((e) => console.error('[편지 알림 실패]', e.message));
    return ok(res, { letter: row }, 201);
  }
  if (id && req.method === 'DELETE') {
    return (await store.deleteLetter(id)) ? ok(res) : fail(res, 404, '없는 편지예요.');
  }
  if (req.method !== 'GET') return fail(res, 405, '허용되지 않는 요청');
  if (id) {
    const l = await store.getLetter(id);
    return l ? ok(res, { letter: l }) : fail(res, 404, '없는 편지예요.');
  }
  return ok(res, { letters: await store.listLetters() });
}

// =====================================================================
// 배포 상태 ("잠시 꽃단장 중" 안내 · 업데이트 알림)
// =====================================================================
async function handleStatus(req, res) {
  const s = await rawSettings();
  // 배포가 실패해서 안내가 계속 떠 있지 않도록 20분 지나면 자동 해제
  const fresh = s.maintenance_at && Date.now() - new Date(s.maintenance_at).getTime() < 20 * 60 * 1000;
  return ok(res, { version: VERSION, maintenance: Boolean(s.maintenance && fresh) });
}

// 매일 편지 예약(pg_cron) 상태 확인 — 관리 토큰 필요
async function handleAdminCron(req, res) {
  const token = process.env.ADMIN_TOKEN || '';
  if (!token || !safeEqual(req.headers['x-admin-token'] || '', token)) return fail(res, 401, '권한이 없어요.');
  try {
    const jobs = (await store.letterCronStatus()) || [];
    const letters = await store.listLetters().catch(() => []);
    return ok(res, { jobs, lastLetter: letters[0] ? { created_at: letters[0].created_at, to: letters[0].to_avatar } : null });
  } catch (e) {
    return fail(res, 500, e.message.slice(0, 300));
  }
}

// 알림 기록 조회 — 관리 토큰 필요 (?limit=50)
async function handleAdminPushLogs(req, res) {
  const token = process.env.ADMIN_TOKEN || '';
  if (!token || !safeEqual(req.headers['x-admin-token'] || '', token)) return fail(res, 401, '권한이 없어요.');
  const limit = int(new URL(req.url, 'http://x').searchParams.get('limit'), 1, 500) || 50;
  try { return ok(res, { logs: await store.listPushLogs(limit) }); }
  catch (e) { return fail(res, 500, e.message.slice(0, 200)); }
}

async function handleAdminDeploy(req, res) {
  const token = process.env.ADMIN_TOKEN || '';
  if (!token || !safeEqual(req.headers['x-admin-token'] || '', token)) return fail(res, 401, '권한이 없어요.');
  const body = await readJson(req);
  const phase = body?.phase;
  if (phase === 'start') {
    await patchSettings({ maintenance: true, maintenance_at: new Date().toISOString() });
    return ok(res, { maintenance: true });
  }
  if (phase === 'done' || phase === 'failed') {
    await patchSettings({ maintenance: false });
    let sent = 0;
    if (phase === 'done') {
      sent = (await push.notifyAll(store, {
        title: str(body.title, 60) || '🌸 꽃단장 끝! 새 버전이에요',
        body: str(body.message, 120) || '새로운 버전으로 업데이트됐어요. 눌러서 확인해 보세요.',
        url: '/',
        tag: 'app-update',
      }, '', avatarOf(body.to), `배포 완료: ${str(body.message, 120)}`).catch(() => ({ sent: 0 }))).sent; // to: boy|girl 이면 그 사람에게만
    }
    return ok(res, { maintenance: false, notified: sent });
  }
  return fail(res, 400, 'phase 는 start / done / failed 중 하나예요.');
}

// =====================================================================
// 라우터: /api/... 요청을 처리했으면 true
// =====================================================================
const ROUTES = [
  [/^\/api\/menus(?:\/([\w-]+))?\/?$/, handleMenus],
  [/^\/api\/responses(?:\/([\w-]+))?\/?$/, handleResponses],
  [/^\/api\/settings\/?$/, handleSettings],
  [/^\/api\/push\/?$/, handlePush],
  [/^\/api\/location\/?$/, handleLocation],
  [/^\/api\/profile\/?$/, handleProfile],
  [/^\/api\/recipes(?:\/([\w-]+))?(?:\/([\w-]+))?\/?$/, handleRecipes],
  [/^\/api\/letters(?:\/([\w-]+))?\/?$/, handleLetters],
  [/^\/api\/hints(?:\/([\w-]+))?\/?$/, handleHints],
  [/^\/api\/talk\/([\w-]+)\/?$/, handleTalk],
  [/^\/api\/town\/([\w-]+)\/?$/, handleTown],
  [/^\/api\/romance(?:\/([\w-]+))?\/?$/, handleRomance],
  [/^\/api\/inquiries(?:\/([\w-]+))?\/?$/, handleInquiries],
  [/^\/api\/cron\/([\w-]+)\/?$/, handleCron],
  [/^\/api\/status\/?$/, handleStatus],
  [/^\/api\/admin\/cron\/?$/, handleAdminCron],
  [/^\/api\/admin\/push-logs\/?$/, handleAdminPushLogs],
  [/^\/api\/admin\/deploy\/?$/, handleAdminDeploy],
];

async function handleApi(req, res, pathname) {
  if (!pathname.startsWith('/api/')) return false;
  for (const [re, fn] of ROUTES) {
    const m = re.exec(pathname);
    if (!m) continue;
    try {
      await fn(req, res, m[1], m[2]);
    } catch (e) {
      console.error(e);
      if (!res.headersSent) fail(res, 500, '저장소 연결에 문제가 있어요. 잠시 후 다시 시도해주세요.');
    }
    return true;
  }
  fail(res, 404, '없는 주소예요.');
  return true;
}

module.exports = { handleApi, store, sendDailyLetters };
