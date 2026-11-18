// 저작권이 끝난 한국 시를 위키문헌(ko.wikisource.org)에서 원문 그대로 받아 lib/poems.json 으로 저장
// 20줄 이하만 남김. 날씨 태그(sun/cloud/rain/snow/any)로 그날 날씨에 맞는 시를 고른다.
// 실행: node tools/fetch_poems.mjs
import { writeFileSync } from 'node:fs';

const API = 'https://ko.wikisource.org/w/api.php';
const EXPECT = {"진달래꽃": 12, "먼 후일": 8, "산유화": 16, "엄마야 누나야": 4, "못 잊어": 9, "개여울": 15, "가는 길": 12, "왕십리": 15, "사랑하는 까닭": 6, "알 수 없어요": 6, "나룻배와 행인": 11, "서시": 9, "눈 오는 지도": 13, "사랑스런 추억": 17, "새로운 길": 10, "햇비": 12, "눈": 6, "돌담에 속삭이는 햇발": 8, "모란이 피기까지는": 12, "내 마음을 아실 이": 12, "호수": 6, "비": 16, "님의 침묵": 10, "청포도": 12};
const CANDIDATES = [
  // [제목, 시인, 날씨 태그, 검색어(선택)]
  ['진달래꽃', '김소월', ['sun', 'any']],
  ['먼 후일', '김소월', ['cloud', 'any']],
  ['산유화', '김소월', ['sun']],
  ['엄마야 누나야', '김소월', ['sun']],
  ['못 잊어', '김소월', ['cloud', 'any']],
  ['개여울', '김소월', ['cloud']],
  ['가는 길', '김소월', ['cloud', 'rain']],
  ['왕십리', '김소월', ['rain']],
  ['사랑하는 까닭', '한용운', ['any']],
  ['알 수 없어요', '한용운', ['rain', 'cloud']],
  ['나룻배와 행인', '한용운', ['any']],
  ['서시', '윤동주', ['any']],
  ['눈 오는 지도', '윤동주', ['snow']],
  ['사랑스런 추억', '윤동주', ['rain', 'cloud']],
  ['새로운 길', '윤동주', ['sun']],
  ['햇비', '윤동주', ['rain', 'sun']],
  ['눈', '윤동주', ['snow']],
  ['돌담에 속삭이는 햇발', '김영랑', ['sun']],
  ['모란이 피기까지는', '김영랑', ['sun', 'any']],
  ['내 마음을 아실 이', '김영랑', ['any']],
  ['호수', '정지용', ['any'], '향수/호수1'],
  ['비', '정지용', ['rain'], '백록담 (정지용)/비'],
  ['님의 침묵', '한용운', ['cloud', 'any'], '님의 침묵/님의 침묵'],
  ['청포도', '이육사', ['sun']],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(1500 + attempt * 3000); // 위키 API 예의상 천천히
    const res = await fetch(url, { headers: { 'User-Agent': 'longd-couple-poems/1.0 (personal app)' } });
    const text = await res.text();
    try { return JSON.parse(text); } catch { console.log('  …잠시 대기 후 재시도'); }
  }
  throw new Error('위키문헌 API 응답 없음');
}

// 렌더링된 HTML의 div.poem (현대어 표기가 있으면 마지막 블록이 현대어)
function variants(html) {
  const decode = (x) => x
    .replace(/<br\s*\/?>\n?/g, '\n').replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\u200b/g, '');
  const tidy = (t) => {
    const lines = t.split('\n').map((l) => l.trim());
    while (lines.length && !lines[0]) lines.shift();
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  };
  const end = html.search(/id="라이선스"/);
  const body = end > 0 ? html.slice(0, end) : html;
  const blocks = [...body.matchAll(/<div class="poem">([\s\S]*?)<\/div>/g)].map((m) => tidy(decode(m[1])));
  if (!blocks.length) return [];
  const all = blocks.join('\n\n');
  const out = [blocks[blocks.length - 1], all];
  const lines = all.split('\n').filter((l) => l.trim());
  if (lines.length % 2 === 0) { // 옛한글 + 현대어가 같은 길이로 두 번 들어간 경우 → 뒤쪽 절반
    const half = all.split('\n\n');
    out.push(half.slice(Math.ceil(half.length / 2)).join('\n\n'));
  }
  return out;
}

function fromHtml(html) {
  // "현대어" 제목이 있으면 그 뒤만 사용 (앞은 옛한글 원문), 없으면 본문 전체 블록을 이어붙임
  const modern = html.search(/id="현대어"/);
  const src = modern >= 0 ? html.slice(modern) : html.slice(0, Math.max(0, html.search(/id="라이선스"/)) || undefined);
  const blocks = [...src.matchAll(/<div class="poem">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
  if (!blocks.length) return '';
  const t = blocks.join('<br />\n<br />\n')
    .replace(/<br\s*\/?>\n?/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\u200b/g, '');
  const lines = t.split('\n').map((l) => l.trim());
  while (lines.length && !lines[0]) lines.shift();
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

function clean(wikitext) {
  let t = wikitext;
  const poem = t.match(/<poem[^>]*>([\s\S]*?)<\/poem>/i);
  if (poem) t = poem[1];
  t = t
    .replace(/<ref[\s\S]*?<\/ref>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/^=+.*=+$/gm, '')
    .replace(/^[:*#]+/gm, '')
    .replace(/&nbsp;/g, ' ');
  const lines = t.split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

const out = [];
for (const [title, author, tags, page] of CANDIDATES) {
  let pageTitle = page;
  if (!pageTitle) {
    const s = await api({ action: 'query', list: 'search', srsearch: `${title} ${author}`, srlimit: '8' });
    const hits = (s.query?.search || []).map((r) => r.title);
    pageTitle = hits.find((h) => h === title || h.endsWith(`/${title}`) || h.startsWith(`${title} (`)) || null;
  }
  if (!pageTitle) { console.log('✗ 못 찾음', title, author); continue; }
  const p = await api({ action: 'parse', page: pageTitle, prop: 'text', redirects: '1' });
  const html = p.parse?.text?.['*'];
  if (!html) { console.log('✗ 본문 없음', pageTitle); continue; }
  const count = (t) => t.split('\n').filter((l) => l.trim()).length;
  const want = EXPECT[title] || 12;
  const text = variants(html).sort((a, b) => Math.abs(count(a) - want) - Math.abs(count(b) - want))[0] || '';
  const lines = count(text);
  if (Math.abs(lines - want) > 4) { console.log('✗ 길이 이상', title, lines, '(예상', want + ')'); continue; }
  // 옛한글 자모가 있으면 폰에서 깨질 수 있어 제외, 한자는 괄호 병기 정도(5자 이하)만 허용
  const jamo = (text.match(/[\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]/g) || []).length;
  const hanja = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
  if (jamo > 0 || hanja > 5) { console.log('✗ 옛 표기', title, `자모 ${jamo} · 한자 ${hanja}`); continue; }
  const ok = lines > 0 && lines <= 20;
  console.log(ok ? '✓' : '✗', `${title} (${author}) ← ${pageTitle} · ${lines}줄`);
  if (ok) out.push({ title, author, tags, lines, source: `https://ko.wikisource.org/wiki/${encodeURIComponent(pageTitle)}`, text });
}

writeFileSync(new URL('../lib/poems.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(`저장: ${out.length}편 → lib/poems.json`);
