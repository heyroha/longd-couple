// 매일 11:30 편지: 받는 사람 위치의 날씨 + 날씨에 어울리는 사랑 시(20줄 이하) + 보내는 사람 말투
// 받는 사람 = 각 캐릭터(boy/girl), 보내는 사람 = 반대 캐릭터
const weather = require('./weather');
const gemini = require('./gemini');
const POEMS = require('./poems.json');

const OTHER = { boy: 'girl', girl: 'boy' };

const SEASON = (m) => (m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter');
const SEASON_KO = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };

// 오늘 날씨·계절에 맞는 후보 시 n편 (최근 보낸 시 제외, 사랑·그리움 시 우선)
function candidates(tag, season, recentTitles = [], n = 24) {
  const fresh = POEMS.filter((p) => !recentTitles.includes(p.title));
  const pool = fresh.length >= n ? fresh : POEMS;
  const score = (p) =>
    (p.tags.includes(tag) ? 3 : p.tags.includes('any') ? 1 : 0) +
    ((p.season || []).includes(season) ? 2 : (p.season || []).includes('any') ? 0.5 : 0) +
    (p.love ?? 2) * 1.5 + Math.random() * 3; // 매일 조금씩 다른 후보
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, n);
}

function pickPoem(tag, recentTitles = [], season = SEASON(new Date().getMonth() + 1)) {
  const top = candidates(tag, season, recentTitles, 6);
  return top[Math.floor(Math.random() * top.length)];
}

function styleText(card) {
  if (!card || !Object.keys(card).length) return '';
  const parts = [];
  if (card.callsPartner?.length) parts.push(`상대를 부르는 호칭: ${card.callsPartner.join(', ')}`);
  if (card.endings?.length) parts.push(`자주 쓰는 말끝: ${card.endings.join(', ')}`);
  if (card.phrases?.length) parts.push(`자주 쓰는 표현: ${card.phrases.join(', ')}`);
  if (card.emoji?.length) parts.push(`자주 쓰는 이모티콘/웃음: ${card.emoji.join(' ')}`);
  if (card.samples?.length) parts.push(`실제 말투 예시:\n- ${card.samples.slice(0, 12).join('\n- ')}`);
  return parts.join('\n');
}

