// 레시피 대표 이미지 자동 검색: Pexels (무료 API 키, 시간당 200회)
const KEY = process.env.PEXELS_API_KEY || '';
const enabled = Boolean(KEY);

async function findFoodPhoto(query) {
  if (!enabled || !query) return null;
  const url = `https://api.pexels.com/v1/search?${new URLSearchParams({ query, per_page: '5', orientation: 'square', locale: 'ko-KR' })}`;
  const res = await fetch(url, { headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Pexels ${res.status}`);
  const data = await res.json();
  const p = data.photos?.[0];
  if (!p) return null;
  return {
    image_url: p.src?.medium || p.src?.large || p.src?.original,
    image_credit: `Photo by ${p.photographer} on Pexels`,
  };
}

module.exports = { findFoodPhoto, enabled };
