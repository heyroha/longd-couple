// 저작권이 끝난 한국 시집을 위키문헌(ko.wikisource.org)에서 통째로 받아 lib/poems.json 을 만든다.
//  1) 시집별 하위 문서 목록 → 위키 원문 50개씩 한 번에 (스캔본을 끌어오는 문서는 "페이지:" 원문도 50개씩)
//     현대어 단락이 있으면 현대어 사용
//  2) 4~20줄, 600자 이하만
//  3) Gemini(무료)로 옛 표기·한자를 현대 맞춤법으로만 바꾸고(단어·줄 그대로), 날씨 태그·분위기·사랑 관련도 붙이기
//     → 줄 수가 달라지면 원문 유지
// 실행: node tools/build_poems.mjs   (중간에 끊겨도 tools/out/poems_cache 에서 이어서 함)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
process.loadEnvFile(new URL('../.env', import.meta.url));
const require = createRequire(import.meta.url);
const gemini = require('../lib/gemini.js');

const API = 'https://ko.wikisource.org/w/api.php';
const CACHE = new URL('./out/poems_cache/', import.meta.url).pathname;
mkdirSync(CACHE, { recursive: true });

// [문서 접두어, 시인, 시인이 세상을 떠난 해] — 모두 1962년 이전 사망 → 국내 저작권 만료
const COLLECTIONS = [
  ['진달래꽃 (시집)/', '김소월', 1934],
  ['님의 침묵/', '한용운', 1944],
  ['하늘과 바람과 별과 시 (1948년)/', '윤동주', 1945],
  ['하늘과 바람과 별과 시 (1955년)/', '윤동주', 1945],
  ['영랑시집/', '김영랑', 1950],
  ['정지용 시집/', '정지용', 1950],
  ['산호림/', '노천명', 1957],
  ['사슴의 노래/', '노천명', 1957],
];
const SKIP = /\/(서|서문|발문|목차|차례|해설|머리말|후기|발|서시 \(산문\)|밤 \(산문\)|판권)$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'longd-couple-poems/1.0 (https://github.com/heyroha/longd-couple; personal, non-commercial; batched requests)';
async function wiki(params) {
  for (let i = 0; i < 8; i++) {
    await sleep(2500 + i * 15000); // 429면 점점 오래 쉬기
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ format: 'json', formatversion: '2', ...params }),
      });
      if (res.status === 429) throw new Error('429');
      return JSON.parse(await res.text());
    } catch { process.stdout.write('…'); }
  }
  throw new Error('위키문헌 응답 없음');
}

// 문서 여러 개의 위키 원문을 50개씩 한 번에 (요청 수 최소화)
async function wikitexts(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 50) {
    const d = await wiki({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: titles.slice(i, i + 50).join('|') });
    const back = Object.fromEntries([...(d.query?.normalized || []), ...(d.query?.redirects || [])].map((n) => [n.to, n.from]));
    for (const pg of d.query?.pages || []) {
      const text = pg.revisions?.[0]?.slots?.main?.content;
      if (text != null) out[back[pg.title] || pg.title] = text;
    }
    process.stdout.write('.');
  }
  return out;
}

