// Google Gemini (무료 등급) 호출. 키가 없으면 enabled=false → 호출하는 쪽에서 대체 문구 사용
// 무료 등급은 토큰 비용 0원 (대신 하루 호출 수 제한, 입력 내용이 구글 서비스 개선에 쓰일 수 있음)

const KEY = process.env.GEMINI_API_KEY || '';
// 앞에서부터 차례로 시도 (혼잡 503 · 무료 한도 429 · 단종 404 이면 다음 모델)
const MODELS = (process.env.GEMINI_MODEL || 'gemini-3.5-flash,gemini-3.1-flash-lite,gemini-3.8-flash,gemini-flash-latest')
  .split(',').map((m) => m.trim()).filter(Boolean);
const MODEL = MODELS[0];
const enabled = Boolean(KEY);
// 구글 검색 연동은 무료 키 한도가 0인 경우가 많아 기본은 끔 (GEMINI_SEARCH=1 이면 시도)
const SEARCH_ON = process.env.GEMINI_SEARCH === '1';
let searchBlockedUntil = 0; // 무료 키는 구글 검색 연동 한도가 0일 수 있음 → 한 번 막히면 1시간 동안 검색 없이

async function callModel(model, body, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(`Gemini ${model} ${res.status}: ${data.error?.message || ''}`.slice(0, 300));
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {object} o
 * @param {string} o.system   시스템 지시
 * @param {{role:'user'|'model', text:string}[]} o.messages 대화
 * @param {boolean} [o.search] 구글 검색 연동(근거 링크) — 무료 한도를 넘으면 검색 없이 다시 시도
 * @param {boolean} [o.json]   JSON으로만 답하게 (search와 같이 못 씀)
 */
async function generate({ system, messages, search = false, json = false, temperature = 0.8, timeoutMs = 18000 }) {
  if (!enabled) throw new Error('GEMINI_API_KEY 가 없어요');
  const make = (withSearch) => ({
    system_instruction: system ? { parts: [{ text: system }] } : undefined,
    contents: messages.map((m) => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] })),
    tools: withSearch ? [{ google_search: {} }] : undefined,
    generationConfig: { temperature, ...(json && !withSearch ? { responseMimeType: 'application/json' } : {}) },
  });

  const started = Date.now();
  let lastErr;
  let quotaHits = 0; // 무료 한도 초과(429) 횟수
  const parse = (data, model, withSearch) => {
    const cand = data.candidates?.[0];
    const text = (cand?.content?.parts || []).map((p) => p.text || '').join('').trim();
    if (!text) throw new Error(`Gemini ${model}: 빈 답변`);
    const sources = (cand?.groundingMetadata?.groundingChunks || [])
      .map((c) => c.web && { title: c.web.title, uri: c.web.uri })
      .filter(Boolean)
      .slice(0, 5);
    return { text, sources, model, searched: withSearch };
  };

  // 1) 검색 연동 (켜져 있고 한도가 남았을 때만)
  if (search && SEARCH_ON && Date.now() > searchBlockedUntil) {
    try { return parse(await callModel(MODELS[0], make(true), timeoutMs), MODELS[0], true); }
    catch (e) { lastErr = e; if (e.status === 429) searchBlockedUntil = Date.now() + 60 * 60 * 1000; }
  }

  // 2) 앞의 두 모델에 동시에 물어보고 먼저 온 답 사용 (무료 모델이 자주 혼잡해서)
  const race = MODELS.slice(0, 2);
  try {
    return await Promise.any(race.map(async (m) => parse(await callModel(m, make(false), timeoutMs), m, false)));
  } catch (e) {
    lastErr = (e.errors && e.errors[0]) || e;
    quotaHits += (e.errors || [e]).filter((x) => x.status === 429).length;
    console.error('[Gemini] 동시 시도 실패:', (e.errors || [e]).map((x) => x.message.slice(0, 80)).join(' / '));
  }

  // 3) 나머지 모델 차례로
  for (const model of MODELS.slice(2)) {
    if (Date.now() - started > 40000) break;
    try { return parse(await callModel(model, make(false), timeoutMs), model, false); }
    catch (e) { lastErr = e; if (e.status === 429) quotaHits++; console.error('[Gemini]', e.message.slice(0, 120)); }
  }
  const err = lastErr || new Error('Gemini 응답 없음');
  err.quota = quotaHits > 0; // 한 모델이라도 무료 한도 초과면 "오늘 다 썼어" 안내
  throw err;
}

// 응답 텍스트에서 ```json ... ``` 또는 {...} 블록 꺼내기
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : (text.match(/\{[\s\S]*\}/) || [])[0];
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

module.exports = { generate, extractJson, enabled, MODEL, MODELS };
