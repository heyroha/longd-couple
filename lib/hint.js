// 우체통: 매일 17:00, 상대방이 오늘 레시피 채팅에서 찾아본 것을 까치가 살짝 귀띔
// "오늘 지민공주가 매콤한 음식이 당기나봐요!" + 근거 "~했어요 짹짹-!"
const gemini = require('./gemini');

const OTHER = { boy: 'girl', girl: 'boy' };
const KST = 9 * 3600e3;

// 한국 날짜 (YYYY-MM-DD) 와 그날 0시의 UTC 시각
function kstDay(now = new Date()) {
  const k = new Date(now.getTime() + KST);
  const day = k.toISOString().slice(0, 10);
  const startIso = new Date(Date.parse(`${day}T00:00:00Z`) - KST).toISOString();
  return { day, startIso };
}

// 받침 있으면 "을", 없으면 "를"
const eulReul = (w) => {
  const c = w.trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 ? ((c - 0xac00) % 28 ? '을' : '를') : '을(를)';
};

function fallbackHint(aboutName, searches) {
  const titles = [...new Set(searches.map((s) => s.recipe_title).filter(Boolean))];
  const shown = (titles.length ? titles : searches.map((s) => s.question.slice(0, 18))).slice(0, 3);
  const what = shown[0];
  return {
    title: `오늘 ${aboutName}님이 ${what}${eulReul(what)} 먹고 싶나봐요!`,
    body: `${aboutName}님이 오늘 레시피를 ${searches.length}번 찾아봤어요. 저녁 메뉴 고민 중인가 봐요!`,
    evidence: `오늘 ${shown.map((t) => `"${t}"`).join(', ')}${eulReul(shown[shown.length - 1])} 찾아봤어요 짹짹-!`,
  };
}

/**
 * @param {string} aboutName 검색한 사람 이름
 * @param {string} toName    힌트 받는 사람 이름
 * @param {{question:string, recipe_title:string, created_at:string}[]} searches 오늘 검색
 */
async function composeHint({ aboutName, toName, searches }) {
  let hint = fallbackHint(aboutName, searches);
  if (!gemini.enabled) return hint;
  const list = searches.slice(0, 15).map((s, i) => {
    const t = new Date(new Date(s.created_at).getTime() + KST).toISOString().slice(11, 16);
    return `${i + 1}. (${t}) "${s.question.slice(0, 120)}"${s.recipe_title ? ` → 추천: ${s.recipe_title}` : ''}`;
  }).join('\n');
  try {
    const { text } = await gemini.generate({
      json: true,
      temperature: 0.8,
      system:
        '너는 커플 앱 "롱디\'s 월례"의 우체통에 사는 수다쟁이 까치야. ' +
        `"${aboutName}"이(가) 오늘 레시피 채팅에서 찾아본 내용을 보고, 연인 "${toName}"에게 살짝 귀띔해 준다. ` +
        '규칙: 1) title: "오늘 ' + aboutName + '님이 ~한 음식을 먹고 싶나봐요!" 처럼 무엇이 당기는지, 또는 검색 패턴으로 마음 상태를 귀엽게 추측 ' +
        '(예: 술·안주를 자주 찾으면 "스트레스가 많은가봐요!", 단 걸 많이 찾으면 "당이 떨어지나봐요!", 국물·죽이면 "몸이 으슬으슬한가봐요!"). 30자 안팎. ' +
        '2) body: ' + toName + '에게 오늘 저녁 챙겨줄 만한 한 가지 제안, 1~2문장, 존댓말. ' +
        '3) evidence: 실제 검색 내용 1~3개를 짧게 근거로 들고 반드시 "~했어요 짹짹-!"으로 끝낸다. ' +
        '4) 검색 원문을 길게 그대로 옮기거나, 없는 내용을 지어내지 말 것. 걱정을 과장하지 말고 가볍고 다정하게. ' +
        'JSON {"title":"","body":"","evidence":""} 로만 답해.',
      messages: [{ role: 'user', text: `오늘 ${aboutName}의 레시피 검색 ${searches.length}건:\n${list}` }],
    });
    const p = gemini.extractJson(text) || JSON.parse(text);
    if (p?.title && p?.evidence) {
      let evidence = String(p.evidence).trim().slice(0, 240);
      if (!/짹짹-!$/.test(evidence)) evidence = evidence.replace(/[.!~]*$/, '') + ' 짹짹-!';
      hint = { title: String(p.title).slice(0, 60), body: String(p.body || '').slice(0, 300), evidence };
    }
  } catch (e) {
    console.error('[힌트] Gemini 실패 → 기본 문장:', e.message);
  }
  return hint;
}

module.exports = { composeHint, kstDay, OTHER };