// 위키 원문 → 시 본문
function clean(wt) {
  const t = wt
    .replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^##[^#\n]*##\s*$/gm, '')
    .replace(/\{\{(?:가운데|center|c|크게|글자 크기|larger|big|x-larger|제목)\|[^{}]*\}\}/gi, '') // 쪽 안의 제목
    .replace(/\{\{(?:[^{}|]*\|)+([^{}|=]*)\}\}/g, '$1') // {{틀|내용}} → 내용
    .replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'{2,}/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?poem[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/^=+.*=+\s*$/gm, '')
    .replace(/^[:*#;]+\s*/gm, '')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&');
  const lines = t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => !l || !/^[\d\s.()\-—–]+$/.test(l));
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}
const count = (t) => t.split('\n').filter((l) => l.trim()).length;
function header(wt, key) {
  const m = wt.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n|]*)`));
  return m ? clean(m[1]).trim() : '';
}

// ---------- 1) 수집 ----------
const RAW_FILE = CACHE + '_raw.json';
let raw = existsSync(RAW_FILE) ? JSON.parse(readFileSync(RAW_FILE, 'utf-8')) : null;
if (!raw) {
  raw = [];
  for (const [prefix, author, died] of COLLECTIONS) {
    const list = await wiki({ action: 'query', list: 'allpages', apprefix: prefix, aplimit: '500' });
    const pages = (list.query?.allpages || []).map((p) => p.title).filter((t) => !SKIP.test(t));
    process.stdout.write(`\n${prefix} ${pages.length}편 `);
    const texts = await wikitexts(pages);
    const need = {}; // 스캔본을 끌어오는 문서 → "페이지:" 원문 목록
    const items = pages.map((page) => {
      const wt = texts[page] || '';
      let body = wt.split(/==\s*라이선스\s*==/)[0];
      const parts = body.split(/==\s*현대어\s*==/);
      if (parts.length > 1) body = parts[1];
      const m = body.match(/<pages\s+index="([^"]+)"\s+from=["']?(\d+)["']?\s+to=["']?(\d+)/);
      if (m && parts.length === 1) need[page] = Array.from({ length: +m[3] - +m[2] + 1 }, (_, k) => `페이지:${m[1]}/${+m[2] + k}`);
      return { page, author, died, collection: prefix.replace(/\/$/, ''), title: header(wt, '부제') || page.split('/').pop(), body };
    });
    const pageTexts = await wikitexts([...new Set(Object.values(need).flat())]);
    for (const it of items) {
      it.text = need[it.page] ? need[it.page].map((t) => clean(pageTexts[t] || '')).join('\n\n').replace(/\n{3,}/g, '\n\n') : clean(it.body);
      delete it.body;
      it.title = it.title.replace(/\([^)]*[一-鿿][^)]*\)/g, '').replace(/[「」]/g, '').trim() || it.page.split('/').pop();
      raw.push(it);
    }
  }
  writeFileSync(RAW_FILE, JSON.stringify(raw));
}

// ---------- 2) 다듬기 · 거르기 ----------
const squash = (x) => x.replace(/[\s\p{P}]/gu, '');
function normalize(text, title) {
  let lines = text.replace(/\[\[|\]\]/g, '').split('\n').map((l) => l.trim());
  // 현대어 / 원문이 나란히 있는 문서 → 현대어만
  const iM = lines.findIndex((l) => l === '현대어');
  const iO = lines.findIndex((l) => l === '원문');
  if (iM >= 0 && iO > iM) lines = lines.slice(iM + 1, iO);
  else if (iO > 0) lines = lines.slice(0, iO);
  while (lines.length && !lines[0]) lines.shift();
  // 맨 위 줄이 제목이면 빼기 (지은이 줄도)
  if (lines.length && squash(lines[0]) === squash(title)) lines.shift();
  while (lines.length && (!lines[0] || /^(김소월|한용운|윤동주|김영랑|정지용|노천명)$/.test(lines[0]))) lines.shift();
  // 줄마다 빈 줄이 끼어 있는 판본 → 빈 줄 하나는 지우고, 두 개 이상이면 연 구분
  const nonEmpty = lines.filter(Boolean).length;
  const single = lines.filter((l, i) => l && lines[i + 1] && i + 1 < lines.length).length;
  if (nonEmpty >= 4 && single === 0) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]) out.push(lines[i]);
      else if (!lines[i - 1] && out[out.length - 1] !== '') out.push(''); // 빈 줄 연속 = 연 구분
    }
    lines = out;
  }
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}
for (const p of raw) if (p.text) p.text = normalize(p.text, p.title);

const seen = new Set();
const picked = raw.filter((p) => {
  const n = count(p.text || '');
  const key = `${p.author}|${p.title.replace(/\s/g, '')}`;
  if (!p.text || n < 4 || n > 20 || p.text.length > 600 || seen.has(key)) return false;
  if (/[ᄀ-ᇿꥠ-꥿ힰ-퟿]/.test(p.text)) return false; // 옛한글 자모는 폰에서 깨짐
  seen.add(key);
  return true;
});
console.log(`\n\n수집 ${raw.length}편 → 4~20줄 ${picked.length}편`);
if (process.env.ONLY_RAW) { writeFileSync(CACHE + "_picked.json", JSON.stringify(picked, null, 1)); process.exit(0); }

// ---------- 3) 현대 표기 + 태그 (Gemini, 8편씩) ----------
const TAG_FILE = CACHE + '_tags.json';
const tagged = existsSync(TAG_FILE) ? JSON.parse(readFileSync(TAG_FILE, 'utf-8')) : {};
const todo = picked.filter((p) => !tagged[p.page]);
let fails = 0;
for (let i = 0; i < todo.length; i += 8) {
  const batch = todo.slice(i, i + 8);
  const prompt = batch.map((p, k) => `#${k}\n제목: ${p.title}\n${p.text}`).join('\n\n---\n\n');
  try {
    const { text } = await gemini.generate({
      json: true, temperature: 0.1, timeoutMs: 60000,
      system:
        '너는 한국 근대시 편집자다. 각 시를 현대 맞춤법·띄어쓰기로만 고친다. ' +
        '규칙: 단어를 바꾸거나 빼거나 더하지 말 것, 줄 나눔과 빈 줄(연 구분)을 그대로 유지, 한자는 한글로(뜻이 헷갈리면 괄호로 한자 1~2개만), 방언·시적 표현은 그대로 둔다. ' +
        '그리고 날씨 태그(sun/cloud/rain/snow/night/any 중 1~3개), 계절(spring/summer/autumn/winter/any 중 1~2개), 분위기 키워드 3개, 사랑·그리움 관련도(0~3)를 붙인다. ' +
        'JSON 배열 [{"i": 번호, "title": 현대 표기 제목(한자는 한글로), "text": 고친 시, "tags": [...], "season": [...], "mood": [...], "love": 숫자}] 로만 답한다.',
      messages: [{ role: 'user', text: prompt }],
    });
    const arr = JSON.parse(text);
    for (const r of arr) {
      const p = batch[r.i];
      if (!p) continue;
      const modern = typeof r.text === 'string' ? clean(r.text) : '';
      const same = modern && count(modern) === count(p.text) && Math.abs(modern.length - p.text.length) < p.text.length * 0.35;
      tagged[p.page] = {
        title: typeof r.title === 'string' && r.title.trim() && !/[\u4E00-\u9FFF]/.test(r.title) ? r.title.trim().slice(0, 30) : '',
        text: same ? modern : p.text,
        modernized: Boolean(same),
        tags: (r.tags || []).filter((t) => ['sun', 'cloud', 'rain', 'snow', 'night', 'any'].includes(t)),
        season: (r.season || []).filter((t) => ['spring', 'summer', 'autumn', 'winter', 'any'].includes(t)),
        mood: (r.mood || []).slice(0, 3).map(String),
        love: Number(r.love) || 0,
      };
    }
    writeFileSync(TAG_FILE, JSON.stringify(tagged));
    console.log(`태그 ${Object.keys(tagged).length}/${picked.length}`);
  } catch (e) {
    console.log('Gemini 실패, 잠시 후 재시도:', e.message.slice(0, 100));
    if (++fails > 12) break;
    i -= 8; await sleep(20000); continue;
  }
  await sleep(4000);
}

