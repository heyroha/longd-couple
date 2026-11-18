// 날씨: 기상청 단기예보(공공데이터포털, KMA_API_KEY) 우선 → 없거나 실패하면 Open-Meteo(무료, 키 없음)
// 하루 요약은 "하루 중 가장 나쁜 날씨 하나"가 아니라 깨어 있는 시간(7~22시) 위주로:
//   오전(7~12) · 오후(12~18) · 저녁(18~22) 각각의 하늘 → "오전 흐림, 오후 맑음" 처럼
const KMA_KEY = process.env.KMA_API_KEY || '';

// ---------- 공통 ----------
const kstNow = () => new Date(Date.now() + 9 * 3600e3); // UTC 메서드로 읽으면 한국 시각
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const PARTS = [['오전', 7, 12], ['오후', 12, 18], ['저녁', 18, 23]];
const RANK = { sun: 0, cloud: 1, rain: 2, snow: 3 };
// 시간대별 [하늘(sun|partly|cloud|overcast), 강수(rain|snow|null), 강수확률] → 요약
function summarize(hours, nowHour) {
  const desc = (h) => (h.pty === 'snow' ? '눈' : h.pty === 'rain' ? '비' : h.sky === 'sun' ? '맑음' : h.sky === 'partly' ? '구름 조금' : h.sky === 'cloud' ? '구름 많음' : '흐림');
  const tagOf = (h) => (h.pty === 'snow' ? 'snow' : h.pty === 'rain' ? 'rain' : h.sky === 'sun' || h.sky === 'partly' ? 'sun' : 'cloud');
  const parts = [];
  for (const [name, a, b] of PARTS) {
    const hs = hours.filter((h) => h.hour >= a && h.hour < b); if (!hs.length) continue;
    // 그 시간대에 비·눈이 확실하면(강수확률 60% 이상, 2시간 이상) 비/눈, 아니면 가장 많이 나온 하늘
    const wet = hs.filter((h) => h.pty && (h.pop ?? 100) >= 60);
    let pick;
    if (wet.length >= 2 || (wet.length && hs.length <= 2)) pick = wet.find((h) => h.pty === 'snow') || wet[0];
    else { const cnt = {}; hs.forEach((h) => (cnt[h.sky] = (cnt[h.sky] || 0) + 1)); const top = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0][0]; pick = { sky: top, pty: null }; }
    parts.push({ name, label: desc(pick), tag: tagOf(pick), pop: Math.max(0, ...hs.map((h) => h.pop ?? 0)) });
  }
  if (!parts.length) return { label: '알 수 없음', tag: 'cloud', parts };
  const same = parts.every((p) => p.label === parts[0].label);
  const groups = []; // 이웃한 같은 날씨는 합침: "오전~오후 구름 조금, 저녁 맑음"
  for (const p of parts) { const g = groups[groups.length - 1]; if (g && g.label === p.label) g.to = p.name; else groups.push({ from: p.name, to: p.name, label: p.label }); }
  const label = same ? parts[0].label : groups.map((g) => `${g.from === g.to ? g.from : `${g.from}~${g.to}`} ${g.label}`).join(', ');
  const tag = parts.reduce((t, p) => (RANK[p.tag] > RANK[t] ? p.tag : t), 'sun'); // 시·아이콘은 그중 가장 궂은 쪽
  return { label, tag, parts };
}

