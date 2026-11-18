// 우리 동네 요리 미니게임: 레시피 순서를 한 줄씩 읽어서 그 줄에 맞는 손질·조리 단계로 진행
//   손질: 씻기 · 물기 닦기 · 썰기(한입/채/송송) · 다지기 · 달걀 깨기 · 간하기 · 섞기 · 붓기
//   조리: 인덕션(굽기·볶기·끓이기·졸이기) · 에어프라이어 · 토스터 · 전자레인지 · 접시에 담기
// TOWN_COOK.play({ root, recipe, need, match(line) → [{id,name}], foodSrc(id), beep, melody }) → Promise<{ stars, quit }>
(function () {
  const W = 320, H = 240;
  const FONT = (s, b) => `${b ? 'bold ' : ''}${s}px Galmuri11, "Apple SD Gothic Neo", sans-serif`;

  // ---------- 레시피 한 줄 → 단계들 ----------
  const KEYS = [
    ['airfry', /에어\s?프라이|오븐/], ['toast', /토스터|토스트기|토스트를?\s?구/], ['micro', /전자\s?레인지/],
    ['wash', /담가|핏물|불려|씻어|씻고|씻기|헹궈|헹구/], ['wipe', /물기를?\s?(닦|제거|털)|키친\s?타월/],
    ['crack', /(달걀|계란)을?\s?(깨|톡)|깨뜨|깨서|깨 넣/], ['mince', /다져|다지고|다지기|으깨/], ['julienne', /채\s?(썰|썬)/],
    ['chop', /송송|어슷|썰어|썰고|썰기|썬다|썬\s|자르|자른|잘라|토막|깍둑|손질/], ['season', /뿌려|뿌리고|밑간|간을|간해|간하/],
    ['mix', /섞어|섞고|섞기|섞는|섞은|버무|저어|젓는|반죽|풀어|비벼|비빈|비비|무쳐|무친|무치/], ['pour', /부어|붓고|두르고|둘러/],
    ['boil', /삶|끓|데쳐|데치|쪄|찐다|찌기|찜기/], ['simmer', /졸여|조려|졸이|조리고/],
    ['stirfry', /볶아|볶고|볶다|볶으|볶기|볶는|볶은/], ['fry', /구워(?!둔|진)|굽고|굽기|굽는|구운다|노릇|부쳐|부친|부치|부침|지져|지진|익혀|익힌|프라이|튀겨|튀긴|튀기/], ['warm', /데워|데우|데운/],
    ['wait', /재워|숙성|식혀|휴지/], ['plate', /담고|담아|담기|담는|올려|올리고(?!당)|올린다|완성|마무리|곁들/],
  ];
  const APPL = ['airfry', 'toast', 'micro'];
  const LABEL = { airfry: '에어프라이어', toast: '토스터', micro: '전자레인지', wash: '씻기', wipe: '물기 닦기', crack: '달걀 깨기', mince: '다지기', julienne: '채 썰기', chop: '썰기', season: '간하기', mix: '섞기', pour: '붓기', boil: '끓이기', simmer: '졸이기', stirfry: '볶기', fry: '굽기', wait: '기다리기', plate: '담기' };
  const SEASONING = /소금|후추|간장|설탕|가루|기름|오일|맛술|올리고당|식초|물엿|소스|버터|마요|케첩|참깨|깨/;
  const heatOf = (t, d) => (/약불|약한 불|중약불/.test(t) ? 1 : /중불|중간 불/.test(t) ? 2 : /강불|센불|센 불|강한 불/.test(t) ? 3 : d);
  const numOf = (t, re, d) => { const m = t.match(re); return m ? Number(m[1]) : d; };
  function plan(o) {
    const lines = String(o.recipe.steps || '').split(/\n+/).map((l) => l.replace(/^\s*\d+\s*[.)]\s*/, '').trim()).filter(Boolean);
    const need = o.need.map((n) => ({ id: n.id, name: n.name }));
    const mains = need.filter((n) => !SEASONING.test(n.name));
    let lastMain = mains[0] || need[0] || null;
    const steps = [];
    for (const line of lines) {
      const hits = [];
      for (const [type, re] of KEYS) { const m = line.match(re); if (m) hits.push([m.index, type]); }
      hits.sort((a, b) => a[0] - b[0]);
      let types = [...new Set(hits.map((h) => h[1]))];
      if (types.some((t) => APPL.includes(t))) types = types.filter((t) => !['fry', 'warm', 'boil', 'stirfry'].includes(t));
      types = types.map((t) => (t === 'warm' ? (/팬/.test(line) ? 'fry' : 'micro') : t));
      if (types.includes('simmer')) types = types.filter((t) => t !== 'boil');
      if (types.includes('julienne')) types = types.filter((t) => t !== 'chop');
      types = [...new Set(types)].slice(0, 2);
      const items = o.match(line) || [];
      const main = items.find((n) => !SEASONING.test(n.name)) || null;
      if (main) lastMain = main;
      for (const type of types) steps.push({ type, line, item: main || lastMain, items, after: steps.length && steps[steps.length - 1].type === 'plate' });
    }
    if (!steps.length) { // 순서가 없는 레시피: 재료로 기본 흐름
      if (lastMain) steps.push({ type: 'chop', line: `${lastMain.name} 손질하기`, item: lastMain, items: [lastMain] });
      steps.push({ type: 'stirfry', line: '팬에 볶기', item: lastMain, items: need });
      steps.push({ type: 'plate', line: '그릇에 담기', item: lastMain, items: need });
    }
    return steps.slice(0, 12);
  }

  // ---------- 그리기 도구 ----------
  const imgs = {};
  let SRC = (id) => (window.TOWN_ICONS && TOWN_ICONS.foodSrc ? TOWN_ICONS.foodSrc(id) : `icons/town/food/${id}.svg`);
  function img(id) { if (!id) return null; if (!imgs[id]) { const im = new Image(); im.src = SRC(id); imgs[id] = im; } const im = imgs[id]; return im.complete && im.naturalWidth ? im : null; }
  function rr(g, x, y, w, h, r, fill, stroke, lw = 2) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function circ(g, x, y, r, fill, stroke, lw = 2) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function ell(g, x, y, rx, ry, fill, stroke, lw = 2) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
  function txt(g, s, x, y, size = 12, col = '#4a3036', align = 'center', bold = false) { g.font = FONT(size, bold); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  const lerp = (a, b, t) => a + (b - a) * t;
  function mixCol(c1, c2, t) { const p = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (c.match(/\d+/g) || [0, 0, 0]).slice(0, 3).map(Number)); const a = p(c1), b = p(c2); return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], Math.max(0, Math.min(1, t))))).join(',')})`; }
  const OUT = '#6b4430';
  function rawCol(item) { const n = item ? item.name : ''; return /닭|고기|돼지|소|삼겹|베이컨|햄|스테이크|갈비|목살|연어|새우/.test(n) ? '#f4b2a4' : /빵|토스트|떡|감자|고구마/.test(n) ? '#f5deb0' : /달걀|계란|두부/.test(n) ? '#fff3d0' : /버섯|양파|마늘/.test(n) ? '#efe6d2' : /고추|파|시금치|브로콜리|호박/.test(n) ? '#9fd27a' : '#f0d79a'; }
  function doneCol(item, c) { const raw = rawCol(item); return c < 0.65 ? mixCol(raw, '#e2a64e', c / 0.65) : c < 1 ? mixCol('#e2a64e', '#b86a2a', (c - 0.65) / 0.35) : mixCol('#b86a2a', '#3a2418', Math.min(1, (c - 1) / 0.4)); }
  // 익을수록 노릇 → 갈색으로 (재료 그림 위에 색을 덧입힘)
  const cookCache = {};
  function cookedImg(item, c) {
    const im = img(item && item.id); if (!im) return null;
    const q = Math.max(0, Math.min(14, Math.round(c * 10))), key = `${item.id}|${q}`;
    if (cookCache[key]) return cookCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = 96; const x = cv.getContext('2d');
    x.drawImage(im, 0, 0, 96, 96);
    if (q > 0) { x.globalCompositeOperation = 'source-atop'; const k = q / 10; x.fillStyle = k < 0.65 ? `rgba(226,150,60,${k * 0.55})` : k < 1 ? `rgba(190,110,40,${0.36 + (k - 0.65) * 0.6})` : `rgba(60,34,20,${Math.min(0.85, 0.5 + (k - 1) * 0.9)})`; x.fillRect(0, 0, 96, 96); }
    return (cookCache[key] = cv);
  }
  function cookedFood(g, item, x, y, s, c, rot = 0) { const cv = cookedImg(item, c); if (!cv) { ell(g, x, y, s * 0.42, s * 0.3, doneCol(item, c), OUT); return; } g.save(); g.translate(x, y); g.rotate(rot); g.drawImage(cv, -s / 2, -s / 2, s, s); g.restore(); }
  function food(g, item, x, y, s, rot = 0) { // 재료 그림 (없으면 동글 덩어리)
    const im = img(item && item.id);
    g.save(); g.translate(x, y); g.rotate(rot);
    if (im) g.drawImage(im, -s / 2, -s / 2, s, s);
    else { ell(g, 0, 0, s * 0.42, s * 0.3, rawCol(item), OUT); txt(g, item ? item.name.slice(0, 4) : '재료', 0, 0, 9, OUT); }
    g.restore();
  }
  function bottle(g, x, y, w, h, body, cap, label) { rr(g, x, y + h * 0.3, w, h * 0.7, 5, body, OUT, 2); rr(g, x + w * 0.3, y, w * 0.4, h * 0.34, 3, body, OUT, 2); rr(g, x + w * 0.25, y - 4, w * 0.5, 6, 2, cap, OUT, 1.5); if (label) { rr(g, x + 2, y + h * 0.5, w - 4, h * 0.3, 2, '#fffaf0'); txt(g, label, x + w / 2, y + h * 0.65, 7, OUT, 'center', true); } }
  function kitchenBg(g) {
    g.fillStyle = '#fff3c4'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,214,120,.35)'; for (let y = 8; y < 112; y += 18) for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); }
    // 양념 선반 (양쪽 끝)
    rr(g, 4, 92, 74, 7, 3, '#e9b46a', OUT, 2); rr(g, 242, 92, 74, 7, 3, '#e9b46a', OUT, 2);
    bottle(g, 10, 60, 16, 32, '#b9d86a', '#e9edf1', '오일'); bottle(g, 30, 64, 15, 28, '#5a3220', '#e8604c', '간장'); rr(g, 50, 72, 13, 20, 3, '#ffffff', OUT, 2); txt(g, '소금', 56.5, 82, 6, OUT, 'center', true); rr(g, 65, 76, 10, 16, 3, '#3a3030', OUT, 2);
    rr(g, 248, 78, 22, 14, 3, '#ffd860', OUT, 2); bottle(g, 274, 62, 14, 30, '#ffffff', '#ff9e8a', '설탕'); rr(g, 292, 70, 18, 22, 4, '#e8604c', OUT, 2); txt(g, '고추', 301, 81, 6, '#fff', 'center', true);
    // 나무 조리대
    g.fillStyle = '#f0b765'; g.fillRect(0, 118, W, H - 118); g.fillStyle = '#ffd99a'; g.fillRect(0, 118, W, 9); g.strokeStyle = OUT; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 127); g.lineTo(W, 127); g.stroke();
    g.strokeStyle = 'rgba(160,100,50,.35)'; g.lineWidth = 2; for (let x = 54; x < W; x += 106) { g.beginPath(); g.moveTo(x, 132); g.lineTo(x, H); g.stroke(); }
  }
  function board(g, x, y, w, h) { rr(g, x + 3, y + 5, w, h, 14, 'rgba(107,68,48,.18)'); rr(g, x, y, w, h, 14, '#fff8ea', OUT, 2.5); rr(g, x + 7, y + 7, w - 14, h - 14, 9, '#d8f0c4'); circ(g, x + w - 15, y + 15, 4, '#fff8ea', OUT, 1.5); }
  function bowl(g, x, y, r, inner = '#ffffff') { ell(g, x, y + 6, r + 4, r * 0.42, 'rgba(0,0,0,.08)'); circ(g, x, y, r, '#ffffff', OUT); circ(g, x, y, r - 8, inner); }
  function pan(g, x, y, r) { rr(g, x + r - 4, y - 7, 70, 14, 7, '#c98a4a', OUT); rr(g, x + r + 40, y - 4, 24, 8, 4, '#a8682a'); circ(g, x, y, r + 5, '#ff9e8a', OUT); const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r); gr.addColorStop(0, '#5a5258'); gr.addColorStop(1, '#2b2629'); circ(g, x, y, r, gr); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r - 6, Math.PI * 1.1, Math.PI * 1.45); g.stroke(); }
  function induction(g, heat, y = 106) { // 까만 유리 상판 + 불 세기 링
    rr(g, 24, y, 272, 100, 12, '#1f2226', OUT);
    circ(g, 160, y + 46, 52, null, heat ? `rgba(255,${120 - heat * 25},60,${0.35 + heat * 0.2})` : '#3a3e44', heat ? 4 + heat : 2);
  }
  function heatBtns(g, sel, target, y = 212) {
    const L = ['약불', '중불', '강불'];
    return L.map((l, i) => { const x = 58 + i * 72, on = sel === i + 1; rr(g, x, y, 60, 24, 12, on ? '#ff8a6b' : '#fff8ef', OUT); txt(g, l, x + 30, y + 12, 11, on ? '#fff' : OUT, 'center', true); if (target === i + 1 && !sel) { g.strokeStyle = '#ffb000'; g.setLineDash([3, 3]); g.lineWidth = 2; g.strokeRect(x - 3, y - 3, 66, 30); g.setLineDash([]); } return { x, y, w: 60, h: 24, lv: i + 1 }; });
  }
  function knife(g, x, y) { // 칼날(아래) + 손잡이(위)
    g.beginPath(); g.moveTo(x - 9, y - 40); g.lineTo(x + 9, y - 40); g.lineTo(x + 9, y - 4); g.quadraticCurveTo(x + 2, y + 6, x - 9, y + 4); g.closePath(); g.fillStyle = '#e8eef3'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x + 3, y - 36, 3, 30);
    rr(g, x - 6, y - 66, 12, 28, 5, '#8a5a3a', OUT); circ(g, x, y - 58, 1.6, '#f2d9b8'); circ(g, x, y - 48, 1.6, '#f2d9b8');
  }
  function star(g, x, y, r, fill) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr2 = i % 2 ? r * 0.48 : r; g.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } g.closePath(); g.fillStyle = fill; g.fill(); g.strokeStyle = OUT; g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke(); }
  const inBox = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  function btn(g, b, label, on, col = '#fff8ef') { rr(g, b.x, b.y, b.w, b.h, 10, on ? '#ff8a6b' : col, OUT); txt(g, label, b.x + b.w / 2, b.y + b.h / 2 + 1, 11, on ? '#fff' : OUT, 'center', true); }
  function meter(g, x, y, w, v, lo, hi) { rr(g, x, y, w, 10, 5, '#fff', OUT, 1.5); g.fillStyle = 'rgba(110,200,120,.45)'; g.fillRect(x + w * lo, y + 1, w * (hi - lo), 8); rr(g, x + 1, y + 1, Math.max(0, Math.min(1, v)) * (w - 2), 8, 4, '#ff9e6b'); }
  function progress(g, v, y = 8) { rr(g, 90, y, 140, 8, 4, '#fff', OUT, 1.5); rr(g, 91, y + 1, Math.max(0, Math.min(1, v)) * 138, 6, 3, '#7fd36b'); }
  function steam(g, x, y, t, n = 3) { g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; for (let i = 0; i < n; i++) { const ox = x + (i - (n - 1) / 2) * 16, ph = (t * 1.6 + i * 0.4) % 1; g.globalAlpha = 1 - ph; g.beginPath(); g.moveTo(ox, y - ph * 26); g.quadraticCurveTo(ox + 6, y - ph * 26 - 8, ox, y - ph * 26 - 16); g.stroke(); } g.globalAlpha = 1; }
  function liquidOf(t) { return /간장|소스/.test(t) ? '#6b3a1e' : /크림|우유/.test(t) ? '#fffaf0' : /와인|맛술/.test(t) ? '#f3e2a0' : /기름|오일|버터/.test(t) ? '#ffd860' : /물/.test(t) ? '#bfe3ff' : '#ffe6b0'; }
  function shakerOf(t) { return /후추/.test(t) && !/소금/.test(t) ? ['후추', '#3a3030'] : /파슬리|파 /.test(t) ? ['파슬리', '#5fb04a'] : /깨/.test(t) ? ['깨', '#f3e1b0'] : /설탕/.test(t) ? ['설탕', '#ffffff'] : /고춧가루|고추가루/.test(t) ? ['고춧가루', '#d8402c'] : ['소금·후추', '#ffffff']; }

  // ---------- 단계별 미니게임 ----------
  // 각 게임: { title, hint, update(dt), draw(g, t), down(p), move(p), up(p), done, stars }
  const G = {};
  // 씻기 (물에 담가 문질문질) · 물기 닦기 (키친타월로 쓱쓱)
  G.wash = (s) => {
    const o = { title: '🫧 씻기', hint: '재료를 좌우로 문질러 깨끗하게!', rubs: 0, need: 8, lastX: null, dir: 0, span: 0, t: 0, wob: 0 };
    o.update = (dt) => { o.t += dt; o.wob *= 0.9; };
    o.draw = (g, t) => {
      kitchenBg(g); bowl(g, 160, 150, 70, mixCol('#d7b0a4', '#bfe3ff', o.rubs / o.need));
      food(g, s.item, 160 + Math.sin(o.t * 20) * o.wob * 6, 148, 70);
      for (let i = 0; i < Math.min(o.rubs, 8); i++) circ(g, 120 + ((i * 37) % 90), 120 + ((i * 23) % 50), 4 + (i % 3), 'rgba(255,255,255,.8)', '#9fc7e6', 1);
      progress(g, o.rubs / o.need);
    };
    o.down = (p) => { o.lastX = p.x; o.span = 0; };
    o.move = (p) => { if (o.lastX == null) return; const dx = p.x - o.lastX; o.lastX = p.x; const d = Math.sign(dx); if (!d) return; if (d !== o.dir) { if (o.span > 22) { o.rubs++; o.wob = 1; s.ctx.beep(500 + o.rubs * 40, 0.03); } o.dir = d; o.span = 0; } o.span += Math.abs(dx); if (o.rubs >= o.need && !o.done) { o.done = true; o.stars = o.t < 5 ? 3 : o.t < 9 ? 2 : 1; } };
    o.up = () => { o.lastX = null; };
    return o;
  };
  G.wipe = (s) => {
    const drops = Array.from({ length: 9 }, (_, i) => ({ x: 120 + (i % 3) * 40 + Math.random() * 10, y: 120 + Math.floor(i / 3) * 28 + Math.random() * 8, on: true }));
    const o = { title: '🧻 물기 닦기', hint: '키친타월로 물방울을 쓱쓱 닦아요', t: 0, towel: { x: 260, y: 80 }, drag: false };
    o.update = (dt) => { o.t += dt; };
    o.draw = (g) => {
      kitchenBg(g); board(g, 70, 100, 180, 110); food(g, s.item, 160, 152, 90);
      drops.forEach((d) => d.on && (ell(g, d.x, d.y, 5, 6, 'rgba(160,210,255,.85)', '#6aa7d8', 1.2), circ(g, d.x - 1.5, d.y - 2, 1.5, '#fff')));
      rr(g, o.towel.x - 24, o.towel.y - 18, 48, 36, 6, '#ffffff', OUT); for (let i = 0; i < 3; i++) { g.strokeStyle = '#e6dccd'; g.lineWidth = 1; g.beginPath(); g.moveTo(o.towel.x - 18, o.towel.y - 8 + i * 8); g.lineTo(o.towel.x + 18, o.towel.y - 8 + i * 8); g.stroke(); }
      progress(g, drops.filter((d) => !d.on).length / drops.length);
    };
    o.down = (p) => { o.drag = true; o.towel = { x: p.x, y: p.y }; o.move(p); };
    o.move = (p) => { if (!o.drag) return; o.towel = { x: p.x, y: p.y }; drops.forEach((d) => { if (d.on && Math.abs(d.x - p.x) < 26 && Math.abs(d.y - p.y) < 20) { d.on = false; s.ctx.beep(900, 0.02); } }); if (!o.done && drops.every((d) => !d.on)) { o.done = true; o.stars = o.t < 4 ? 3 : o.t < 8 ? 2 : 1; } };
    o.up = () => { o.drag = false; };
    return o;
  };
  // 썰기: 칼이 왔다갔다 → 점선 위에서 톡! (한입 크기 4번, 채 썰기 7번 빠르게, 송송 6번)
  G.chop = (s, kind = 'chop') => {
    const n = kind === 'julienne' ? 7 : /송송|어슷/.test(s.line) ? 6 : 4;
    const x0 = 100, x1 = 220, cuts = Array.from({ length: n }, (_, i) => ({ x: x0 + ((i + 1) * (x1 - x0)) / (n + 1), cut: false, good: false }));
    const speed = kind === 'julienne' ? 210 : 150;
    const o = { title: kind === 'julienne' ? '🔪 채 썰기' : /송송/.test(s.line) ? '🔪 송송 썰기' : '🔪 한입 크기로 썰기', hint: '칼이 점선 위에 왔을 때 톡!', kx: x0, dir: 1, chopT: 0, miss: 0, t: 0 };
    o.update = (dt) => { o.t += dt; o.kx += o.dir * speed * dt; if (o.kx > x1) { o.kx = x1; o.dir = -1; } if (o.kx < x0) { o.kx = x0; o.dir = 1; } o.chopT = Math.max(0, o.chopT - dt); };
    o.draw = (g) => {
      kitchenBg(g); board(g, 40, 112, 240, 104);
      const im = img(s.item && s.item.id), xs = [x0, ...cuts.filter((c) => c.cut).map((c) => c.x).sort((a, b) => a - b), x1];
      for (let i = 0; i < xs.length - 1; i++) { // 썬 조각은 살짝 벌어짐
        const a = xs[i], b = xs[i + 1], off = (i - (xs.length - 2) / 2) * 4;
        g.save(); g.beginPath(); g.rect(a + off, 120, b - a, 90); g.clip();
        if (im) g.drawImage(im, x0 + off, 104, x1 - x0, x1 - x0);
        else rr(g, x0 + off, 145, x1 - x0, 38, 18, rawCol(s.item), OUT);
        g.restore();
      }
      cuts.forEach((c) => { if (!c.cut) { g.strokeStyle = 'rgba(74,48,54,.55)'; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(c.x, 126); g.lineTo(c.x, 206); g.stroke(); g.setLineDash([]); } else if (!c.good) txt(g, '삐뚤', c.x, 214, 9, '#c0504d'); });
      const ky = 70 + (o.chopT > 0 ? 50 * (o.chopT / 0.15) : 0); // 칼
      knife(g, o.kx, ky);
      progress(g, cuts.filter((c) => c.cut).length / n);
    };
    o.down = () => {
      if (o.done) return; o.chopT = 0.15;
      const c = cuts.filter((c) => !c.cut).sort((a, b) => Math.abs(a.x - o.kx) - Math.abs(b.x - o.kx))[0]; if (!c) return;
      const good = Math.abs(c.x - o.kx) < (kind === 'julienne' ? 9 : 11);
      if (good || Math.abs(c.x - o.kx) < 30) { c.cut = true; c.good = good; if (!good) o.miss++; s.ctx.beep(good ? 760 : 300, 0.04); } else { o.miss++; s.ctx.beep(220, 0.04); }
      if (cuts.every((c) => c.cut)) { o.done = true; o.stars = o.miss === 0 ? 3 : o.miss <= 2 ? 2 : 1; }
    };
    return o;
  };
  G.julienne = (s) => G.chop(s, 'julienne');
  // 다지기: 빠르게 톡톡톡 → 잘게 부서짐
  G.mince = (s) => {
    const goal = 18, bits = [];
    const o = { title: '🔪 다지기', hint: `빠르게 톡톡! (${goal}번, 6초)`, taps: 0, left: 6, t: 0, chopT: 0, kx: 160 };
    o.update = (dt) => { o.t += dt; o.chopT = Math.max(0, o.chopT - dt); if (!o.done) { o.left -= dt; if (o.left <= 0) { o.done = true; o.stars = o.taps >= goal ? 3 : o.taps >= goal * 0.6 ? 2 : 1; } } };
    o.draw = (g) => {
      kitchenBg(g); board(g, 40, 112, 240, 104);
      const k = Math.min(1, o.taps / goal);
      if (k < 1) food(g, s.item, 160, 160, 80 * (1 - k * 0.7));
      bits.forEach((b) => circ(g, b.x, b.y, b.r, rawCol(s.item) === '#f0d79a' ? '#f3e7c2' : rawCol(s.item), OUT, 1));
      knife(g, o.kx, 80 + (o.chopT > 0 ? 50 : 0));
      txt(g, `${Math.max(0, Math.ceil(o.left))}초`, 290, 20, 12, OUT, 'right', true);
      progress(g, k);
    };
    o.down = () => { if (o.done) return; o.taps++; o.chopT = 0.08; o.kx = 110 + Math.random() * 100; for (let i = 0; i < 2; i++) bits.push({ x: 110 + Math.random() * 100, y: 140 + Math.random() * 50, r: 2 + Math.random() * 3 }); s.ctx.beep(480 + o.taps * 18, 0.02); if (o.taps >= goal) { o.done = true; o.stars = o.t < 4 ? 3 : 2; } };
    return o;
  };
  // 간하기·뿌리기: 통을 톡톡 흔들어 초록 칸까지 (너무 많으면 짜요)
  G.season = (s) => {
    const [label, col] = shakerOf(s.line), parts = [];
    const o = { title: s.after ? `🌿 ${label} 뿌리기` : `🧂 ${label} 간하기`, hint: '통을 톡톡 눌러 초록 칸까지! 다 되면 ✓', v: 0, shake: 0, t: 0 };
    const ok = { x: 236, y: 206, w: 70, h: 26 };
    o.update = (dt) => { o.t += dt; o.shake = Math.max(0, o.shake - dt * 4); parts.forEach((p) => { if (p.y < p.to) { p.y += 160 * dt; } }); };
    o.draw = (g) => {
      kitchenBg(g); if (s.after) { ell(g, 160, 170, 90, 34, '#ffffff', OUT); ell(g, 160, 168, 64, 22, '#f7efe2'); food(g, s.item, 160, 160, 64); } else { board(g, 60, 120, 200, 90); food(g, s.item, 160, 165, 84); }
      parts.forEach((p) => circ(g, p.x, p.y, 1.8, col, col === '#ffffff' ? '#cbbfae' : null, 0.6));
      g.save(); g.translate(160 + Math.sin(o.shake * 12) * 8, 62); g.rotate(Math.PI + Math.sin(o.shake * 12) * 0.2); rr(g, -16, -30, 32, 50, 8, '#fff8ef', OUT); rr(g, -16, 14, 32, 10, 4, '#c9a9ae', OUT); txt(g, label.slice(0, 2), 0, -6, 10, OUT); g.restore();
      meter(g, 20, 12, 200, o.v, 0.55, 0.8); txt(g, o.v > 0.8 ? '짜요!' : o.v >= 0.55 ? '딱 좋아요' : '', 228, 17, 10, o.v > 0.8 ? '#c0504d' : '#3b8a3e', 'left', true);
      btn(g, ok, '다 됐어 ✓', false, '#eaf7e4');
    };
    o.down = (p) => {
      if (o.done) return;
      if (inBox(p, ok)) { o.done = true; o.stars = o.v >= 0.55 && o.v <= 0.8 ? 3 : o.v > 0.4 && o.v < 0.95 ? 2 : 1; return; }
      o.v += 0.09; o.shake = 1; s.ctx.beep(1200, 0.015);
      for (let i = 0; i < 7; i++) parts.push({ x: 160 + (Math.random() - 0.5) * 70, y: 90, to: 145 + Math.random() * 40 });
    };
    return o;
  };
  // 섞기: 그릇에 손가락으로 빙글빙글 세 바퀴
  G.mix = (s) => {
    const PAL = ['#8a4a26', '#ffcf6b', '#e8604c', '#f6e7c8'], cols = (s.items.length ? s.items : [s.item]).slice(0, 4).map((it, i) => { const c = it ? liquidOf(it.name) : ''; return c && c !== '#ffe6b0' ? c : PAL[i % 4]; });
    while (cols.length < 3) cols.push(PAL[cols.length]);
    const o = { title: '🥄 섞기', hint: '그릇 안을 빙글빙글 세 바퀴!', ang: 0, last: null, t: 0 };
    const mixed = cols.reduce((a, c) => mixCol(a, c, 0.4));
    o.update = (dt) => { o.t += dt; };
    o.draw = (g) => {
      kitchenBg(g); bowl(g, 160, 160, 74, '#fdf6ea');
      const k = Math.min(1, Math.abs(o.ang) / (Math.PI * 6));
      if (k > 0.05) circ(g, 160, 160, 20 + 40 * k, mixed);
      cols.forEach((c, i) => { const a = o.ang * 0.8 + (i / cols.length) * Math.PI * 2, r = 30 * (1 - k * 0.7); circ(g, 160 + Math.cos(a) * r, 160 + Math.sin(a) * r * 0.9, 22 - k * 10, mixCol(c, mixed, k)); });
      if (o.last) { g.save(); g.translate(o.last.x, o.last.y); g.rotate(-0.5); rr(g, -4, -50, 8, 50, 4, '#c98f5a', OUT); ell(g, 0, 0, 10, 13, '#c98f5a', OUT); g.restore(); }
      progress(g, k);
    };
    const angOf = (p) => Math.atan2(p.y - 160, p.x - 160);
    o.down = (p) => { o.last = p; o.a0 = angOf(p); };
    o.move = (p) => { if (!o.last || o.done) return; const a = angOf(p); let d = a - o.a0; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; if (Math.hypot(p.x - 160, p.y - 160) > 14) o.ang += d; o.a0 = a; o.last = p; if (Math.abs(o.ang) >= Math.PI * 6) { o.done = true; o.stars = o.t < 5 ? 3 : o.t < 9 ? 2 : 1; s.ctx.beep(880, 0.06); } };
    o.up = () => { o.last = null; };
    return o;
  };
  // 달걀 깨기: 톡, 톡, 쩍!
  G.crack = (s) => {
    const o = { title: '🥚 달걀 깨기', hint: '그릇 모서리에 톡톡톡 세 번!', taps: 0, t: 0, drop: 0 };
    o.update = (dt) => { o.t += dt; if (o.taps >= 3) { o.drop = Math.min(1, o.drop + dt * 2); if (o.drop >= 1 && !o.done) { o.done = true; o.stars = o.t < 4 ? 3 : 2; } } };
    o.draw = (g) => {
      kitchenBg(g); bowl(g, 160, 170, 66, '#fdf6ea');
      if (o.taps < 3) { ell(g, 160, 92, 24, 30, '#fff3dc', OUT); for (let i = 0; i < o.taps; i++) { g.strokeStyle = OUT; g.lineWidth = 1.5; g.beginPath(); g.moveTo(140 + i * 14, 92); g.lineTo(147 + i * 14, 86 + (i % 2) * 10); g.lineTo(154 + i * 14, 94); g.stroke(); } }
      else { ell(g, 132, 80, 18, 16, '#fff3dc', OUT); ell(g, 188, 80, 18, 16, '#fff3dc', OUT); const y = lerp(96, 168, o.drop); ell(g, 160, y, 26, 18, 'rgba(255,255,255,.9)', '#e6dccd', 1); circ(g, 160, y, 10, '#ffb52e', OUT, 1.5); }
    };
    o.down = () => { if (o.taps < 3) { o.taps++; s.ctx.beep(o.taps < 3 ? 400 : 700, 0.05); } };
    return o;
  };
  // 붓기·두르기: 꾹 누르는 동안 쪼르륵 → 초록 칸에서 떼기
  G.pour = (s) => {
    const col = liquidOf(s.line), oil = /두르|둘러/.test(s.line);
    const o = { title: oil ? '🫗 기름·버터 두르기' : '🫗 붓기', hint: '꾹 누르는 동안 부어져요. 초록 칸에서 손 떼기!', v: 0, on: false, t: 0, lo: oil ? 0.35 : 0.6, hi: oil ? 0.55 : 0.82 };
    o.update = (dt) => { o.t += dt; if (o.on && !o.done) o.v += dt * (oil ? 0.22 : 0.3); };
    o.draw = (g) => {
      kitchenBg(g); induction(g, 0); pan(g, 160, 156, 48);
      if (o.v > 0) circ(g, 160, 156, Math.min(48, 18 + o.v * 34), col + 'cc');
      g.save(); g.translate(206, 70); g.rotate(o.on ? -0.9 : -0.3); rr(g, -14, -40, 28, 56, 8, oil ? '#ffe9a6' : '#ffffff', OUT); rr(g, -6, -54, 12, 16, 3, '#c9a9ae', OUT); g.restore();
      if (o.on) { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.moveTo(176, 62); g.quadraticCurveTo(168, 100, 162, 150); g.stroke(); }
      meter(g, 20, 12, 200, o.v, o.lo, o.hi);
    };
    o.down = () => { if (!o.done) { o.on = true; s.ctx.beep(320, 0.05); } };
    o.up = () => { if (!o.on || o.done) return; o.on = false; o.done = true; o.stars = o.v >= o.lo && o.v <= o.hi ? 3 : o.v > o.lo - 0.15 && o.v < o.hi + 0.15 ? 2 : 1; };
    return o;
  };
  // 인덕션 공통: 먼저 불 세기 맞추기
  function withHeat(o, s, def) {
    o.target = heatOf(s.line, def); o.heat = 0; o.btns = [];
    const d0 = o.down;
    o.down = (p) => { if (!o.heat) { const b = o.btns.find((b) => inBox(p, b)); if (b) { o.heat = b.lv; o.heatOk = b.lv === o.target; s.ctx.beep(500 + b.lv * 120, 0.06); o.hint = o.hint2; } return; } d0 && d0(p); };
    o.hint2 = o.hint; o.hint = `먼저 불 세기: ${['', '약불', '중불', '강불'][o.target]}로 맞춰요`;
    return o;
  }
  // 팬에 굽기: 노릇해지면 톡 뒤집고, 한 번 더 톡 해서 꺼내기
  G.fry = (s) => {
    const n = 3, pcs = Array.from({ length: n }, (_, i) => ({ x: 126 + i * 34, y: 152 + (i % 2) * 14 - 7, side: 0, c: [0, 0], out: false, flipT: 0, score: 0 }));
    const o = { title: '🍳 인덕션 · 노릇하게 굽기', hint: '노릇노릇(초록 칸)일 때 톡 뒤집고, 반대쪽도 노릇하면 톡 꺼내요', t: 0 };
    o.update = (dt) => { o.t += dt; if (!o.heat) return; const r = [0, 0.13, 0.2, 0.3][o.heat]; pcs.forEach((p) => { if (!p.out) p.c[p.side] += r * dt; p.flipT = Math.max(0, p.flipT - dt); }); };
    o.draw = (g, t) => {
      kitchenBg(g); induction(g, o.heat); pan(g, 160, 152, 48);
      pcs.forEach((p, i) => { if (p.out) return; const lift = p.flipT > 0 ? Math.sin((p.flipT / 0.35) * Math.PI) * 26 : 0; ell(g, p.x, p.y + 6, 13, 4, 'rgba(0,0,0,.25)'); cookedFood(g, s.item, p.x, p.y - lift, 34, Math.max(p.c[p.side] * 0.6, p.c[1 - p.side]), (i - 1) * 0.5 + (p.side ? Math.PI : 0) * 0.15); if (o.heat && p.c[p.side] > 0.3) { g.fillStyle = 'rgba(255,240,200,.8)'; for (let k = 0; k < 3; k++) circ(g, p.x - 10 + ((k * 9 + o.t * 30) % 20), p.y + 6 - ((o.t * 20 + k * 5) % 8), 1.2, 'rgba(255,240,200,.9)'); } });
      if (o.heat) { pcs.forEach((p) => { if (p.out) return; const v = p.c[p.side]; meter(g, p.x - 13, p.y - 26, 26, v / 1.3, 0.6 / 1.3, 0.95 / 1.3); }); if (o.heat === 3 || pcs.some((p) => p.c[p.side] > 1)) steam(g, 160, 118, t, 2); }
      o.btns = heatBtns(g, o.heat, o.target);
      txt(g, `꺼낸 조각 ${pcs.filter((p) => p.out).length}/${n}`, 300, 20, 11, OUT, 'right');
    };
    o.down = (p) => {
      const pc = pcs.filter((q) => !q.out).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      if (!pc || Math.hypot(pc.x - p.x, pc.y - p.y) > 30) return;
      const v = pc.c[pc.side], good = v >= 0.6 && v <= 0.95;
      if (v < 0.35) { s.ctx.beep(260, 0.04); return; } // 아직 날것
      pc.score += good ? 1 : 0; s.ctx.beep(good ? 880 : 420, 0.05);
      if (pc.side === 0) { pc.side = 1; pc.flipT = 0.35; } else pc.out = true;
      if (pcs.every((q) => q.out)) { o.done = true; const sc = pcs.reduce((a, q) => a + q.score, 0) / (n * 2); o.stars = Math.max(1, Math.min(3, Math.round(sc * 3) - (o.heatOk ? 0 : 1))); }
    };
    withHeat(o, s, 2);
    return o;
  };
  // 볶기: 팬을 좌우로 휙휙 흔들어 재료 뒤집기 (멈추면 탐)
  G.stirfry = (s) => {
    const bits = Array.from({ length: 12 }, () => ({ x: (Math.random() - 0.5) * 70, y: (Math.random() - 0.5) * 40, z: 0, vz: 0, c: 0 }));
    const o = { title: '🥘 인덕션 · 볶기', hint: '팬을 좌우로 휙휙 흔들어요! 멈추면 타요', toss: 0, need: 9, px: 0, last: null, dir: 0, span: 0, idle: 0, burnt: 0, t: 0 };
    o.update = (dt) => {
      o.t += dt; if (!o.heat || o.done) return;
      o.idle += dt; if (o.idle > 2.2) { o.burnt += dt; }
      bits.forEach((b) => { b.vz -= 400 * dt; b.z = Math.max(0, b.z + b.vz * dt); if (b.z === 0) b.vz = 0; b.c = Math.min(1.3, b.c + dt * (o.idle > 2.2 ? 0.4 : 0.06) * o.heat); });
      if (!o.last) o.px *= 0.9;
    };
    o.draw = (g, t) => {
      kitchenBg(g); induction(g, o.heat); const cx = 160 + o.px; pan(g, cx, 152, 48);
      const items = s.items.length ? s.items : [s.item];
      bits.forEach((b, i) => { const it = items[i % items.length]; cookedFood(g, it, cx + b.x, 152 + b.y * 0.8 - b.z, 20, b.c * 0.8, i * 0.9 + b.z * 0.03); });
      if (o.idle > 2.2 && o.heat) { steam(g, cx, 130, t, 3); txt(g, '타요! 흔들어요!', 160, 34, 12, '#c0504d', 'center', true); }
      o.btns = heatBtns(g, o.heat, o.target); progress(g, o.toss / o.need);
    };
    o.down = (p) => { o.last = p; o.span = 0; };
    o.move = (p) => {
      if (!o.last || !o.heat || o.done) return; const dx = p.x - o.last.x; o.last = p; o.px = Math.max(-40, Math.min(40, o.px + dx));
      const d = Math.sign(dx); if (!d) return; if (d !== o.dir) { if (o.span > 26) { o.toss++; o.idle = 0; bits.forEach((b) => { b.vz = 120 + Math.random() * 90; b.x = Math.max(-40, Math.min(40, b.x + (Math.random() - 0.5) * 30)); }); s.ctx.beep(600 + o.toss * 30, 0.03); } o.dir = d; o.span = 0; } o.span += Math.abs(dx);
      if (o.toss >= o.need) { o.done = true; o.stars = Math.max(1, 3 - (o.burnt > 2 ? 2 : o.burnt > 0.5 ? 1 : 0) - (o.heatOk ? 0 : 1)); }
    };
    o.up = () => { o.last = null; };
    withHeat(o, s, 3);
    return o;
  };
  // 끓이기·졸이기: 냄비 불 맞추고, 넘치려 하면(졸일 땐 눌어붙으려 하면) 톡 저어주기
  G.boil = (s, simmer = false) => {
    const col = liquidOf(s.line + (s.items.map((i) => i.name).join(' ')));
    const o = { title: simmer ? '🍲 인덕션 · 졸이기' : '🍲 인덕션 · 끓이기', hint: simmer ? '숟가락이 나오면 톡 저어요 (눌어붙지 않게)' : '부글부글 넘치려 하면 톡 저어요', p: 0, ev: null, nextEv: 1.6, miss: 0, hit: 0, t: 0 };
    o.update = (dt) => {
      o.t += dt; if (!o.heat || o.done) return;
      const want = o.target, rate = 0.12 * (o.heat >= want ? 1 : 0.6);
      o.p += rate * dt;
      if (o.ev) { o.ev.t -= dt; if (o.ev.t <= 0) { o.miss++; o.ev = null; o.nextEv = 1.4 + Math.random(); s.ctx.beep(200, 0.08); } }
      else { o.nextEv -= dt * (o.heat > want ? 1.6 : 1); if (o.nextEv <= 0) o.ev = { t: 1.8, x: 130 + Math.random() * 60 }; }
      if (o.p >= 1) { o.done = true; o.stars = Math.max(1, 3 - o.miss - (o.heatOk ? 0 : 1)); }
    };
    o.draw = (g, t) => {
      kitchenBg(g); induction(g, o.heat);
      rr(g, 98, 104, 124, 84, 10, (() => { const gr = g.createLinearGradient(98, 0, 222, 0); gr.addColorStop(0, '#ffc9d4'); gr.addColorStop(0.5, '#ffe2e8'); gr.addColorStop(1, '#f2a8b8'); return gr; })(), OUT); rr(g, 84, 116, 18, 10, 4, '#9aa3ad', OUT); rr(g, 218, 116, 18, 10, 4, '#9aa3ad', OUT);
      const lvl = simmer ? 112 + o.p * 16 : 112; ell(g, 160, lvl, 58, 9, mixCol(col, simmer ? '#7a4a24' : col, simmer ? o.p * 0.5 : 0), OUT, 1.5);
      const its = (s.items.length ? s.items : [s.item]).slice(0, 3); its.forEach((it, i) => it && cookedFood(g, it, 130 + i * 30, lvl + 4 + Math.sin(t * 3 + i) * 2, 22, simmer ? o.p * 0.7 : o.p * 0.3, i));
      if (o.heat) for (let i = 0; i < 2 + o.heat * 2; i++) { const ph = (t * (0.8 + o.heat * 0.4) + i * 0.37) % 1; circ(g, 116 + ((i * 53) % 88), lvl - ph * 8, 2 + ph * 3, 'rgba(255,255,255,.7)'); }
      if (o.heat) steam(g, 160, 96, t, o.heat);
      if (o.ev) { const k = o.ev.t / 1.8; if (!simmer) { ell(g, 160, lvl - 10 * (1 - k), 64, 12, 'rgba(255,255,255,.85)'); } g.save(); g.translate(o.ev.x, 78); g.rotate(0.4); rr(g, -4, -34, 8, 40, 4, '#c98f5a', OUT); ell(g, 0, 8, 9, 12, '#c98f5a', OUT); g.restore(); txt(g, simmer ? '저어줘요!' : '넘쳐요!', o.ev.x, 34, 12, '#c0504d', 'center', true); }
      o.btns = heatBtns(g, o.heat, o.target); progress(g, o.p);
    };
    o.down = (p) => { if (!o.ev) return; if (Math.abs(p.x - o.ev.x) < 60 && p.y < 200) { o.hit++; o.ev = null; o.nextEv = 1.4 + Math.random(); s.ctx.beep(900, 0.04); } };
    withHeat(o, s, simmer ? 2 : 3);
    return o;
  };
  G.simmer = (s) => G.boil(s, true);
  // 에어프라이어 (오븐 겸): 온도·시간 맞추고 시작 → 중간에 바스켓 흔들기 → 띵!
  G.airfry = (s) => {
    const oven = /오븐/.test(s.line) && !/에어/.test(s.line);
    const tT = numOf(s.line, /(\d{2,3})\s*도/, 180), mT = numOf(s.line, /(\d{1,2})\s*(?:~\s*\d+\s*)?분/, 10);
    const o = { title: oven ? '♨️ 오븐' : '♨️ 에어프라이어', hint: `${tT}도 · ${mT}분으로 맞추고 시작!`, temp: 160, min: 5, run: false, left: 0, shake: null, shook: false, t: 0, glow: 0, ding: 0 };
    const B = { tm: { x: 220, y: 70, w: 30, h: 26 }, tp: { x: 256, y: 70, w: 30, h: 26 }, mm: { x: 220, y: 112, w: 30, h: 26 }, mp: { x: 256, y: 112, w: 30, h: 26 }, go: { x: 220, y: 158, w: 66, h: 30 } };
    o.update = (dt) => {
      o.t += dt; o.ding = Math.max(0, o.ding - dt); if (!o.run || o.done) return;
      o.glow = Math.min(1, o.glow + dt); o.left -= dt * 2.6; // 1분 ≈ 0.4초
      if (!o.shook && !o.shake && o.left <= o.min / 2) o.shake = { t: 2.5 };
      if (o.shake) { o.shake.t -= dt; if (o.shake.t <= 0) { o.shake = null; o.shook = 'miss'; } }
      if (o.left <= 0) { o.left = 0; o.ding = 1; s.ctx.melody([1319, 1568]); o.done = true; const ok = (Math.abs(o.temp - tT) <= 10 ? 1 : 0) + (Math.abs(o.min - mT) <= 2 ? 1 : 0) + (o.shook === true ? 1 : 0); o.stars = Math.max(1, ok); }
    };
    o.draw = (g, t) => {
      kitchenBg(g);
      const sx = o.shake ? Math.sin(t * 40) * 2 : 0;
      rr(g, 40 + sx, 40, 150, 170, 26, oven ? '#e9e4dc' : '#2f2b2e', OUT); // 몸통
      rr(g, 56 + sx, 58, 118, 40, 12, '#141214', OUT); txt(g, o.run ? `${Math.ceil(o.left)}분` : `${o.temp}℃ ${o.min}분`, 115 + sx, 78, 13, '#ff9e6b', 'center', true);
      rr(g, 56 + sx, 110, 118, 84, 14, `rgba(255,${150 - o.glow * 40},60,${0.25 + o.glow * 0.5})`, OUT); // 바스켓 창
      food(g, s.item, 115 + sx, 152, 48);
      if (o.run) steam(g, 115, 40, t, 2);
      btn(g, B.tm, '−'); btn(g, B.tp, '+'); txt(g, '온도', 253, 62, 10); btn(g, B.mm, '−'); btn(g, B.mp, '+'); txt(g, '시간', 253, 104, 10);
      btn(g, B.go, o.run ? '조리 중' : '시작 ▶', o.run);
      if (o.shake) txt(g, '바스켓 흔들기! 톡', 115, 26, 12, '#c0504d', 'center', true);
      if (o.ding) txt(g, '띵! 🔔', 115, 26, 14, '#3b8a3e', 'center', true);
    };
    o.down = (p) => {
      if (o.done) return;
      if (o.run) { if (o.shake && p.x < 200) { o.shake = null; o.shook = true; s.ctx.beep(880, 0.05); } return; }
      if (inBox(p, B.tm)) o.temp = Math.max(80, o.temp - 10); else if (inBox(p, B.tp)) o.temp = Math.min(230, o.temp + 10);
      else if (inBox(p, B.mm)) o.min = Math.max(1, o.min - 1); else if (inBox(p, B.mp)) o.min = Math.min(40, o.min + 1);
      else if (inBox(p, B.go)) { o.run = true; o.left = o.min; o.hint = '돌아가는 중… 중간에 흔들라고 하면 톡!'; s.ctx.beep(660, 0.08); return; } else return;
      s.ctx.beep(720, 0.02);
    };
    return o;
  };
  // 토스터: 굽기 단계 맞추고 레버 내리기 → 톡 튀어 오르면 잡기
  G.toast = (s) => {
    const want = /바삭/.test(s.line) ? 4 : 3;
    const o = { title: '🍞 토스터', hint: `굽기 ${want}단계로 맞추고 레버를 아래로 쭉!`, lv: 2, lowered: false, cook: 0, pop: 0, caught: null, t: 0, drag: null };
    const B = { m: { x: 214, y: 150, w: 28, h: 26 }, p: { x: 270, y: 150, w: 28, h: 26 } };
    o.update = (dt) => {
      o.t += dt; if (o.done) return;
      if (o.lowered) { o.cook += dt / (0.7 + o.lv * 0.35); if (o.cook >= 1) { o.lowered = false; o.pop = 0.01; s.ctx.beep(1000, 0.06); } }
      if (o.pop) { o.pop += dt; if (o.pop > 1.4 && o.caught == null) { o.caught = false; o.done = true; o.stars = Math.max(1, (o.lv === want ? 2 : 1)); } }
    };
    o.draw = (g) => {
      kitchenBg(g);
      const by = o.lowered ? 110 : o.pop ? 70 - Math.sin(Math.min(1, o.pop) * Math.PI) * 50 : 70;
      const bc = mixCol('#f5deb0', '#c97b34', Math.min(1, o.cook) * (o.lv / 5) * 1.4);
      if (o.caught !== true) { rr(g, 80, by, 46, 54, 10, bc, OUT); rr(g, 134, by, 46, 54, 10, bc, OUT); }
      rr(g, 60, 100, 140, 110, 30, '#f7c9cf', OUT); rr(g, 78, 104, 50, 8, 4, '#4a3036'); rr(g, 132, 104, 50, 8, 4, '#4a3036');
      if (o.lowered) rr(g, 70, 190, 120, 6, 3, 'rgba(255,120,60,.8)');
      const ly = o.lowered ? 180 : o.drag ? Math.min(180, 130 + o.drag) : 130; rr(g, 196, ly, 26, 12, 5, '#ffffff', OUT); g.fillStyle = '#4a3036'; g.fillRect(200, 126, 4, 64);
      btn(g, B.m, '−'); btn(g, B.p, '+'); txt(g, `굽기 ${o.lv}`, 256, 140, 11, OUT, 'center', true);
      if (o.pop && o.caught == null) txt(g, '톡! 빵을 잡아요!', 130, 26, 13, '#c0504d', 'center', true);
      if (o.caught === true) { ell(g, 160, 60, 50, 14, '#ffffff', OUT); rr(g, 128, 34, 30, 24, 6, bc, OUT); rr(g, 162, 34, 30, 24, 6, bc, OUT); txt(g, '바삭 완성!', 160, 26, 12, '#3b8a3e', 'center', true); }
    };
    o.down = (p) => {
      if (o.done) return;
      if (o.pop) { if (p.y < 150 && p.x < 200) { o.caught = true; s.ctx.beep(1200, 0.06); o.done = true; o.stars = o.lv === want ? 3 : 2; } return; }
      if (o.lowered) return;
      if (inBox(p, B.m)) { o.lv = Math.max(1, o.lv - 1); s.ctx.beep(600, 0.02); return; } if (inBox(p, B.p)) { o.lv = Math.min(5, o.lv + 1); s.ctx.beep(700, 0.02); return; }
      if (p.x > 186 && p.x < 236 && p.y > 110 && p.y < 200) o.drag = 0, (o.y0 = p.y);
    };
    o.move = (p) => { if (o.drag == null || o.lowered) return; o.drag = Math.max(0, p.y - o.y0); if (o.drag > 36) { o.lowered = true; o.drag = null; o.hint = '노릇노릇 굽는 중… 튀어 오르면 빵을 톡!'; s.ctx.beep(300, 0.08); } };
    o.up = () => { o.drag = null; };
    return o;
  };
  // 전자레인지: 시간 맞추고 시작 → 띵 → 문 열기
  G.micro = (s) => {
    const sec = (() => { const m = s.line.match(/(\d+)\s*분/), c = s.line.match(/(\d+)\s*초/); return (m ? Number(m[1]) * 60 : 0) + (c ? Number(c[1]) : 0) || 60; })();
    const o = { title: '📟 전자레인지', hint: `${sec >= 60 ? `${Math.floor(sec / 60)}분 ` : ''}${sec % 60 ? `${sec % 60}초` : ''}로 맞추고 시작!`, set: 0, run: false, left: 0, open: false, t: 0, rot: 0, ding: false };
    const B = { s10: { x: 232, y: 70, w: 56, h: 26 }, m1: { x: 232, y: 102, w: 56, h: 26 }, go: { x: 232, y: 140, w: 56, h: 30 }, clr: { x: 232, y: 176, w: 56, h: 22 } };
    o.update = (dt) => { o.t += dt; if (o.run) { o.rot += dt * 2; o.left -= dt * 40; if (o.left <= 0) { o.left = 0; o.run = false; o.ding = true; s.ctx.melody([1568, 1568]); o.hint = '띵! 문을 톡 열어요'; } } };
    o.draw = (g) => {
      kitchenBg(g); rr(g, 30, 50, 270, 160, 18, '#f1ece4', OUT); rr(g, 46, 66, 170, 128, 12, o.run ? 'rgba(255,214,120,.55)' : '#2d2a2c', OUT);
      if (!o.open) { ell(g, 131, 170, 50, 10, '#ffffff', OUT, 1.5); g.save(); g.translate(131, 150); g.rotate(o.rot * 0.3); food(g, s.item, 0, 0, 46); g.restore(); }
      else { rr(g, 46, 66, 40, 128, 8, '#e3ddd3', OUT); food(g, s.item, 140, 150, 50); steam(g, 140, 120, o.t, 3); }
      rr(g, 232, 56 - 2, 56, 12, 4, '#141214'); const v = o.run ? o.left : o.set; txt(g, `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, '0')}`, 260, 60, 10, '#7fff9e', 'center', true);
      btn(g, B.s10, '+10초'); btn(g, B.m1, '+1분'); btn(g, B.go, '시작', o.run); btn(g, B.clr, '취소');
    };
    o.down = (p) => {
      if (o.done) return;
      if (o.ding) { if (p.x < 220) { o.open = true; o.done = true; const diff = Math.abs(o.set - sec); o.stars = diff === 0 ? 3 : diff <= 20 ? 2 : 1; s.ctx.beep(900, 0.05); } return; }
      if (o.run) return;
      if (inBox(p, B.s10)) o.set += 10; else if (inBox(p, B.m1)) o.set += 60; else if (inBox(p, B.clr)) o.set = 0;
      else if (inBox(p, B.go) && o.set > 0) { o.run = true; o.left = o.set; o.hint = '윙~ 데우는 중…'; s.ctx.beep(500, 0.08); return; } else return;
      s.ctx.beep(1000, 0.02);
    };
    return o;
  };
  // 접시에 담기: 팬 위 요리를 접시로 끌어오기
  G.plate = (s) => {
    const o = { title: '🍽️ 접시에 담기', hint: '요리를 꾹 잡아서 접시 위로 옮겨요', fx: 80, fy: 160, drag: false, t: 0, placed: false };
    o.update = (dt) => { o.t += dt; };
    o.draw = (g, t) => {
      kitchenBg(g); pan(g, 80, 168, 42); ell(g, 230, 170, 66, 30, '#ffffff', OUT); ell(g, 230, 168, 46, 20, '#f7efe2');
      const items = (s.items.length ? s.items : [s.item]).slice(0, 3);
      items.forEach((it, i) => food(g, it, o.fx + (i - (items.length - 1) / 2) * 16, o.fy - i * 4, 40));
      if (o.placed) { steam(g, 230, 140, t, 3); txt(g, '맛있겠다!', 230, 110, 12, '#3b8a3e', 'center', true); }
    };
    o.down = (p) => { if (Math.hypot(p.x - o.fx, p.y - o.fy) < 50) o.drag = true; };
    o.move = (p) => { if (!o.drag || o.done) return; o.fx = p.x; o.fy = p.y; };
    o.up = () => { if (!o.drag || o.done) return; o.drag = false; if (Math.hypot(o.fx - 230, o.fy - 168) < 60) { o.fx = 230; o.fy = 164; o.placed = true; o.done = true; o.stars = o.t < 4 ? 3 : 2; s.ctx.beep(880, 0.06); } else { o.fx = 80; o.fy = 160; } };
    return o;
  };
  // 재우기·식히기: 잠깐 기다리기
  G.wait = (s) => {
    const o = { title: /식혀/.test(s.line) ? '⏳ 식히기' : '⏳ 재워두기', hint: '시계를 톡톡 누르면 빨리 지나가요', p: 0, t: 0 };
    o.update = (dt) => { o.t += dt; o.p += dt * 0.25; if (o.p >= 1 && !o.done) { o.done = true; o.stars = 3; } };
    o.draw = (g) => { kitchenBg(g); bowl(g, 110, 170, 54, '#fdf6ea'); food(g, s.item, 110, 166, 50); circ(g, 230, 90, 40, '#ffffff', OUT); g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.moveTo(230, 90); g.lineTo(230 + Math.sin(o.p * Math.PI * 2) * 28, 90 - Math.cos(o.p * Math.PI * 2) * 28); g.stroke(); progress(g, o.p); };
    o.down = () => { o.p += 0.12; s.ctx.beep(700, 0.02); };
    return o;
  };

  // ---------- 진행 ----------
  function play(opts) {
    SRC = opts.foodSrc || SRC;
    const steps = plan(opts);
    const root = opts.root, dpr = Math.min(3, window.devicePixelRatio || 1);
    const uniq = []; [...opts.need, ...steps.flatMap((x) => x.items)].forEach((it) => it && !uniq.some((u) => u.id === it.id) && uniq.push(it));
    const escH = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    root.innerHTML = `<div class="card rc-card cookm"><div class="rc-sign"><b>${escH(opts.recipe.title || '요리')}</b></div><button type="button" class="rn-x" id="cmQ" aria-label="그만하기"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M5 5L15 15M15 5L5 15" stroke="#6b4430" stroke-width="6" stroke-linecap="round"/><path d="M5 5L15 15M15 5L5 15" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button>
      <div class="cm-board"><div class="cm-steps" id="cmS">${steps.map((x, i) => `<p data-i="${i}"><b>${i + 1}.</b><span>${LABEL[x.type] || ''}</span></p>`).join('')}</div><span class="cm-k" id="cmK"></span></div>
      <div class="cm-stage"><em class="cm-tag" id="cmT"></em><canvas id="cmC" width="${W * dpr}" height="${H * dpr}"></canvas></div>
      <p class="cm-hint" id="cmH"></p>
      <div class="cm-tray">${uniq.slice(0, 8).map((it) => `<i data-id="${escH(it.id)}"><img src="${escH(SRC(it.id))}" alt=""><small>${escH(it.name.slice(0, 5))}</small></i>`).join('')}</div></div>`;
    root.hidden = false;
    const cv = root.querySelector('#cmC'), g = cv.getContext('2d'); g.scale(dpr, dpr);
    const elT = root.querySelector('#cmT'), elK = root.querySelector('#cmK'), elH = root.querySelector('#cmH'), rows = [...root.querySelectorAll('#cmS p')], trays = [...root.querySelectorAll('.cm-tray i')];
    const ctx = { beep: opts.beep || (() => {}), melody: opts.melody || (() => {}) };
    steps.forEach((s) => s.items.forEach((it) => img(it.id))); steps.forEach((s) => s.item && img(s.item.id));
    return new Promise((resolve) => {
      let k = -1, cur = null, raf = 0, last = performance.now(), t = 0, res = 0, alive = true;
      const stars = [];
      const next = () => {
        k++; if (k >= steps.length) return end(false);
        const s = steps[k]; s.ctx = ctx; cur = (G[s.type] || G.mix)(s); res = 0;
        elT.textContent = cur.title.replace(/^[^\s가-힣]+\s*/, ''); elK.textContent = `${k + 1}/${steps.length}`; elH.textContent = cur.hint; cur._h = cur.hint;
        rows.forEach((p, i) => { p.className = i < k ? 'ok' : i === k ? 'on' : ''; p.querySelector('span').textContent = i === k ? `${LABEL[s.type] || ''} · ${s.line}` : LABEL[steps[i].type] || ''; });
        rows[k] && rows[k].parentElement.scrollTo({ top: rows[k].offsetTop - rows[k].parentElement.offsetTop - 22, behavior: 'smooth' });
        const use = new Set([s.item && s.item.id, ...s.items.map((x) => x.id)]); trays.forEach((t) => t.classList.toggle('use', use.has(t.dataset.id)));
      };
      const end = (quit) => { alive = false; cancelAnimationFrame(raf); const avg = stars.length ? stars.reduce((a, b) => a + b, 0) / stars.length : 1; resolve({ stars: quit ? 0 : Math.max(1, Math.min(3, Math.round(avg))), quit, steps: steps.length }); };
      const loop = (now) => {
        if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        if (!root.isConnected || root.hidden) { end(true); return; }
        cur.update(dt); g.save(); cur.draw(g, t); g.restore();
        if (cur.hint !== cur._h) { elH.textContent = cur.hint; cur._h = cur.hint; }
        if (cur.done) { // 결과 잠깐 보여주고 다음 단계
          if (!res) { res = 1; stars.push(cur.stars || 1); ctx.beep(cur.stars >= 3 ? 1046 : cur.stars === 2 ? 784 : 440, 0.1); }
          res += dt; const a = Math.min(1, res * 3);
          g.fillStyle = `rgba(255,248,230,${0.65 * a})`; g.fillRect(0, 0, W, H);
          g.save(); g.globalAlpha = a; g.translate(W / 2, 112); g.scale(0.8 + 0.2 * a, 0.8 + 0.2 * a);
          rr(g, -96, -46, 192, 92, 22, '#fffaf0'); g.save(); g.clip(); g.fillStyle = ['', '#ffb3a0', '#ffd36b', '#9fdc7a'][cur.stars || 1]; g.fillRect(-96, -46, 192, 28); g.restore(); rr(g, -96, -46, 192, 92, 22, null, OUT, 3);
          txt(g, ['', '아쉬워요…', '좋아요!', '완벽해요!'][cur.stars || 1], 0, -32, 14, OUT, 'center', true);
          for (let i = 0; i < 3; i++) star(g, (i - 1) * 40, 14, i < (cur.stars || 1) ? 15 : 12, i < (cur.stars || 1) ? '#ffbf2e' : '#e9dcc8');
          g.restore();
          if (res > 1.3) next();
        }
        raf = requestAnimationFrame(loop);
      };
      const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
      cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); if (cur && !cur.done && cur.down) cur.down(pt(e)); });
      cv.addEventListener('pointermove', (e) => { if (cur && !cur.done && cur.move) cur.move(pt(e)); });
      const up = (e) => { if (cur && !cur.done && cur.up) cur.up(pt(e)); };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      root.querySelector('#cmQ').onclick = () => { if (!confirm('요리를 그만할까요? 재료는 그대로 남아요')) return; root.hidden = true; end(true); };
      next(); raf = requestAnimationFrame(loop);
    });
  }
  window.TOWN_COOK = { play, plan, _G: G };
})();