// ---------- 4) 저장 ----------
const out = picked.filter((p) => tagged[p.page]).map((p) => {
  const t = tagged[p.page];
  const hanja = (t.text.match(/[一-鿿]/g) || []).length;
  return {
    title: t.title || p.title, author: p.author, collection: p.collection,
    tags: t.tags.length ? t.tags : ['any'], season: t.season.length ? t.season : ['any'], mood: t.mood, love: t.love,
    lines: count(t.text), hanja, modernized: t.modernized,
    source: `https://ko.wikisource.org/wiki/${encodeURIComponent(p.page.replace(/ /g, '_'))}`,
    text: t.text,
  };
}).filter((p) => p.hanja <= 6);

// 예전 목록(손으로 고른 14편)은 그대로 유지
const old = JSON.parse(readFileSync(new URL('../lib/poems.json', import.meta.url), 'utf-8')).filter((p) => !p.collection);
const keyOf = (p) => `${p.author}|${p.title.replace(/\s/g, '')}`;
const oldKeys = new Set(old.map(keyOf));
const merged = [...old.map((p) => ({ season: ['any'], mood: [], love: 3, ...p })), ...out.filter((p) => !oldKeys.has(keyOf(p)))];
writeFileSync(new URL('../lib/poems.json', import.meta.url), JSON.stringify(merged, null, 1));
const byAuthor = merged.reduce((m, p) => ((m[p.author] = (m[p.author] || 0) + 1), m), {});
console.log(`저장: ${merged.length}편 (사랑·그리움 2 이상 ${merged.filter((p) => p.love >= 2).length}편)`, byAuthor);
