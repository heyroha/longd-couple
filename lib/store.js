// 저장소: SUPABASE_URL + SUPABASE_SECRET_KEY 가 있으면 Supabase, 없으면 로컬 JSON 파일(data/)
// 키는 서버에만 두고 브라우저로는 절대 내려보내지 않는다.
//
// 아래쪽 "도메인 메서드"는 공통 테이블 API(list/insert/update/remove/upsert) 위에서 동작하므로
// 로컬과 Supabase가 같은 코드를 쓴다.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_MENUS = ['🍝 토마토 미트볼', '🥓 삼겹살말이 두부부침', '🥩 무화과 스테이크'];

// 테이블별 기본키
const KEYS = { menus: 'id', responses: 'id', recipes: 'id', letters: 'id', recipe_chats: 'id', hints: 'id', inquiries: 'id', push_logs: 'id', romance_entries: 'id', town_presence: 'avatar', town_chat: 'id', town_layout: 'id', settings: 'id', push_subscriptions: 'endpoint', locations: 'avatar' };

// ---------- 공통 테이블 API: 로컬 JSON ----------
function localTables(dataDir) {
  const file = (t) => path.join(dataDir, `${t}.json`);
  const read = (t) => { try { return JSON.parse(fs.readFileSync(file(t), 'utf-8')); } catch { return null; } };
  const write = (t, rows) => {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file(t) + '.tmp', JSON.stringify(rows, null, 2));
    fs.renameSync(file(t) + '.tmp', file(t));
  };
  const rowsOf = (t) => read(t) || [];
  const now = () => new Date().toISOString();

  return {
    kind: 'local',
    raw: { read, write },
    async list(t, { order, desc = false, limit, eq, gte } = {}) {
      let rows = rowsOf(t);
      if (eq) rows = rows.filter((r) => Object.entries(eq).every(([k, v]) => r[k] === v));
      if (gte) rows = rows.filter((r) => Object.entries(gte).every(([k, v]) => String(r[k] ?? '') >= v));
      const cmp = (x, y) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '') < String(y ?? '') ? -1 : String(x ?? '') > String(y ?? '') ? 1 : 0);
      if (order) rows = [...rows].sort((a, b) => cmp(a[order], b[order]) * (desc ? -1 : 1));
      return limit ? rows.slice(0, limit) : rows;
    },
    async get(t, key) {
      return rowsOf(t).find((r) => r[KEYS[t]] === key) || null;
    },
    async insert(t, row) {
      const rows = rowsOf(t);
      const full = { created_at: now(), ...(KEYS[t] === 'id' && !row.id ? { id: crypto.randomUUID() } : {}), ...row };
      rows.push(full);
      write(t, rows);
      return full;
    },
    async update(t, key, patch) {
      const rows = rowsOf(t);
      const r = rows.find((x) => x[KEYS[t]] === key);
      if (!r) return null;
      Object.assign(r, patch);
      write(t, rows);
      return r;
    },
    async upsert(t, row) {
      // Supabase(merge-duplicates)처럼 보낸 칸만 덮어씀
      const all = rowsOf(t);
      const prev = all.find((x) => x[KEYS[t]] === row[KEYS[t]]);
      const full = { created_at: now(), ...(prev || {}), ...row };
      write(t, [...all.filter((x) => x !== prev), full]);
      return full;
    },
    async updateWhere(t, eq, patch) {
      const rows = rowsOf(t);
      const hit = rows.filter((r) => Object.entries(eq).every(([k, v]) => r[k] === v));
      hit.forEach((r) => Object.assign(r, patch));
      if (hit.length) write(t, rows);
      return hit.length;
    },
    async rpc() { return null; }, // 로컬에는 예약 작업 없음
    async remove(t, key) {
      const rows = rowsOf(t);
      const next = rows.filter((x) => x[KEYS[t]] !== key);
      write(t, next);
      return next.length !== rows.length;
    },
  };
}