// 포춘쿠키 (AI가 안 될 때 고르는 기본 운세)
const FORTUNES = [
  '작은 친절이 큰 행운으로 돌아오는 날이에요.', '오늘 마주치는 웃음이 하루를 바꿔줄 거예요.', '기다리던 연락이 올지도 몰라요.',
  '천천히 가도 괜찮아요. 오늘은 방향이 더 중요해요.', '따뜻한 말 한마디가 행운의 열쇠예요.', '생각지 못한 곳에서 기분 좋은 일이 생겨요.',
  '오늘의 용기가 내일의 자랑이 될 거예요.', '맛있는 걸 먹으면 운이 두 배가 돼요.', '보고 싶은 사람에게 먼저 연락해 보세요.',
  '작은 계획 하나를 끝내면 큰 뿌듯함이 와요.', '오늘은 웃는 얼굴이 제일 잘 어울려요.', '좋아하는 노래가 행운을 불러와요.',
];
const LUCKY_COLORS = ['연분홍', '하늘색', '레몬색', '민트색', '라벤더', '크림색', '코랄', '하얀색'];
const LUCKY_ITEMS = ['목도리', '따뜻한 음료', '귤', '손편지', '좋아하는 펜', '이어폰', '핸드크림', '사탕', '머리끈', '책갈피'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function fallbackDaily({ toName, area, w }) {
  const rainLine = w.rain != null && w.rain >= 50 ? ` 비 올 확률이 ${w.rain}%라 우산을 꼭 챙겨요.` : '';
  const cold = w.min <= 3 ? ' 아침저녁으로 꽤 추우니 두툼한 외투가 좋아요.' : w.min <= 10 ? ' 쌀쌀하니 겉옷 하나 챙겨요.' : '';
  return {
    title: `${toName}의 오늘 날씨와 운세`,
    body: `오늘 ${area || '있는 곳'}은 ${w.label}, 낮 최고 ${w.max}도 / 최저 ${w.min}도예요.${cold}${rainLine}`,
    fortune: { text: pick(FORTUNES), color: pick(LUCKY_COLORS), item: pick(LUCKY_ITEMS), number: 1 + Math.floor(Math.random() * 99) },
  };
}

async function composeOne({ toAvatar, people, styleCards, recentTitles }) {
  const me = people[toAvatar];
  const from = people[OTHER[toAvatar]] || {};
  const toName = me.name || (toAvatar === 'girl' ? '지민' : '준호');
  const fromName = from.name || (toAvatar === 'girl' ? '준호' : '지민');
  const w = await weather.today(me.lat, me.lng);
  const kstMonth = new Date(Date.now() + 9 * 3600e3).getUTCMonth() + 1;
  const season = SEASON(kstMonth);
  const list = candidates(w.tag, season, recentTitles);
  let poem = list[Math.floor(Math.random() * Math.min(6, list.length))];

  let daily = fallbackDaily({ toName, area: me.area, w });
  if (gemini.enabled) {
    try {
      const menu = list.map((p, i) => {
        const head = p.text.split('\n').filter((l) => l.trim()).slice(0, 3).join(' / ');
        return `${i}. ${p.author} 「${p.title}」 (${(p.mood || []).join(', ')}) — ${head}`;
      }).join('\n');
      const { text } = await gemini.generate({
        json: true,
        temperature: 0.9,
        system:
          '너는 커플 앱 "롱디\'s 월례"의 아침 알리미야. 다정하고 귀여운 존댓말(~해요)로 짧게 쓴다. 과장하지 않는다. ' +
          '반드시 JSON {"pick": 고른 시 번호, "title": 제목(18자 이내), "briefing": 날씨 브리핑, "fortune": {"text": 포춘쿠키 운세 한두 문장, "color": 행운의 색, "item": 행운의 물건, "number": 1~99 숫자}} 로만 답해.',
        messages: [{
          role: 'user',
          text:
            `오늘: ${kstMonth}월 (${SEASON_KO[season]}), ${toName}이(가) 있는 곳: ${me.area || '알 수 없음'}\n` +
            `오늘 날씨: ${w.label}, 지금 ${w.now}도, 최고 ${w.max}도 / 최저 ${w.min}도, 강수확률 ${w.rain ?? '?'}%\n\n` +
            `1) briefing: 오늘 날씨를 2~3문장으로 브리핑하고 옷차림·우산 같은 챙김 한마디.\n` +
            `2) fortune: 포춘쿠키에서 나온 것 같은 오늘의 운세 한두 문장 (긍정적이고 귀엽게, 연애·일상 소소한 내용). 읽는 사람에게 직접 말하듯 쓰고 이름은 쓰지 말 것.\n` +
            `3) pick: 아래 사랑 시 후보 중 오늘 날씨·계절에 가장 어울리는 시 번호 (번호. 시인 「제목」 (분위기) — 첫 줄들):\n${menu}`,
        }],
      });
      const parsed = gemini.extractJson(text) || JSON.parse(text);
      const chosen = list[Number(parsed?.pick)];
      if (chosen) poem = chosen;
      if (parsed?.briefing) {
        const f = parsed.fortune || {};
        daily = {
          title: String(parsed.title || daily.title).slice(0, 40),
          body: String(parsed.briefing).slice(0, 600),
          fortune: {
            text: String(f.text || daily.fortune.text).slice(0, 200),
            color: String(f.color || daily.fortune.color).slice(0, 20),
            item: String(f.item || daily.fortune.item).slice(0, 20),
            number: Number(f.number) >= 1 && Number(f.number) <= 99 ? Math.round(Number(f.number)) : daily.fortune.number,
          },
        };
      }
    } catch (e) {
      console.error('[오늘의 편지] Gemini 실패 → 기본 문장 사용:', e.message);
    }
  }

  return {
    kind: 'daily',
    to_avatar: toAvatar,
    from_name: fromName,
    to_name: toName,
    title: daily.title,
    body: daily.body,
    fortune: daily.fortune,
    poem_title: poem.title,
    poem_author: poem.author,
    poem_text: poem.text,
    weather: { ...w, area: me.area || '' },
  };
}

module.exports = { composeOne, pickPoem, candidates, OTHER, POEMS };
