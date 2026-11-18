// 레시피 대표 이미지 자동 검색
//  1) Pixabay (무료 키) — "일러스트"로 먼저 찾고, 없으면 벡터 → 사진
//     Pixabay는 이미지 주소를 오래 걸어두면 안 돼서(핫링크 금지) 받아서 data URL로 저장
//  2) Pexels (무료 키, 사진) — Pixabay 키가 없거나 못 찾으면
const pexels = require('./pexels');

const PIXABAY = process.env.PIXABAY_API_KEY || '';
const enabled = Boolean(PIXABAY) || pexels.enabled;
const OK_TYPE = /^image\/(jpeg|png|webp)$/;

async function toDataUrl(url, maxBytes = 900 * 1024) {
  const res = await fetch(url);
  const type = (res.headers.get('content-type') || '').split(';')[0];
  if (!res.ok || !OK_TYPE.test(type)) throw new Error(`이미지 받기 실패 ${res.status} ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('이미지가 너무 커요');
  return `data:${type};base64,${buf.toString('base64')}`;
}

async function pixabay(query) {
  for (const type of ['illustration', 'vector', 'photo']) {
    const url = `https://pixabay.com/api/?${new URLSearchParams({
      key: PIXABAY, q: query.slice(0, 100), image_type: type, safesearch: 'true', per_page: '5', order: 'popular',
    })}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pixabay ${res.status}`);
    const hit = (await res.json()).hits?.[0];
    if (!hit) continue;
    const full = hit.webformatURL;
    const thumb = full.replace(/_640\./, '_180.'); // 목록 카드용 작은 그림 (용량 ↓)
    return {
      image_full: await toDataUrl(full),
      image_thumb: await toDataUrl(thumb).catch(() => ''),
      image_url: '',
      image_credit: `${type === 'photo' ? 'Photo' : 'Illustration'} by ${hit.user} on Pixabay`,
    };
  }
  return null;
}

/** @param {string} query 영어 검색어 (예: "kimchi stew") */
async function findFoodImage(query) {
  if (!query) return null;
  if (PIXABAY) {
    try {
      const r = await pixabay(`${query} food`) || await pixabay(query);
      if (r) return r;
    } catch (e) { console.error('[Pixabay 실패]', e.message); }
  }
  if (pexels.enabled) return pexels.findFoodPhoto(query);
  return null;
}

module.exports = { findFoodImage, enabled, provider: PIXABAY ? 'Pixabay' : pexels.enabled ? 'Pexels' : '' };