// ---------- 공통 테이블 API: Supabase REST (외부 패키지 없음) ----------
function supabaseTables(baseUrl, key) {
  const rest = baseUrl.replace(/\/+$/, '') + '/rest/v1';
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  // 예전 방식(JWT) service_role 키만 Authorization 헤더가 필요함. 새 sb_secret_ 키는 apikey 헤더만.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const enc = encodeURIComponent;

  async function call(method, pathAndQuery, body, prefer) {
    const res = await fetch(rest + pathAndQuery, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Supabase ${method} ${pathAndQuery.split('?')[0]} → ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
  }

  return {
    kind: 'supabase',
    async list(t, { order, desc = false, limit, eq, gte, select = '*' } = {}) {
      let q = `/${t}?select=${select}`;
      if (eq) for (const [k, v] of Object.entries(eq)) q += `&${k}=eq.${enc(v)}`;
      if (gte) for (const [k, v] of Object.entries(gte)) q += `&${k}=gte.${enc(v)}`;
      if (order) q += `&order=${order}.${desc ? 'desc' : 'asc'}`;
      if (limit) q += `&limit=${limit}`;
      return call('GET', q);
    },
    async get(t, k) {
      const rows = await call('GET', `/${t}?select=*&${KEYS[t]}=eq.${enc(k)}`);
      return rows[0] || null;
    },
    async insert(t, row) {
      const [r] = await call('POST', `/${t}`, row, 'return=representation');
      return r;
    },
    async update(t, k, patch) {
      const rows = await call('PATCH', `/${t}?${KEYS[t]}=eq.${enc(k)}`, patch, 'return=representation');
      return rows[0] || null;
    },
    async upsert(t, row) {
      const [r] = await call('POST', `/${t}?on_conflict=${KEYS[t]}`, row, 'resolution=merge-duplicates,return=representation');
      return r;
    },
    async updateWhere(t, eq, patch) {
      const q = Object.entries(eq).map(([k, v]) => `${k}=eq.${enc(v)}`).join('&');
      const rows = await call('PATCH', `/${t}?${q}`, patch, 'return=representation');
      return rows.length;
    },
    rpc: (fn, args = {}) => call('POST', `/rpc/${fn}`, args),
    async remove(t, k) {
      const rows = await call('DELETE', `/${t}?${KEYS[t]}=eq.${enc(k)}`, null, 'return=representation');
      return rows.length > 0;
    },
  };
}

// ---------- 도메인 메서드 ----------
function withDomain(db) {
  const now = () => new Date().toISOString();

  async function ensureMenus() {
    const rows = await db.list('menus', { order: 'sort_order' });
    if (rows.length || db.kind !== 'local' || db.raw.read('menus')) return rows;
    for (const [i, name] of DEFAULT_MENUS.entries()) await db.insert('menus', { name, memo: '', sort_order: i });
    return db.list('menus', { order: 'sort_order' });
  }

  return {
    kind: db.kind,
    db,

    // 메뉴 (안건 02)
    listMenus: ensureMenus,
    async addMenu(name, memo = '', kind = 'food') {
      const rows = await db.list('menus', { order: 'sort_order', desc: true, limit: 1 });
      return db.insert('menus', { name, memo, kind, sort_order: rows.length ? rows[0].sort_order + 1 : 0 });
    },
    // 꾹 눌러 옮긴 순서 저장 (ids 순서대로 0, 1, 2 …)
    async reorderMenus(ids) {
      for (const [i, id] of ids.entries()) await db.update('menus', id, { sort_order: i });
    },
    updateMenu: (id, patch) => db.update('menus', id, patch),
    deleteMenu: (id) => db.remove('menus', id),

    // 의결서
    listResponses: () => db.list('responses', { order: 'created_at', desc: true, limit: 200 }),
    addResponse: (row) => db.insert('responses', row),
    deleteResponse: (id) => db.remove('responses', id),

    // 프로필 이름 바꾸면 예전 기록에도 반영
    async renameProfile(avatar, name, oldName) {
      let n = await db.updateWhere('responses', { profile_avatar: avatar }, { profile_name: name });
      if (oldName && oldName !== name) n += await db.updateWhere('responses', { profile_avatar: '', profile_name: oldName }, { profile_name: name, profile_avatar: avatar });
      await db.updateWhere('locations', { avatar }, { name }).catch(() => 0);
      await db.updateWhere('push_subscriptions', { avatar }, { device: name }).catch(() => 0);
      return n;
    },
    letterCronStatus: () => db.rpc('letter_cron_status'),

    // 공통 설정 (한 줄)
    getSettings: () => db.get('settings', 1),
    saveSettings: (values) => db.upsert('settings', { id: 1, ...values, updated_at: now() }),

    // 알림 구독
    listSubscriptions: () => db.list('push_subscriptions'),
    saveSubscription: (sub) => db.upsert('push_subscriptions', sub),
    deleteSubscription: (endpoint) => db.remove('push_subscriptions', endpoint),

    // 위치 (avatar = boy | girl)
    listLocations: () => db.list('locations'),
    saveLocation: (row) => db.upsert('locations', { ...row, updated_at: now() }),

    // 레시피 노트
    listRecipes: () =>
      db.list('recipes', {
        order: 'updated_at', desc: true,
        select: 'id,title,category,minutes,servings,favorite,author,image_thumb,image_url,ingredients,created_at,updated_at',
      }),
    getRecipe: (id) => db.get('recipes', id),
    addRecipe: (row) => db.insert('recipes', { ...row, updated_at: now() }),
    updateRecipe: (id, patch) => db.update('recipes', id, { ...patch, updated_at: now() }),
    deleteRecipe: (id) => db.remove('recipes', id),

    // 매일 편지
    listLetters: () => db.list('letters', { order: 'created_at', desc: true, limit: 60 }),
    getLetter: (id) => db.get('letters', id),
    addLetter: (row) => db.insert('letters', row),
    deleteLetter: (id) => db.remove('letters', id),

    // 레시피 채팅 기록
    addChat: (row) => db.insert('recipe_chats', row),
    listChatsSince: (iso) => db.list('recipe_chats', { gte: { created_at: iso }, order: 'created_at' }),

    // 힌트 우체통
    listHints: (toAvatar) => db.list('hints', { eq: { to_avatar: toAvatar }, order: 'created_at', desc: true, limit: 60 }),
    hintsOfDay: (day) => db.list('hints', { eq: { day } }),
    addHint: (row) => db.insert('hints', row),
    readHint: (id) => db.update('hints', id, { read_at: now() }),
    deleteHint: (id) => db.remove('hints', id),

    // 문의하기 / 문의함
    listInquiries: () => db.list('inquiries', { order: 'created_at', desc: true, limit: 200 }),
    getInquiry: (id) => db.get('inquiries', id),
    addInquiry: (row) => db.insert('inquiries', row),
    updateInquiry: (id, patch) => db.update('inquiries', id, patch),
    deleteInquiry: (id) => db.remove('inquiries', id),

    // 이달의 낭만 리스트 기록 (id = "YYYY-MM-DD_avatar")
    listRomanceMarks: (month) => db.list('romance_entries', { eq: { month }, select: 'id,day,avatar' }),
    listRomanceDay: (day) => db.list('romance_entries', { eq: { day } }),
    saveRomance: (row) => db.upsert('romance_entries', row),
    deleteRomance: (id) => db.remove('romance_entries', id),

    // 우리 동네: 실시간 위치 · 채팅
    savePresence: (row) => db.upsert('town_presence', row),
    getPresence: (avatar) => db.get('town_presence', avatar),
    addTownChat: (row) => db.insert('town_chat', row),
    getTownLayout: () => db.get('town_layout', 'home'),
    listTownRows: () => db.list('town_layout', { select: 'id,updated_at' }), // 내용은 바뀌었을 때만 따로 가져옴
    getTownRow: (id) => db.get('town_layout', id),
    saveTownRow: (id, data) => db.upsert('town_layout', { id, data, updated_at: now() }),
    saveTownLayout: (data) => db.upsert('town_layout', { id: 'home', data, updated_at: now() }),
    listTownChat: (since) => db.list('town_chat', { gte: { created_at: since }, order: 'created_at', limit: 50 }),

    // 알림 기록
    addPushLog: (row) => db.insert('push_logs', row),
    listPushLogs: (limit = 100) => db.list('push_logs', { order: 'created_at', desc: true, limit }),
  };
}

function createStore(dataDir) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return withDomain(url && key ? supabaseTables(url, key) : localTables(dataDir));
}

module.exports = { createStore, DEFAULT_MENUS };