// ---------- 기상청 단기예보 ----------
// 위경도 → 기상청 격자(nx, ny): 람베르트 정각원추도법 (기상청 제공 공식)
function toGrid(lat, lng) {
  const RE = 6371.00877 / 5.0, DEG = Math.PI / 180, s1 = 30 * DEG, s2 = 60 * DEG, olon = 126 * DEG, olat = 38 * DEG;
  let sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(Math.tan(Math.PI / 4 + s2 / 2) / Math.tan(Math.PI / 4 + s1 / 2));
  const sf = (Math.tan(Math.PI / 4 + s1 / 2) ** sn * Math.cos(s1)) / sn, ro = (RE * sf) / Math.tan(Math.PI / 4 + olat / 2) ** sn;
  const ra = (RE * sf) / Math.tan(Math.PI / 4 + lat * DEG / 2) ** sn;
  let th = lng * DEG - olon; if (th > Math.PI) th -= 2 * Math.PI; if (th < -Math.PI) th += 2 * Math.PI; th *= sn;
  return { nx: Math.floor(ra * Math.sin(th) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(th) + 136 + 0.5) };
}
// 오늘 하루치가 다 들어 있는 발표: 오늘 02시 발표 (02:15 전이면 어제 23시)
function baseTime() {
  const n = kstNow(), hm = n.getUTCHours() * 60 + n.getUTCMinutes();
  if (hm >= 2 * 60 + 15) return { date: ymd(n), time: '0200' };
  return { date: ymd(new Date(n.getTime() - 86400e3)), time: '2300' };
}
async function kma(lat, lng) {
  const { nx, ny } = toGrid(lat, lng), b = baseTime();
  const url = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?' + new URLSearchParams({ serviceKey: KMA_KEY, pageNo: '1', numOfRows: '1000', dataType: 'JSON', base_date: b.date, base_time: b.time, nx: String(nx), ny: String(ny) });
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`기상청 ${res.status}`);
  const text = await res.text();
  let d; try { d = JSON.parse(text); } catch { throw new Error(`기상청 응답 이상: ${text.slice(0, 80)}`); } // 키 오류는 XML 로 옴
  const code = d.response?.header?.resultCode;
  if (code !== '00') throw new Error(`기상청 ${code} ${d.response?.header?.resultMsg || ''}`);
  const items = d.response.body.items.item, today = ymd(kstNow());
  const by = {}; // 시각 → { TMP, SKY, PTY, POP }
  let tmx = null, tmn = null;
  for (const it of items) {
    if (it.fcstDate !== today) continue;
    const h = Number(it.fcstTime.slice(0, 2)), v = it.fcstValue;
    (by[h] ||= { hour: h })[it.category] = v;
    if (it.category === 'TMX') tmx = Number(v); if (it.category === 'TMN') tmn = Number(v);
  }
  const hours = Object.values(by).filter((h) => h.SKY).map((h) => ({
    hour: h.hour, temp: Number(h.TMP),
    sky: h.SKY === '1' ? 'sun' : h.SKY === '3' ? 'cloud' : 'overcast',
    pty: ['1', '4'].includes(h.PTY) ? 'rain' : ['2', '3'].includes(h.PTY) ? (h.PTY === '3' ? 'snow' : 'rain') : null,
    pop: Number(h.POP),
  })).sort((a, b2) => a.hour - b2.hour);
  if (!hours.length) throw new Error('기상청 오늘 예보 없음');
  const nowH = kstNow().getUTCHours(), temps = hours.map((h) => h.temp);
  const s = summarize(hours, nowH), awake = hours.filter((h) => h.hour >= 7 && h.hour < 23);
  const cur = hours.reduce((a, h) => (Math.abs(h.hour - nowH) < Math.abs(a.hour - nowH) ? h : a), hours[0]);
  return { ...s, now: Math.round(cur.temp), max: Math.round(tmx ?? Math.max(...temps)), min: Math.round(tmn ?? Math.min(...temps)), rain: Math.max(0, ...(awake.length ? awake : hours).map((h) => h.pop)), source: '기상청' };
}

// ---------- Open-Meteo (예비) ----------
function fromWmo(code) { // WMO 날씨 코드 → 하늘·강수
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { sky: 'overcast', pty: 'snow' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return { sky: 'overcast', pty: 'rain' };
  return { sky: code === 0 ? 'sun' : code === 1 ? 'partly' : code === 2 ? 'cloud' : 'overcast', pty: null };
}
async function openMeteo(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,weather_code&hourly=weather_code,precipitation_probability,temperature_2m' +
    '&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=1';
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`날씨 조회 실패 ${res.status}`);
  const d = await res.json();
  const hours = (d.hourly?.time || []).map((t, i) => ({ hour: Number(t.slice(11, 13)), temp: d.hourly.temperature_2m[i], pop: d.hourly.precipitation_probability?.[i] ?? null, ...fromWmo(d.hourly.weather_code[i]) }));
  const s = summarize(hours, kstNow().getUTCHours()), awake = hours.filter((h) => h.hour >= 7 && h.hour < 23);
  return { ...s, now: Math.round(d.current?.temperature_2m ?? NaN), max: Math.round(d.daily?.temperature_2m_max?.[0] ?? NaN), min: Math.round(d.daily?.temperature_2m_min?.[0] ?? NaN), rain: awake.length ? Math.max(0, ...awake.map((h) => h.pop ?? 0)) : null, source: 'Open-Meteo' };
}

async function today(lat, lng) {
  if (KMA_KEY) {
    try { return await kma(lat, lng); } catch (e) { console.error('[기상청 날씨 실패 → Open-Meteo]', e.message); }
  }
  return openMeteo(lat, lng);
}
// 예전 코드 호환: WMO 코드 하나 → { label, tag }
function describe(code) { const s = summarize([{ hour: 12, pop: 100, ...fromWmo(code) }], 0); return { label: s.label, tag: s.tag }; }

module.exports = { today, describe, toGrid, summarize, kmaEnabled: Boolean(KMA_KEY) };
