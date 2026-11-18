// 우리 동네 (베타) — 아이소메트릭(비스듬한 시점) 픽셀 세계
// 물결로 사거리 → 별빛 아침 오피스텔 공동현관 → 엘리베이터(4층) → 406호 우리 집 (+ 달빛주막 안)
// - 칸(격자) 위에서 길찾기·충돌을 하고, 화면에는 아이소메트릭으로 그림 (가로 32 · 세로 16 마름모)
// - 뒤쪽(북·서) 바깥벽은 높게, 칸막이·앞쪽 벽은 낮게 → 방 안이 들여다보이는 단면 모형
// - 가구·사람은 깊이 순서(x+y)로 매 프레임 그림, 가구는 꾹 눌러 옮기기 (서버 저장, 둘이 같이 봄)
// - 상대방과 실시간으로 같이 움직이기 + 채팅, 안아주기·뽀뽀 연출 + 깡총깡총 하트
// - 한국 시간에 맞춰 낮·노을·밤. 비밀번호는 서버(/api/town/unlock)에서만 확인
(() => {
  const T = 16;            // 이동 좌표 단위 (1칸 = 16)
  const WH = 34, LOW = 6;  // 높은 벽 · 낮은 벽 높이
  const SPEED = 62;
  const SYNC_MS = 600;
  const qs = new URLSearchParams(location.search);

  const cv = document.getElementById('town');
  const ctx = cv.getContext('2d');
  const buf = document.createElement('canvas');
  const bctx = buf.getContext('2d');

  // ---------- 나 / 상대 ----------
  let me = 'girl';
  try { const p = JSON.parse(localStorage.getItem('kk_profile') || 'null'); if (p && (p.avatar === 'boy' || p.avatar === 'girl')) me = p.avatar; } catch {}
  if (qs.get('as') === 'boy' || qs.get('as') === 'girl') me = qs.get('as');
  const partner = me === 'boy' ? 'girl' : 'boy';
  // 의상: 내 것은 이 폰에 기억, 상대 것은 실시간 보고(tv 칸)로 받음
  const OUTFIT_IDS = { boy: TOWN_SPRITES.OUTFITS.boy.map((o) => o.id), girl: TOWN_SPRITES.OUTFITS.girl.map((o) => o.id) };
  const outfit = { boy: 'shirt', girl: 'dress' };
  try { const o = localStorage.getItem('kk_town_outfit'); if (OUTFIT_IDS[me].includes(o)) outfit[me] = o; } catch {}
  const sprCache = {};
  const sprOf = (who) => { const k = `${who}:${outfit[who]}`; return sprCache[k] || (sprCache[k] = TOWN_SPRITES.build(who, outfit[who])); };
  const NPCSPR = {
    chanbin: TOWN_SPRITES.npc('dandy', { hair: '#3a2a22', hairHi: '#5b4336', pants: '#2b2f38' }),
    jinhee: TOWN_SPRITES.npc('tied', { bangs: 'see', hair: '#6b4a35', hairHi: '#8a6550', pants: '#2b2f38' }),
    haeun: TOWN_SPRITES.npc('tied', { bangs: 'none', hair: '#241c1f', hairHi: '#433a3f', pants: '#2b2f38' }),
    chaehee: TOWN_SPRITES.npc('beard', { top: '#8d9299', topShade: '#6f747b', pants: '#3a3f48', cap: '#2f3a2c', capHi: '#4a5a45', hair: '#3a2a22' }),
    c1: TOWN_SPRITES.npc('boy', { top: '#5b7bb5', topShade: '#4a669a', hair: '#2b2326', hairHi: '#4b3f46', pants: '#3a3f48' }),
    c2: TOWN_SPRITES.npc('girl', { top: '#f2c14e', topShade: '#d9a838', hair: '#6b4a35', hairHi: '#8a6550' }),
    c3: TOWN_SPRITES.npc('boy', { top: '#e07a5f', topShade: '#c2654c', hair: '#4a3a30', hairHi: '#6a5848', pants: '#2b2f38' }),
    c4: TOWN_SPRITES.npc('girl', { top: '#81b29a', topShade: '#6a9a82', hair: '#2b2326', hairHi: '#4b3f46' }),
    c5: TOWN_SPRITES.npc('boy', { top: '#f4f1de', topShade: '#d8d4c0', hair: '#1f1a1c', hairHi: '#3a3236', pants: '#5a4a3a' }),
    c6: TOWN_SPRITES.npc('girl', { top: '#9d8df1', topShade: '#8576d6', hair: '#c49a6c', hairHi: '#dcb88a' }),
  };
  // 기본 이모지 → 우리 손그림 아이콘 (창·안내·버튼 글자 속 이모지를 자동으로 바꿈, 없는 건 지움)
  const EMO_ICON = {
    '😊': 'smile', '🎒': 'bag', '🧊': 'fridge', '🍳': 'pan', '🛒': 'cart', '📒': 'recipe', '📖': 'recipe', '👕': 'shirt', '🛋️': 'sofa', '🛋': 'sofa', '💳': 'card', '🚲': 'bike', '🛵': 'moto', '⛑️': 'helmet', '⛑': 'helmet',
    '🚶': 'walk', '🥚': 'egg', '📌': 'pin', '📷': 'photo', '✅': 'check', '⭐': 'star', '🌟': 'star', '✨': 'star', '🎸': 'guitar', '🧽': 'sponge', '🫧': 'sponge', '🤲': 'hands', '👆': 'knock', '💬': 'talk',
    '🍽️': 'plate', '🍽': 'plate', '🎈': 'balloon', '🌙': 'moon', '🐾': 'paw', '🏠': 'home', '🏡': 'home', '🍒': 'berry', '💧': 'drop', '🍲': 'soup', '🍄': 'mushroom', '🎙️': 'mic', '🎙': 'mic', '💡': 'bulb', '🐱': 'cat',
    '🎯': 'target', '🏙️': 'city', '🏙': 'city', '🔄': 'turn', '🛑': 'stop', '📻': 'walkie', '🗺️': 'city', '🔥': 'pan', '🍜': 'soup', '🤩': 'happy', '😤': 'angry', '💢': 'angry', '😢': 'sad', '☺️': 'shy', '🥰': 'love', '😲': 'surprise', '😒': 'sulk', '😪': 'sleepy', '💤': 'sleepy', '🥹': 'shy', '😋': 'happy', '🤗': 'hands', '💋': 'love', '😬': 'surprise', '🦷': 'surprise', '😣': 'sad', '🥺': 'sad',
  };
  const DOODLE = { '💕': 'hearts', '💗': 'heart', '💖': 'heart', '💓': 'heart', '❤️': 'heart', '💑': 'hearts', '🫂': 'hearts', '🎉': 'sparkle', '🎶': 'sparkle', '🎵': 'sparkle', '🔔': 'bell', '☀️': 'sun', '🍺': 'beer', '🍶': 'beer', '🥂': 'wine', '🍷': 'wine', '☕': 'coffee', '📮': 'mailbox', '✉️': 'letter', '🗓️': 'calendar', '📅': 'calendar', '🔒': 'lock', '📍': 'pin', '🎁': 'gift', '🌸': 'blossom', '📺': 'frame', '🧾': 'scroll', '🖼️': 'frame', '🥢': 'noodle', '🍱': 'plate' };
  const EMO_RE = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;
  const noEmoji = (t) => String(t).replace(EMO_RE, (m) => (/^[\u2190-\u21FF]/.test(m) ? m : '')).replace(/\s{2,}/g, ' ').trim();
  function iconize(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hits = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { EMO_RE.lastIndex = 0; if (EMO_RE.test(n.nodeValue) && !n.parentElement.closest('.chat-list, input, textarea')) hits.push(n); }
    for (const n of hits) {
      const frag = document.createDocumentFragment(); let last = 0; const v = n.nodeValue; EMO_RE.lastIndex = 0;
      for (let m; (m = EMO_RE.exec(v));) {
        if (/^[\u2190-\u21FF]/.test(m[0])) continue; // 화살표(가구 옮기기)는 그대로
        frag.append(v.slice(last, m.index)); last = m.index + m[0].length;
        const k = m[0].replace(/\uFE0F/g, ''), name = EMO_ICON[m[0]] || EMO_ICON[k], dd = DOODLE[m[0]] || DOODLE[k];
        if (name || dd) { const im = document.createElement('img'); im.className = 'ti'; im.alt = ''; im.src = name ? `icons/town/${name}.svg` : `icons/doodle/${dd}.svg`; frag.append(im); }
      }
      frag.append(v.slice(last)); n.replaceWith(frag);
    }
  }
  const iconObs = new MutationObserver((muts) => { iconObs.disconnect(); for (const m of muts) iconize(m.target.nodeType === 1 ? m.target : m.target.parentNode); watchIcons(); });
  const watchIcons = () => ['modal', 'say', 'toast', 'invPanel', 'camCtl', 'editBar', 'status'].forEach((id) => { const el = document.getElementById(id); if (el) iconObs.observe(el, { childList: true, subtree: true, characterData: true }); });
  document.querySelectorAll('button').forEach((b) => iconize(b));
  watchIcons();

  let names = { boy: '男', girl: '女' };
  fetch('/api/profile', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
    if (d.profiles) names = { boy: d.profiles.boy?.name || '男', girl: d.profiles.girl?.name || '女' };
    updateStatus();
  }).catch(() => {});

  // =====================================================================
  // 아이소메트릭 그리기 도구
  // =====================================================================
  let OX = 0, OY = 0; // 현재 그리는 장면의 원점
  const isoRaw = (x, y, z = 0) => [OX + (x - y) * 16, OY + (x + y) * 8 - z];
  // 가구 회전: 그리는 동안 ROT 를 켜 두면 좌표·면이 90°씩 돌아감
  let ROT = null; // { f: 회전된 가구, r: 0~3, W0, D0 }
  function rotPt(R0, x, y) {
    const lx = x - R0.f.x, ly = y - R0.f.y;
    const [nx, ny] = R0.r === 1 ? [R0.D0 - ly, lx] : R0.r === 2 ? [R0.W0 - lx, R0.D0 - ly] : R0.r === 3 ? [ly, R0.W0 - lx] : [lx, ly];
    return [R0.f.x + nx, R0.f.y + ny];
  }
  const rotVec = (r, dx, dy) => (r === 1 ? [-dy, dx] : r === 2 ? [-dx, -dy] : r === 3 ? [dy, -dx] : [dx, dy]);
  const iso = (x, y, z = 0) => { if (ROT) [x, y] = rotPt(ROT, x, y); return isoRaw(x, y, z); };
  function rotRect(x, y, w, d) { const a = rotPt(ROT, x, y), b = rotPt(ROT, x + w, y + d); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])]; }
  function raw(fn) { const k = ROT; ROT = null; try { fn(); } finally { ROT = k; } }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v))));
    return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }
  const topQ = (x, y, z, w, d) => [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)];
  // 3D 받아적기: CAP 이 켜져 있으면 그리지 않고 상자·면 정보를 모음 (town3d-view.js 가 3D로 만듦)
  let CAP = null;
  const cap = (p) => { CAP.out.push(p); p.g = CAP.group; };
  function top(g, x, y, z, w, d, c) { if (ROT) { const [X, Y, W2, D2] = rotRect(x, y, w, d); return raw(() => top(g, X, Y, z, W2, D2, c)); } if (CAP) return cap({ k: 't', x, y, z, w, d, c }); poly(g, topQ(x, y, z, w, d), c); }
  function sRect(g, yy, x0, x1, z0, z1, c) { // 남쪽(앞왼쪽) 면
    if (ROT) { const a = rotPt(ROT, x0, yy), b = rotPt(ROT, x1, yy), [dx, dy] = rotVec(ROT.r, 0, 1); return raw(() => { if (dy > 0) sRect(g, a[1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), z0, z1, c); else if (dx > 0) eRect(g, a[0], Math.min(a[1], b[1]), Math.max(a[1], b[1]), z0, z1, c); }); }
    if (CAP) return cap({ k: 's', y: yy, x0, x1, z0, z1, c });
    poly(g, [iso(x0, yy, z0), iso(x1, yy, z0), iso(x1, yy, z1), iso(x0, yy, z1)], c);
  }
  function eRect(g, xx, y0, y1, z0, z1, c) { // 동쪽(앞오른쪽) 면
    if (ROT) { const a = rotPt(ROT, xx, y0), b = rotPt(ROT, xx, y1), [dx, dy] = rotVec(ROT.r, 1, 0); return raw(() => { if (dx > 0) eRect(g, a[0], Math.min(a[1], b[1]), Math.max(a[1], b[1]), z0, z1, c); else if (dy > 0) sRect(g, a[1], Math.min(a[0], b[0]), Math.max(a[0], b[0]), z0, z1, c); }); }
    if (CAP) return cap({ k: 'e', x: xx, y0, y1, z0, z1, c });
    poly(g, [iso(xx, y0, z0), iso(xx, y1, z0), iso(xx, y1, z1), iso(xx, y0, z1)], c);
  }
  // 상자: 윗면 · 남쪽면 · 동쪽면 (+ 모서리 하이라이트)
  function box(g, x, y, z, w, d, h, c, o = {}) {
    if (ROT) { const [X, Y, W2, D2] = rotRect(x, y, w, d); return raw(() => box(g, X, Y, z, W2, D2, h, c, o)); }
    if (CAP) return cap({ k: 'b', x, y, z, w, d, h, c, s: o.s, e: o.e, t: o.t || shade(c, 0.14) });
    sRect(g, y + d, x, x + w, z, z + h, o.s || c);
    eRect(g, x + w, y, y + d, z, z + h, o.e || shade(c, -0.18));
    top(g, x, y, z + h, w, d, o.t || shade(c, 0.14));
    if (!o.noEdge) { // 위 모서리 밝은 선
      const a = iso(x, y + d, z + h), b = iso(x + w, y + d, z + h), e = iso(x + w, y, z + h);
      g.fillStyle = o.edge || shade(c, 0.3);
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(e[0], e[1]); g.lineTo(e[0], e[1] + 1); g.lineTo(b[0], b[1] + 1); g.lineTo(a[0], a[1] + 1); g.closePath(); g.fill();
    }
  }
  const circle = (g, x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
  const ell = (g, x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const R2 = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; // 고화질용: 반올림 없이
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function bbox(x, y, z, w, d, h) { // 화면 위 감싸는 사각형 (터치 판정)
    const pts = [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z), iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  // ----- 바닥 (마름모 한 칸) -----
  function floorTile(g, kind, x, y, r) {
    switch (kind) {
      case 'wood': {
        top(g, x, y, 0, 1, 1, '#e2bf8f');
        for (let k = 0; k < 4; k++) { top(g, x, y + k * 0.25, 0, 1, 0.035, '#c99f6c'); const off = ((x * 7 + y * 3 + k * 5) % 3) * 0.3; top(g, x + off, y + k * 0.25, 0, 0.04, 0.25, '#cfa572'); }
        break;
      }
      case 'dark': { // 짙은 원목 마루: 판마다 색 · 엇갈린 이음매 · 옹이 · 결
        for (let k = 0; k < 4; k++) {
          const v = (x * 7 + y * 5 + k * 3) % 4, col = ['#9c6b43', '#a5744a', '#93633c', '#a06e45'][v];
          top(g, x, y + k * 0.25, 0, 1, 0.25, col);
          top(g, x, y + k * 0.25, 0, 1, 0.02, '#6f4628');
          const seam = ((x * 3 + y * 7 + k * 5) % 5) * 0.2; top(g, x + seam, y + k * 0.25, 0, 0.02, 0.25, '#77502f');
          top(g, x + 0.1 + v * 0.18, y + k * 0.25 + 0.1, 0, 0.3, 0.012, 'rgba(70,40,20,.35)');
          if ((x + y + k) % 7 === 0) top(g, x + 0.55, y + k * 0.25 + 0.08, 0, 0.07, 0.07, '#6a4226');
          top(g, x + 0.05, y + k * 0.25 + 0.04, 0, 0.4, 0.015, 'rgba(255,220,170,.12)');
        }
        break;
      }
      case 'tile': top(g, x, y, 0, 1, 1, '#f1ebe0'); top(g, x, y + 0.5, 0, 1, 0.03, '#cfc6b6'); top(g, x + 0.5, y, 0, 0.03, 1, '#cfc6b6'); top(g, x, y, 0, 1, 0.03, '#d9d1c2'); top(g, x, y, 0, 0.03, 1, '#d9d1c2'); break;
      case 'bath': top(g, x, y, 0, 1, 1, '#d7ecf2'); for (let k = 1; k < 4; k++) { top(g, x, y + k / 4, 0, 1, 0.03, '#bcd9e2'); top(g, x + k / 4, y, 0, 0.03, 1, '#bcd9e2'); } break;
      case 'stone': top(g, x, y, 0, 1, 1, (x + y) % 2 ? '#ece6dc' : '#ddd6ca'); break;
      case 'marble': { // 화이트 대리석: 큰 판 + 옅은 회색 결
        top(g, x, y, 0, 1, 1, (x + y) % 2 ? '#f7f7f5' : '#efefec');
        top(g, x, y, 0, 1, 0.025, '#dcdcd8'); top(g, x, y, 0, 0.025, 1, '#dcdcd8');
        const v = (x * 7 + y * 13) % 5;
        if (v < 3) { top(g, x + 0.1 + v * 0.15, y + 0.2, 0, 0.5, 0.03, '#d6d6d2'); top(g, x + 0.45 + v * 0.1, y + 0.22, 0, 0.03, 0.4, '#dededa'); }
        if (v === 4) top(g, x + 0.3, y + 0.6, 0, 0.35, 0.03, '#d2d2ce');
        top(g, x + 0.08, y + 0.08, 0, 0.12, 0.12, 'rgba(255,255,255,.7)');
        break;
      }
      case 'carpet': top(g, x, y, 0, 1, 1, '#8f99a6'); if ((x + y) % 2) top(g, x + 0.3, y + 0.3, 0, 0.4, 0.4, '#9aa3b0'); break;
      case 'deck': top(g, x, y, 0, 1, 1, '#cbbfae'); for (let k = 1; k < 4; k++) top(g, x + k / 4, y, 0, 0.04, 1, '#b3a691'); break;
      case 'entry': top(g, x, y, 0, 1, 1, '#b9b0a4'); for (let k = 0; k < 4; k++) top(g, x + ((x * 5 + k * 7) % 9) / 10, y + ((y * 3 + k * 5) % 9) / 10, 0, 0.12, 0.12, k % 2 ? '#a69d91' : '#cbc3b8'); break;
      case 'sidewalk': {
        top(g, x, y, 0, 1, 1, '#dcd6cc');
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const v = r(); top(g, x + i / 2 + 0.03, y + j / 2 + 0.03, 0, 0.44, 0.44, v < 0.12 ? '#9a958f' : v < 0.55 ? '#e6e1d8' : '#d3cdc2'); }
        break;
      }
      case 'road': top(g, x, y, 0, 1, 1, '#6c6f76'); for (let k = 0; k < 3; k++) top(g, x + r() * 0.9, y + r() * 0.9, 0, 0.06, 0.06, r() < 0.5 ? '#7d8087' : '#5f626a'); break;
      case 'grass': top(g, x, y, 0, 1, 1, '#9cc47a'); for (let k = 0; k < 3; k++) top(g, x + r() * 0.85, y + r() * 0.85, 0, 0.08, 0.08, '#7faa5e'); break;
      default: top(g, x, y, 0, 1, 1, '#e2bf8f');
    }
  }

  // ----- 벽: 얇은 판 (이웃 벽 방향으로 팔을 뻗음). 뒤쪽 바깥벽만 높게 -----
  function paintWalls(g, grid, floorOf, opt = {}) {
    const H = grid.length, W = grid[0].length;
    const isWall = (x, y) => y >= 0 && y < H && x >= 0 && x < W && ['#', 'W', 'D', 'G'].includes(grid[y][x]);
    const fl = (x, y) => (y >= 0 && y < H && x >= 0 && x < W && !isWall(x, y) ? grid[y][x] : null);
    const near = (x, y) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (fl(x + a, y + b)) return true; return false; };
    const r = rnd(5);
    // 바닥 먼저 (벽 칸도 이웃 바닥으로 깔아 벽이 얇아 보이게)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isWall(x, y)) { floorTile(g, floorOf(grid[y][x]), x, y, r); continue; }
      const nb = fl(x, y + 1) || fl(x + 1, y) || fl(x - 1, y) || fl(x, y - 1);
      if (nb && near(x, y)) floorTile(g, floorOf(nb), x, y, r);
    }
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (isWall(x, y) && near(x, y)) cells.push([x, y]);
    cells.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
    const t = 0.22, c0 = 0.5 - t / 2;
    for (const [x, y] of cells) {
      const c = grid[y][x];
      const back = (fl(x, y + 1) || fl(x + 1, y)) && !fl(x, y - 1) && !fl(x - 1, y);
      const inner = (fl(x, y - 1) && fl(x, y + 1)) || (fl(x - 1, y) && fl(x + 1, y)) || (fl(x, y + 1) && fl(x, y - 1)) || ((fl(x + 1, y) || fl(x, y + 1)) && (fl(x - 1, y) || fl(x, y - 1)));
      const h = CAP ? (c === 'G' ? 14 : WH) : c === 'G' ? 14 : back ? WH : inner ? 14 : LOW;
      if (CAP) CAP.group = `w${x},${y}`;
      const col = c === 'G' ? '#b9dcec' : opt.wall ? opt.wall(fl(x, y + 1) || fl(x + 1, y)) : '#f3e6d6';
      const live = (nx, ny) => isWall(nx, ny) && near(nx, ny);
      const L = live(x - 1, y), Rr = live(x + 1, y), U = live(x, y - 1), D = live(x, y + 1);
      // 팔(판) 목록: 가로 판(x 방향), 세로 판(y 방향)
      const segs = [];
      if (L || Rr || (!U && !D)) segs.push([L ? x : x + c0, y + c0, (Rr ? x + 1 : x + c0 + t) - (L ? x : x + c0), t]);
      if (U || D) segs.push([x + c0, U ? y : y + c0, t, (D ? y + 1 : y + c0 + t) - (U ? y : y + c0)]);
      for (const [sx, sy, sw, sd] of segs) box(g, sx, sy, 0, sw, sd, h, col, { t: opt.cap || '#fbf6ef', e: shade(col, -0.12), edge: '#ffffff' });
      // 높은 벽 장식: 걸레받이 · 창문 · 문
      if (back) {
        const faceS = fl(x, y + 1), faceE = fl(x + 1, y);
        if (faceS) {
          const yy = y + c0 + t;
          sRect(g, yy, x, x + 1, 0, 3, opt.base || '#c9a47c');
          if (c === 'W') { sRect(g, yy, x + 0.08, x + 0.92, 9, 29, '#7f8a95'); sRect(g, yy, x + 0.12, x + 0.88, 10, 28, '#a9dcf5'); sRect(g, yy, x + 0.12, x + 0.88, 10, 15, '#5fb3d9'); sRect(g, yy, x + 0.5, x + 0.53, 10, 28, '#7f8a95'); }
          if (c === 'D') { sRect(g, yy, x + 0.15, x + 0.85, 0, 26, '#8e4f3c'); sRect(g, yy, x + 0.2, x + 0.8, 1, 25, '#b8705a'); }
        }
        if (faceE && !faceS) { const xx = x + c0 + t; eRect(g, xx, y, y + 1, 0, 3, opt.base ? shade(opt.base, -0.1) : '#b8946e'); if (c === 'W') { eRect(g, xx, y + 0.1, y + 0.9, 10, 28, '#9dd2ee'); } }
      }
      if (CAP) CAP.group = '';
    }
  }

  // =====================================================================
  // 가구 · 소품 (격자 좌표로 상자를 쌓아 그림)
  // =====================================================================
  // 탈것 옆모습 (화면 기준 dir: 1 = 오른쪽을 봄, -1 = 왼쪽)
  function drawMoto(g, px, py, dir, col = '#ffd21f') {
    const X = (dx) => px + dx * dir, dark = '#2b2b30';
    for (const wx of [-7, 7]) { circle(g, X(wx), py - 3.2, 3.4, dark); circle(g, X(wx), py - 3.2, 1.6, '#9aa3ad'); circle(g, X(wx), py - 3.2, 0.6, dark); }
    g.fillStyle = col; g.beginPath(); g.moveTo(X(-9), py - 7); g.lineTo(X(-2), py - 7); g.lineTo(X(2), py - 4); g.lineTo(X(5), py - 4); g.lineTo(X(6), py - 9); g.lineTo(X(8), py - 9); g.lineTo(X(7), py - 3.5); g.lineTo(X(-4), py - 3.5); g.lineTo(X(-9), py - 5); g.closePath(); g.fill();
    g.fillStyle = shade(col, -0.2); g.fillRect(Math.min(X(-3), X(4)), py - 4.6, 7, 1.2);
    R2(g, Math.min(X(-8), X(-1.5)), py - 8.6, 6.5, 1.8, '#3a2a22'); // 시트
    g.strokeStyle = dark; g.lineWidth = 0.9; g.beginPath(); g.moveTo(X(7), py - 3.2); g.lineTo(X(6.4), py - 12); g.stroke(); // 앞 포크
    R2(g, Math.min(X(4.5), X(8.5)), py - 12.6, 4, 0.9, dark); // 핸들
    circle(g, X(8.4), py - 9.6, 1.1, '#fff7c2'); R2(g, Math.min(X(-9.8), X(-8.8)), py - 6.8, 1, 1, '#e8343a'); // 전조등 · 후미등
    R2(g, Math.min(X(-10), X(-6)), py - 9.4, 4, 0.7, '#4a4f58'); // 짐받이
  }
  function drawBikeSide(g, px, py, dir, col = '#f2c230') {
    const X = (dx) => px + dx * dir, dark = '#2b2b30';
    g.strokeStyle = dark; g.lineWidth = 0.8;
    for (const wx of [-6, 6]) { g.beginPath(); g.arc(X(wx), py - 3.6, 3.4, 0, 7); g.stroke(); R2(g, X(wx) - 0.4, py - 4, 0.8, 0.8, '#9aa3ad'); }
    g.strokeStyle = col; g.lineWidth = 1.1; g.beginPath(); g.moveTo(X(-6), py - 3.6); g.lineTo(X(-1), py - 4); g.lineTo(X(6), py - 3.6); g.moveTo(X(-1), py - 4); g.lineTo(X(-2.5), py - 9); g.moveTo(X(-1), py - 4); g.lineTo(X(4.5), py - 9.5); g.lineTo(X(6), py - 3.6); g.moveTo(X(-2.5), py - 9); g.lineTo(X(4.5), py - 9.5); g.stroke();
    R2(g, Math.min(X(-4), X(-1)), py - 10, 3, 1, dark); R2(g, Math.min(X(3.5), X(6.5)), py - 11, 3, 0.9, dark);
    g.fillStyle = col; g.fillRect(Math.min(X(5.5), X(9)), py - 9.5, 3.5, 2.6); // 앞 바구니
  }
  function drawFurniture(g, f, t) {
    if (f.rot && !ROT) { const k = { f, r: f.rot, W0: f.w0, D0: f.h0 }; ROT = k; try { drawFurniture(g, { ...f, w: f.w0, h: f.h0 }, t); } finally { ROT = null; } return; }
    const { x, y, w, h: d } = f;
    switch (f.kind) {
      case 'bed':
        box(g, x + 0.05, y + 0.05, 0, w - 0.1, d - 0.1, 6, '#7a5440');
        box(g, x + 0.05, y + 0.02, 0, w - 0.1, 0.2, 20, '#5e3f30', { t: '#8a6248' }); // 머리판
        box(g, x + 0.12, y + 0.25, 6, w - 0.24, d - 0.35, 4, '#fffaf4');
        box(g, x + 0.2, y + 0.32, 10, 1.1, 0.55, 3, '#ffffff'); box(g, x + 1.7, y + 0.32, 10, 1.1, 0.55, 3, '#eceef2');
        drawBlanket(g, f);
        break;
      case 'rug': top(g, x, y, 0.5, w, d, '#c9ccd1'); top(g, x + 0.15, y + 0.15, 0.6, w - 0.3, d - 0.3, '#d8dbdf'); for (let i = 0; i < 6; i++) top(g, x + 0.2, y + 0.3 + i * 0.45, 0.7, w - 0.4, 0.03, '#c3c6cb'); break;
      case 'glasstable': { // 투명한 직사각 유리 탁자
        for (const [lx, ly] of [[0.2, 0.2], [0.72, 0.2], [0.2, d - 0.28], [0.72, d - 0.28]]) box(g, x + lx, y + ly, 0, 0.06, 0.06, 8, '#b8bcc2', { noEdge: true });
        g.globalAlpha = 0.45; box(g, x + 0.12, y + 0.12, 8, 0.76, d - 0.24, 1.5, '#bfe6f2', { t: '#d8f2fa', edge: '#ffffff' }); g.globalAlpha = 1;
        top(g, x + 0.2, y + 0.3, 9.6, 0.1, d - 0.8, 'rgba(255,255,255,.75)');
        top(g, x + 0.45, y + d / 2 - 0.2, 9.7, 0.25, 0.3, '#f4f4f0'); top(g, x + 0.5, y + d / 2 - 0.15, 9.8, 0.15, 0.2, '#8a6248'); // 머그컵
        break;
      }
      case 'rug2': top(g, x, y, 0.5, w, d, '#e9dcff'); top(g, x + 0.12, y + 0.12, 0.6, w - 0.24, d - 0.24, '#d8c6f5'); for (let i = 0; i < 6; i++) top(g, x + 0.2 + (i % 3) * 0.6, y + 0.3 + Math.floor(i / 3) * 0.9, 0.7, 0.1, 0.1, '#ffffff'); break;
      case 'vanity': box(g, x + 0.1, y + 0.1, 0, 0.6, d - 0.2, 12, '#f3e3cf'); box(g, x + 0.05, y + 0.2, 12, 0.12, d - 0.4, 16, '#e8d3b8'); eRect(g, x + 0.17, y + 0.3, y + d - 0.3, 14, 26, '#bfe3ef'); eRect(g, x + 0.17, y + 0.4, y + 0.6, 16, 24, '#e8f8ff'); top(g, x + 0.3, y + 0.5, 12.5, 0.15, 0.15, '#ff8fab'); top(g, x + 0.35, y + 1.2, 12.5, 0.12, 0.2, '#c79bd8'); break;
      case 'closet': box(g, x + 0.1, y + 0.05, 0, 0.8, d - 0.1, 18, '#d9b48a'); for (let i = 1; i < 3; i++) eRect(g, x + 0.9, y + 0.05, y + d - 0.05, i * 6, i * 6 + 0.8, '#b38b62'); break;
      case 'plant': box(g, x + 0.3, y + 0.3, 0, 0.4, 0.4, 7, '#c98a5a'); { const [px, py] = iso(x + 0.5, y + 0.5, 14); circle(g, px, py, 7, '#4f8f45'); circle(g, px - 3, py - 2, 4, '#5c9e50'); circle(g, px + 3, py - 4, 3.5, '#6fb35d'); R(g, px + 1, py - 7, 1, 1, '#8fd07a'); } break;
      case 'toilet': box(g, x + 0.25, y + 0.1, 0, 0.5, 0.25, 14, '#f4f7f9'); box(g, x + 0.25, y + 0.35, 0, 0.5, 0.5, 6, '#ffffff'); top(g, x + 0.33, y + 0.42, 6.5, 0.34, 0.34, '#cfe3ea'); break;
      case 'sink': box(g, x + 0.15, y + 0.15, 0, 0.7, 0.6, 12, '#ffffff'); top(g, x + 0.25, y + 0.25, 12.5, 0.5, 0.4, '#cfe3ea'); box(g, x + 0.45, y + 0.15, 12, 0.08, 0.08, 5, '#9aa3ad'); break;
      case 'sofa': // 등받이 동쪽(오른쪽), 서쪽 TV를 봄
        box(g, x + 0.1, y + 0.05, 0, 0.85, d - 0.1, 7, '#2a4a8f', { t: '#3558a3' }); // 진한 블루 커버
        box(g, x + 0.7, y + 0.05, 7, 0.25, d - 0.1, 9, '#223d78', { t: '#2d4c8e' });
        box(g, x + 0.1, y + 0.05, 7, 0.6, 0.25, 4, '#223d78'); box(g, x + 0.1, y + d - 0.3, 7, 0.6, 0.25, 4, '#223d78');
        top(g, x + 0.15, y + 1, 7.2, 0.5, 0.05, '#1f3870'); top(g, x + 0.15, y + 2, 7.2, 0.5, 0.05, '#1f3870');
        box(g, x + 0.45, y + 0.4, 7, 0.22, 0.45, 5, '#e9ecf1'); box(g, x + 0.45, y + d - 0.85, 7, 0.22, 0.45, 5, '#c9ccd3');
        break;
      case 'guitar': {
        const [px, py] = iso(x + 0.5, y + 0.5, 0);
        ell(g, px, py, 5, 2, 'rgba(0,0,0,.15)');
        R(g, px - 3, py - 3, 6, 2, '#3a3d42'); R(g, px - 1, py - 8, 2, 6, '#3a3d42'); // 거치대
        if (guitarInHand()) break;
        R(g, px - 1, py - 24, 2, 12, '#5a3a22'); R(g, px - 2, py - 26, 4, 3, '#3a2a1a');
        circle(g, px, py - 7, 5, '#d9822b'); circle(g, px, py - 12, 4, '#e8963a'); circle(g, px, py - 9, 1.6, '#3a2a1a'); R(g, px, py - 24, 1, 19, '#f4e4c4');
        break;
      }
      case 'tv': // 서쪽 벽 TV, 동쪽(화면)을 봄
        box(g, x + 0.1, y + 0.1, 0, 0.6, d - 0.2, 8, '#a07a5a');
        box(g, x + 0.25, y + 0.35, 8, 0.12, d - 0.7, 18, '#1b1d22');
        drawTvFace(g, f, t);
        break;
      case 'calendar': { const yy = y + 0.61; sRect(g, yy, x + 0.25, x + 0.75, 14, 26, '#ffffff'); sRect(g, yy, x + 0.25, x + 0.75, 23, 26, '#ff6b81'); for (let i = 0; i < 3; i++) sRect(g, yy, x + 0.3, x + 0.7, 16 + i * 2.2, 16.8 + i * 2.2, '#bbbbbb'); break; }
      case 'bookshelf': box(g, x + 0.05, y + 0.05, 0, w - 0.1, 0.5, 24, '#a77b54'); for (let r = 0; r < 3; r++) { sRect(g, y + 0.55, x + 0.1, x + w - 0.1, 2 + r * 7, 2.6 + r * 7, '#7d5838'); for (let i = 0; i < 8; i++) sRect(g, y + 0.55, x + 0.15 + i * 0.22, x + 0.32 + i * 0.22, 3 + r * 7, 8 + r * 7, ['#ff8fab', '#8fd0ff', '#ffd166', '#9be29b', '#c79bd8', '#ffffff'][(i + r * 2) % 6]); } break;
      case 'fridge': {
        box(g, x + 0.1, y + 0.1, 0, 0.8, 0.8, 28, '#e9eef3'); sRect(g, y + 0.9, x + 0.1, x + 0.9, 18, 18.8, '#c3ccd5'); sRect(g, y + 0.9, x + 0.75, x + 0.8, 8, 15, '#9aa3ad'); sRect(g, y + 0.9, x + 0.75, x + 0.8, 20, 25, '#9aa3ad');
        sRect(g, y + 0.9, x + 0.14, x + 0.7, 19.5, 27, '#c89a64'); // 코르크보드
        photos.slice(0, 6).forEach((p, i) => { const [qx, qy] = iso(x + 0.2 + (i % 3) * 0.17, y + 0.9, 26.5 - Math.floor(i / 3) * 3.6); R2(g, qx, qy, 2.6, 3.1, '#ffffff'); const im = photoImgs[p.id]; if (im && im.complete && im.naturalWidth) g.drawImage(im, qx + 0.3, qy + 0.3, 2, 2); else R2(g, qx + 0.3, qy + 0.3, 2, 2, '#cfe8ff'); R2(g, qx + 1, qy - 0.4, 0.7, 0.7, p.pin); });
        if (!photos.length) sRect(g, y + 0.9, x + 0.2, x + 0.35, 22, 25, '#ffd166');
        break;
      }
      case 'induction': box(g, x + 0.02, y + 0.05, 0, 0.96, 0.9, 12, '#f7f3ec'); top(g, x + 0.12, y + 0.15, 12.2, 0.76, 0.7, '#1e2024'); top(g, x + 0.2, y + 0.25, 12.4, 0.25, 0.25, '#3a3d42'); top(g, x + 0.55, y + 0.45, 12.4, 0.25, 0.25, '#3a3d42'); top(g, x + 0.28, y + 0.33, 12.6, 0.08, 0.08, '#ff6b4a'); box(g, x + 0.5, y + 0.1, 12, 0.3, 0.3, 4, '#b8c1ca'); break;
      case 'sinkK': box(g, x + 0.02, y + 0.05, 0, 0.96, 0.9, 12, '#f7f3ec'); top(g, x + 0.2, y + 0.2, 12.2, 0.6, 0.55, '#cfe3ea'); box(g, x + 0.45, y + 0.08, 12, 0.08, 0.08, 6, '#9aa3ad'); break;
      case 'table': { // 흰 식탁 + 액자 소품
        for (const [lx, ly] of [[0.12, 0.12], [w - 0.2, 0.12], [0.12, d - 0.2], [w - 0.2, d - 0.2]]) box(g, x + lx, y + ly, 0, 0.08, 0.08, 9, '#e3e5e8', { noEdge: true });
        box(g, x + 0.05, y + 0.05, 9, w - 0.1, d - 0.1, 2, '#f7f8f9', { t: '#ffffff', edge: '#ffffff' });
        // 액자: 테이블 위에 세워 둔 작은 사진 액자
        box(g, x + w / 2 - 0.22, y + 0.35, 11, 0.44, 0.06, 9, '#c9a46a', { t: '#e0c08a' });
        sRect(g, y + 0.41, x + w / 2 - 0.17, x + w / 2 + 0.17, 12.5, 18.5, '#ffe3ea'); sRect(g, y + 0.41, x + w / 2 - 0.12, x + w / 2 + 0.12, 13.5, 16, '#9fd3f0');
        { const [hx, hy] = iso(x + w / 2, y + 0.41, 16.5); R(g, hx - 1, hy, 1, 1, '#ff6b81'); R(g, hx + 1, hy, 1, 1, '#ff6b81'); R(g, hx, hy + 1, 1, 1, '#ff6b81'); }
        top(g, x + w / 2 - 0.2, y + d - 0.6, 11.1, 0.3, 0.3, '#eaf4ff'); top(g, x + w / 2 - 0.12, y + d - 0.52, 11.3, 0.14, 0.14, '#ff8fab'); // 작은 꽃병
        break;
      }
      case 'clearchair': { // 투명 아크릴 의자 (등받이 서쪽, 동쪽을 봄)
        g.globalAlpha = 0.55;
        for (const [lx, ly] of [[0.25, 0.25], [0.68, 0.25], [0.25, 0.68], [0.68, 0.68]]) box(g, x + lx, y + ly, 0, 0.07, 0.07, 6, '#cfeaf5', { noEdge: true });
        box(g, x + 0.22, y + 0.22, 6, 0.56, 0.56, 1.5, '#d6f0fa', { t: '#e9f8fd', edge: '#ffffff' });
        box(g, x + 0.2, y + 0.22, 7.5, 0.07, 0.56, 10, '#cfeaf5', { t: '#ffffff', edge: '#ffffff' });
        g.globalAlpha = 1;
        top(g, x + 0.3, y + 0.3, 7.6, 0.1, 0.35, 'rgba(255,255,255,.8)');
        break;
      }
      case 'desk': // 동쪽 벽 책상, 서쪽을 봄
        box(g, x + 0.3, y + 0.1, 0, 0.65, d - 0.2, 10, '#c79a6a');
        box(g, x + 0.62, y + 0.45, 10, 0.08, 0.9, 11, '#24272d'); eRect(g, x + 0.7, y + 0.5, y + 1.3, 13, 20, f.id === 'deskA' ? '#2c4a6a' : '#2c5a3a');
        top(g, x + 0.38, y + 0.5, 10.2, 0.15, 0.7, '#e9edf1');
        box(g, x - 0.15, y + 0.6, 0, 0.35, 0.6, 6, '#5a5f6a'); box(g, x - 0.15, y + 0.6, 6, 0.08, 0.6, 7, '#4a4f5a');
        break;
      case 'wardrobe': box(g, x + 0.05, y + 0.25, 0, w - 0.1, 0.7, 30, '#c49a6c'); for (let i = 1; i < 3; i++) sRect(g, y + 0.95, x + i, x + i + 0.04, 1, 29, '#9c7450'); for (let i = 0; i < 3; i++) sRect(g, y + 0.95, x + i + 0.42, x + i + 0.58, 15, 16, '#7a5a3c'); break;
      case 'chair': box(g, x + 0.25, y + 0.25, 0, 0.5, 0.5, 7, '#b07d52'); box(g, x + 0.25, y + 0.2, 7, 0.5, 0.1, 9, '#8a5a3c'); box(g, x + 0.78, y + 0.35, 0, 0.18, 0.18, 4, '#cfcfcf'); break;
      case 'washer': box(g, x + 0.1, y + 0.1, 0, 0.8, d - 0.2, 20, '#f4f6f8'); { const [px, py] = iso(x + 0.5, y + d - 0.1, 10); ell(g, px - 3, py, 4, 4, '#9ec7e0'); ell(g, px - 3, py, 2.5, 2.5, '#c9e4f2'); } break;
      case 'tub': box(g, x + 0.05, y + 0.1, 0, w - 0.1, 0.85, 9, '#ffffff'); top(g, x + 0.2, y + 0.22, 9.2, w - 0.4, 0.6, '#bfe3ef'); break;
      case 'shoes': top(g, x + 0.2, y + 0.2, 0.5, 0.25, 0.15, '#333'); top(g, x + 0.55, y + 0.5, 0.5, 0.25, 0.15, '#f39cb2'); top(g, x + 0.25, y + 0.65, 0.5, 0.25, 0.15, '#d8c29e'); break;
      // 가게 소품
      case 'pubtable': { // 원목 테이블 + 노란 주전자 · 막걸리 사발 · 고추튀김 · 육전 · 젓가락 · 휴지
        for (const [lx, ly] of [[0.14, 0.2], [w - 0.24, 0.2], [0.14, d - 0.3], [w - 0.24, d - 0.3]]) box(g, x + lx, y + ly, 0, 0.1, 0.1, 8, '#4f321e', { noEdge: true });
        box(g, x + 0.08, y + 0.15, 8, w - 0.16, d - 0.3, 1.6, '#7a4f30', { t: '#9a6a45', edge: '#b8845a' });
        for (let i = 1; i < 4; i++) top(g, x + 0.1, y + 0.15 + i * (d - 0.3) / 4, 9.62, w - 0.2, 0.012, 'rgba(90,55,30,.45)');
        const Z = 9.65;
        // 노란 양은 주전자
        { const kx = x + 0.3, ky = y + 0.32; box(g, kx, ky, Z, 0.22, 0.22, 3.4, '#e9b93a', { t: '#f6d46a', edge: '#fff0a8' }); box(g, kx + 0.05, ky + 0.05, Z + 3.4, 0.12, 0.12, 0.8, '#d6a52c'); const [sx0, sy0] = iso(kx + 0.22, ky + 0.11, Z + 2.4); R2(g, sx0, sy0 - 0.5, 2, 0.8, '#d6a52c'); const [hx0, hy0] = iso(kx + 0.11, ky, Z + 4.2); R2(g, hx0 - 1.5, hy0 - 1, 3, 0.6, '#b98a22'); }
        // 막걸리 사발 2개
        for (const [bx, by2] of [[0.7, 0.32], [w - 0.45, d - 0.55]]) { const [cx2, cy2] = iso(x + bx, y + by2, Z + 1.4); ell(g, cx2, cy2 + 0.8, 2.2, 1.2, '#c9b48a'); ell(g, cx2, cy2, 2.2, 1.1, '#f1e4c4'); ell(g, cx2, cy2, 1.6, 0.75, '#f7f1e2'); }
        // 접시: 고추튀김(초록) · 육전(노랑)
        { const [px2, py2] = iso(x + w / 2 - 0.05, y + d / 2 - 0.05, Z); ell(g, px2, py2, 4.6, 2.3, '#e6e6e6'); ell(g, px2, py2 - 0.3, 4.2, 2, '#ffffff');
          if (f.food === '#d35400' || f.food === '#f2c94c') for (let i = 0; i < 5; i++) { ell(g, px2 - 2.6 + i * 1.3, py2 - 0.4 + (i % 2) * 0.7, 0.9, 0.55, '#e8c34a'); R2(g, px2 - 2.8 + i * 1.3, py2 - 0.6 + (i % 2) * 0.7, 0.6, 0.3, '#f6dc7a'); }
          else for (let i = 0; i < 4; i++) { R2(g, px2 - 3 + i * 1.5, py2 - 0.8 + (i % 2) * 0.6, 1.8, 0.7, '#c98a2e'); R2(g, px2 - 2.8 + i * 1.5, py2 - 0.7 + (i % 2) * 0.6, 0.6, 0.5, '#5e9e3a'); } }
        // 간장 종지 · 젓가락 · 휴지
        { const [sx1, sy1] = iso(x + w - 0.5, y + 0.35, Z); ell(g, sx1, sy1, 1.1, 0.6, '#ffffff'); ell(g, sx1, sy1, 0.7, 0.35, '#4a2a1a'); }
        { const [cx3, cy3] = iso(x + 0.35, y + d - 0.4, Z + 0.2); R2(g, cx3, cy3, 4, 0.35, '#b8bec6'); R2(g, cx3 + 0.3, cy3 + 0.6, 4, 0.35, '#b8bec6'); }
        box(g, x + w - 0.42, y + d - 0.42, Z, 0.2, 0.14, 1.6, '#ffffff', { t: '#f2f2f2' });
        break;
      }
      case 'counter': box(g, x, y + 0.1, 0, w, d - 0.2, 14, '#d9c3a0', { t: '#efe0c4' }); for (let i = 0; i < w; i++) { top(g, x + i + 0.25, y + 0.3, 14.2, 0.4, 0.4, i % 2 ? '#3a3d42' : '#b8c1ca'); } break;
      case 'stool': box(g, x + 0.32, y + 0.32, 0, 0.36, 0.36, 6, f.color || '#8a5a3c'); break;
      case 'beer': { // 카운터 위 생맥주 기계: 삿포로(은색·별) · 카스(파랑)
        box(g, x + 0.02, y + 0.1, 0, 0.96, 0.8, 14, '#d9c3a0', { t: '#efe0c4' });
        box(g, x + 0.1, y + 0.2, 14, 0.35, 0.35, 12, '#c8ccd2', { t: '#e8ebee' }); sRect(g, y + 0.55, x + 0.13, x + 0.42, 18, 24, '#1d1d1f'); { const [sx0, sy0] = iso(x + 0.27, y + 0.55, 21); R(g, sx0 - 1, sy0 - 1, 3, 3, '#f2c230'); R(g, sx0, sy0 - 2, 1, 5, '#f2c230'); }
        box(g, x + 0.55, y + 0.2, 14, 0.35, 0.35, 12, '#1d4fa3', { t: '#3a6cc4' }); sRect(g, y + 0.55, x + 0.58, x + 0.87, 18, 24, '#ffffff'); sRect(g, y + 0.55, x + 0.6, x + 0.85, 20, 22, '#1d4fa3');
        box(g, x + 0.22, y + 0.6, 14, 0.06, 0.06, 4, '#9aa3ad'); box(g, x + 0.67, y + 0.6, 14, 0.06, 0.06, 4, '#9aa3ad'); // 꼭지
        break;
      }
      case 'pendant': { // 테이블 위 조명 (천장에서 내려옴)
        const [px, py] = iso(x + w / 2, y + d / 2, 30);
        R(g, px, py - 26, 1, 22, '#3a2a22');
        g.fillStyle = f.color || '#e8862b'; g.beginPath(); g.moveTo(px - 6, py + 1); g.lineTo(px + 7, py + 1); g.lineTo(px + 3, py - 5); g.lineTo(px - 2, py - 5); g.closePath(); g.fill();
        R(g, px - 6, py + 1, 13, 1, '#b8611a'); circle(g, px + 0.5, py + 2, 1.8, '#fff1b8');
        g.fillStyle = 'rgba(255,200,110,.13)'; g.beginPath(); g.moveTo(px - 6, py + 2); g.lineTo(px + 7, py + 2); g.lineTo(px + 16, py + 26); g.lineTo(px - 15, py + 26); g.closePath(); g.fill();
        break;
      }
      case 'grilltable': box(g, x + 0.08, y + 0.1, 0, w - 0.16, d - 0.2, 9, '#5a3a22', { t: '#7a5236' }); top(g, x + w / 2 - 0.3, y + d / 2 - 0.3, 9.2, 0.6, 0.6, '#2b2b2b'); top(g, x + w / 2 - 0.2, y + d / 2 - 0.2, 9.4, 0.4, 0.4, '#ff6b3a'); break;
      case 'shelf': box(g, x + 0.05, y + 0.1, 0, w - 0.1, 0.5, 20, '#f2f2f0'); for (let r = 0; r < 3; r++) for (let i = 0; i < w * 4; i++) sRect(g, y + 0.6, x + 0.1 + i * 0.24, x + 0.28 + i * 0.24, 3 + r * 6, 7 + r * 6, ['#ff8fab', '#ffd166', '#8fd0ff', '#9be29b', '#c79bd8', '#ffffff'][(i + r) % 6]); break;
      case 'realtydesk': box(g, x + 0.1, y + 0.1, 0, w - 0.2, d - 0.2, 9, '#c8b59a'); box(g, x + 0.3, y + 0.25, 9, 0.6, 0.1, 9, '#2c3036'); sRect(g, y + 0.35, x + 0.35, x + 0.85, 10, 17, '#8fd0ff'); break;
      case 'fishtank': box(g, x + 0.05, y + 0.1, 0, w - 0.1, 0.8, 8, '#2c3e50'); box(g, x + 0.08, y + 0.15, 8, w - 0.16, 0.7, 10, '#5fb3d9', { t: '#8fd3f0', e: '#4a9cc2' }); { const [px, py] = iso(x + w / 2, y + 0.9, 12); R(g, px - 4, py, 3, 2, '#ff7b54'); R(g, px + 2, py + 3, 3, 1, '#d0d0d0'); } break;
      case 'tree': { const [px, py] = iso(x + 0.5, y + 0.5, 0); top(g, x + 0.15, y + 0.15, 0, 0.7, 0.7, '#7a5c40'); R(g, px - 1, py - 18, 3, 18, '#6b4a2e'); circle(g, px, py - 24, 10, '#3f7d3a'); circle(g, px - 5, py - 23, 6, '#4c8c44'); circle(g, px + 4, py - 28, 6, '#56a04a'); circle(g, px - 2, py - 31, 5, '#62ad54'); circle(g, px - 3, py - 33, 2, '#86cf73'); R(g, px + 5, py - 31, 1, 1, '#9ee08a'); break; }
      case 'lamp': { const [px, py] = iso(x + 0.5, y + 0.5, 0); ell(g, px, py, 4, 2, 'rgba(0,0,0,.15)'); R(g, px - 1, py - 34, 2, 34, '#6f7782'); R(g, px - 6, py - 37, 10, 3, '#4c535c'); R(g, px - 5, py - 34, 8, 1, '#fff2a8'); break; }
      // ----- 윤슬로 · 해수욕장 소품 -----
      case 'parasol': { const [px, py] = iso(x + 0.5, y + 0.5, 0); ell(g, px + 6, py + 2, 14, 5, 'rgba(120,90,40,.18)'); R(g, px - 0.5, py - 30, 1.5, 30, '#f4f1ea'); const c1 = f.color || '#ff6b6b', c2 = f.color2 || '#ffffff'; for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? c2 : c1; g.beginPath(); g.moveTo(px, py - 36); const a0 = Math.PI + (i / 6) * Math.PI, a1 = Math.PI + ((i + 1) / 6) * Math.PI; g.lineTo(px + Math.cos(a0) * 17, py - 28 + Math.sin(a0) * -2); g.lineTo(px + Math.cos(a1) * 17, py - 28 + Math.sin(a1) * -2); g.closePath(); g.fill(); } R(g, px - 17, py - 29, 34, 1, 'rgba(0,0,0,.12)'); circle(g, px, py - 36, 1.5, '#f4f1ea'); break; }
      case 'sunbed': box(g, x + 0.1, y + 0.15, 0, 0.8, d - 0.3, 3, '#e9e2d4'); box(g, x + 0.15, y + 0.2, 3, 0.7, d - 0.4, 1, f.color || '#5fb3d9', { t: f.color2 || '#8fd3f0' }); box(g, x + 0.15, y + 0.2, 4, 0.7, 0.35, 5, f.color || '#5fb3d9'); break;
      case 'lifeguard': { box(g, x + 0.2, y + 0.2, 0, 0.12, 0.12, 22, '#f4f1ea'); box(g, x + 0.7, y + 0.2, 0, 0.12, 0.12, 22, '#f4f1ea'); box(g, x + 0.2, y + 0.7, 0, 0.12, 0.12, 22, '#f4f1ea'); box(g, x + 0.7, y + 0.7, 0, 0.12, 0.12, 22, '#f4f1ea'); box(g, x + 0.1, y + 0.1, 22, 0.85, 0.85, 3, '#e8402e', { t: '#ff6b5a' }); box(g, x + 0.15, y + 0.15, 25, 0.75, 0.15, 7, '#ffffff'); const [px, py] = iso(x + 0.5, y + 0.5, 40); R(g, px - 0.5, py - 6, 1, 8, '#5b4a3a'); R(g, px, py - 6, 6, 4, '#e8402e'); break; }
      case 'bench': box(g, x + 0.15, y + 0.1, 0, 0.7, d - 0.2, 5, '#8a5a3c', { t: '#b07a52' }); box(g, x + 0.15, y + 0.1, 5, 0.12, d - 0.2, 6, '#8a5a3c'); break;
      case 'sandcastle': { box(g, x + 0.2, y + 0.2, 0, 0.6, 0.6, 5, '#e6c58c', { t: '#f2d8a6' }); box(g, x + 0.32, y + 0.32, 5, 0.36, 0.36, 5, '#e6c58c', { t: '#f2d8a6' }); const [px, py] = iso(x + 0.5, y + 0.5, 10); R(g, px, py - 7, 1, 7, '#5b4a3a'); R(g, px + 1, py - 7, 4, 3, '#ff6b81'); box(g, x + 0.75, y + 0.1, 0, 0.15, 0.15, 3, '#ff9e3a'); break; }
      case 'beachsign': { // 포토존 글자 'YUNSEUL' + 하트 프레임
        box(g, x, y + 0.35, 0, w, 0.3, 2, '#e9e2d4'); const letters = 'YUNSEUL', cols = ['#ff6b81', '#ffb347', '#ffd23a', '#7fd36b', '#5fb3d9', '#8a7ad8', '#ff8fab'];
        for (let i = 0; i < letters.length; i++) { const lx = x + 0.15 + (i * (w - 0.3)) / letters.length; box(g, lx, y + 0.4, 2, (w - 0.3) / letters.length - 0.06, 0.2, 12, cols[i], { t: shade(cols[i], 0.3) }); const [px, py] = iso(lx + 0.2, y + 0.6, 8); g.fillStyle = '#fff'; g.font = 'bold 7px sans-serif'; g.textAlign = 'center'; g.fillText(letters[i], px, py); }
        break; }
      case 'railsign': { const [px, py] = iso(x + 0.5, y + 0.5, 0); R(g, px - 0.5, py - 26, 1.5, 26, '#f4f1ea'); for (const k of [-1, 1]) { g.save(); g.translate(px, py - 24); g.rotate(k * 0.7); R(g, -8, -1.2, 16, 2.4, '#e8402e'); R(g, -8, -0.4, 16, 0.8, '#ffffff'); g.restore(); } circle(g, px - 3, py - 17, 1.6, (Math.floor((t || performance.now() / 1000) * 2) % 2) && TRAIN.near ? '#ff3a2a' : '#5a2a22'); circle(g, px + 3, py - 17, 1.6, !(Math.floor((t || performance.now() / 1000) * 2) % 2) && TRAIN.near ? '#ff3a2a' : '#5a2a22'); break; }
      case 'buoy': { const [px, py] = iso(x + 0.5, y + 0.5, 0); circle(g, px, py - 3, 3, '#ff9e3a'); R(g, px - 3, py - 4, 6, 1, '#ffffff'); break; }
      case 'pallet': box(g, x + 0.08, y + 0.08, 0, 0.84, 0.84, 3, '#c79a63'); box(g, x + 0.15, y + 0.15, 3, 0.7, 0.7, 8, '#d8c6a4', { e: '#b9a47e' }); break;
      case 'cone': box(g, x + 0.3, y + 0.3, 0, 0.4, 0.4, 2, '#333'); box(g, x + 0.4, y + 0.4, 2, 0.2, 0.2, 9, '#f06a2a'); box(g, x + 0.4, y + 0.4, 5, 0.2, 0.2, 2, '#ffffff'); break;
      case 'banner': box(g, x + 0.35, y + 0.35, 0, 0.1, 0.35, 16, f.color || '#c0392b', { e: f.color2 || '#ffcc2e' }); break;
      // ----- 마트 진열대 -----
      case 'coolcase': { // 냉장 쇼케이스: 흰 몸통 + 유리 + 칸마다 상품
        const look = SECTION_LOOK[f.sec] || ['#5fae4e', '#f2c94c', '#e8343a'];
        box(g, x + 0.05, y + 0.1, 0, w - 0.1, 0.8, 6, '#e9eef2', { t: '#ffffff' });
        box(g, x + 0.05, y + 0.05, 6, w - 0.1, 0.35, 22, '#f4f7f9', { t: '#ffffff' });
        sRect(g, y + 0.4, x + 0.1, x + w - 0.1, 7, 27, '#cfe8f2');
        for (let r = 0; r < 4; r++) {
          sRect(g, y + 0.4, x + 0.1, x + w - 0.1, 7 + r * 5, 7.6 + r * 5, '#b7c4cc');
          for (let i = 0; i < w * 6; i++) { const c = look[(i + r) % look.length]; const x0 = x + 0.14 + i * (w - 0.28) / (w * 6); sRect(g, y + 0.4, x0, x0 + 0.11, 7.6 + r * 5, 7.6 + r * 5 + 2.6 + ((i * 7 + r) % 3) * 0.5, c); }
        }
        sRect(g, y + 0.4, x + 0.1, x + w - 0.1, 27, 28.5, '#13a89e'); g.globalAlpha = 0.18; sRect(g, y + 0.4, x + 0.1, x + 0.4, 8, 26, '#ffffff'); g.globalAlpha = 1;
        top(g, x + 0.1, y + 0.45, 6.1, w - 0.2, 0.4, 'rgba(160,215,235,.6)');
        for (let i = 0; i < w * 4; i++) top(g, x + 0.15 + i * (w - 0.3) / (w * 4), y + 0.5 + (i % 2) * 0.15, 6.3, 0.16, 0.12, look[i % look.length]);
        break;
      }
      case 'produce': { // 채소·과일 경사 진열대: 나무 상자에 알록달록
        const look = SECTION_LOOK[f.sec] || ['#5fae4e', '#e8343a', '#f2c94c', '#f08a2b'];
        box(g, x + 0.05, y + 0.05, 0, w - 0.1, d - 0.1, 8, '#b98552', { t: '#d4a06a' });
        const rr = rnd(x * 13 + y * 7 + 1);
        for (let i = 0; i < w * 2; i++) for (let j = 0; j < d * 2; j++) {
          const bx = x + 0.1 + i * (w - 0.2) / (w * 2), by = y + 0.1 + j * (d - 0.2) / (d * 2), bw = (w - 0.2) / (w * 2) - 0.04, bd = (d - 0.2) / (d * 2) - 0.04;
          top(g, bx, by, 8.2, bw, bd, '#8a5a34'); const c = look[(i * 3 + j) % look.length];
          for (let k = 0; k < 5; k++) { const [px, py] = iso(bx + 0.06 + rr() * (bw - 0.12), by + 0.06 + rr() * (bd - 0.12), 9.2); circle(g, px, py, 1.3 + rr() * 0.5, c); R(g, px - 0.6, py - 0.9, 0.6, 0.5, 'rgba(255,255,255,.55)'); }
        }
        for (let i = 0; i < w; i++) { const [px, py] = iso(x + i + 0.5, y + d, 5); R(g, px - 3, py - 1, 6, 3, '#ffd23a'); R(g, px - 2, py, 4, 1, '#c0392b'); } // 가격표
        break;
      }
      case 'gondola': { // 양면 선반: 상자·병·봉지
        const look = SECTION_LOOK[f.sec] || ['#d9822b', '#f2e6c9', '#c0392b'];
        box(g, x + 0.05, y + 0.15, 0, w - 0.1, 0.7, 20, '#e4eaee', { t: '#f6f8fa' });
        for (let r = 0; r < 4; r++) {
          sRect(g, y + 0.85, x + 0.08, x + w - 0.08, 1 + r * 5, 1.5 + r * 5, '#9aa7b0');
          for (let i = 0; i < w * 5; i++) { const x0 = x + 0.12 + i * (w - 0.24) / (w * 5), hh = 2.6 + ((i * 5 + r * 3) % 4) * 0.4; sRect(g, y + 0.85, x0, x0 + 0.15, 1.5 + r * 5, 1.5 + r * 5 + hh, look[(i + r * 2) % look.length]); sRect(g, y + 0.85, x0 + 0.03, x0 + 0.07, 2 + r * 5, 2 + r * 5 + hh - 1, 'rgba(255,255,255,.35)'); }
        }
        break;
      }
      case 'checkout': { // 계산대: 컨베이어 + 포스기 + 봉투
        box(g, x + 0.05, y + 0.1, 0, w - 0.1, 0.8, 11, '#0b7ac2', { t: '#e9eef2' });
        top(g, x + 0.2, y + 0.25, 11.2, w - 1.2, 0.5, '#3a3d42'); for (let i = 0; i < 8; i++) top(g, x + 0.25 + i * 0.22, y + 0.25, 11.3, 0.03, 0.5, '#55595f');
        box(g, x + w - 0.8, y + 0.25, 11, 0.5, 0.4, 4, '#2c3036'); box(g, x + w - 0.75, y + 0.2, 15, 0.4, 0.08, 6, '#24272d'); sRect(g, y + 0.28, x + w - 0.72, x + w - 0.38, 16, 20, '#7fe0c6');
        box(g, x + 0.3, y + 0.3, 11.3, 0.3, 0.25, 4, '#f2c94c'); box(g, x + 0.7, y + 0.35, 11.3, 0.2, 0.2, 3, '#e8343a');
        break;
      }
      case 'carts': for (let i = 0; i < 3; i++) { box(g, x + 0.1 + i * 0.08, y + 0.15, 3, 0.7, 0.7, 6, 'rgba(160,170,180,.55)', { t: 'rgba(200,210,220,.4)', noEdge: true }); } box(g, x + 0.1, y + 0.15, 0, 0.7, 0.7, 0.8, '#5a5f6a'); break;
      // ----- 거리 소품 -----
      case 'bike': { // 공유 자전거 (옆모습, 앞뒤로 y 방향)
        const c = f.color || '#f2c230', W2 = (gx, gy, gz) => iso(x + gx, y + gy, gz);
        g.strokeStyle = '#2b2b30'; g.lineWidth = 0.7;
        for (const wy of [0.2, 0.8]) { const [cx, cy] = W2(0.5, wy, 3.2); g.beginPath(); g.ellipse(cx, cy, 2.2, 3.2, -0.45, 0, 7); g.stroke(); R2(g, cx - 0.3, cy - 0.3, 0.6, 0.6, '#9aa3ad'); }
        g.strokeStyle = c; g.lineWidth = 0.9; g.beginPath(); const a = W2(0.5, 0.2, 3.2), b2 = W2(0.5, 0.5, 4.2), c2 = W2(0.5, 0.8, 3.2), d2 = W2(0.5, 0.45, 7.5), e2 = W2(0.5, 0.75, 8);
        g.moveTo(a[0], a[1]); g.lineTo(b2[0], b2[1]); g.lineTo(c2[0], c2[1]); g.moveTo(b2[0], b2[1]); g.lineTo(d2[0], d2[1]); g.moveTo(c2[0], c2[1]); g.lineTo(e2[0], e2[1]); g.stroke();
        R2(g, d2[0] - 1.4, d2[1] - 0.6, 2.4, 0.9, '#2b2b30'); R2(g, e2[0] - 1.5, e2[1] - 0.4, 3, 0.7, '#2b2b30');
        box(g, x + 0.38, y + 0.82, 6.5, 0.24, 0.22, 2.4, c, { t: shade(c, 0.25) }); // 앞 바구니
        break;
      }
      case 'bins': for (const [bx, c, c2] of [[0.08, '#2f5fb3', '#3f74cc'], [0.52, '#2e9e5b', '#3cb96b']]) { box(g, x + bx, y + 0.2, 0, 0.4, 0.6, 9, c, { t: '#2b2f38' }); sRect(g, y + 0.8, x + bx + 0.1, x + bx + 0.3, 3, 6.5, c2); sRect(g, y + 0.8, x + bx + 0.17, x + bx + 0.23, 3.5, 6, '#ffffff'); } break;
      case 'scooter': box(g, x + 0.3, y + 0.1, 0, 0.4, 0.8, 1.5, '#2b2b30'); box(g, x + 0.3, y + 0.45, 1.5, 0.4, 0.45, 5, '#9fb6c4', { t: '#c4d3dc' }); box(g, x + 0.32, y + 0.5, 6.5, 0.36, 0.35, 1.2, '#2b2b30'); box(g, x + 0.35, y + 0.12, 1.5, 0.3, 0.12, 9, '#9fb6c4'); box(g, x + 0.2, y + 0.12, 10.5, 0.6, 0.08, 0.6, '#2b2b30'); break;
      case 'moto': { // 노란 오토바이 (세워 둔 모습) + 노란 헬멧 걸어 둠
        const [px, py] = iso(x + 0.5, y + 0.5, 0);
        ell(g, px, py + 1, 11, 3, 'rgba(0,0,0,.18)'); drawMoto(g, px, py, 1, f.color);
        ell(g, px + 7, py - 15, 3.2, 2.6, '#ffd21f'); R2(g, px + 4.4, py - 14.6, 5.2, 1, '#2b2b30');
        break;
      }
      case 'pole': { // 전봇대 + 변압기 + 전선
        box(g, x + 0.4, y + 0.4, 0, 0.2, 0.2, 62, '#9a958c', { t: '#b5b0a6' });
        for (let k = 0; k < 6; k++) sRect(g, y + 0.6, x + 0.4, x + 0.6, 6 + k * 3, 7.5 + k * 3, k % 2 ? '#e8e3d6' : '#e8343a'); // 빨강·흰 띠
        box(g, x - 0.2, y + 0.45, 54, 1.4, 0.1, 1, '#6b665e'); box(g, x + 0.62, y + 0.3, 44, 0.3, 0.3, 6, '#7d8790', { t: '#9aa3ad' });
        g.strokeStyle = 'rgba(40,40,45,.75)'; g.lineWidth = 0.4;
        for (const [ox, sag] of [[-0.2, 6], [1.2, 9], [0.5, 12]]) { const a = iso(x + ox, y + 0.5, 54.5), b2 = iso(x + ox, y - 6, 54.5), c2 = iso(x + ox, y + 7, 54.5); g.beginPath(); g.moveTo(b2[0], b2[1]); g.quadraticCurveTo((a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2 + sag, a[0], a[1]); g.quadraticCurveTo((a[0] + c2[0]) / 2, (a[1] + c2[1]) / 2 + sag, c2[0], c2[1]); g.stroke(); }
        break;
      }
      case 'cat': { // 웅크린 길고양이 (꼬리 살랑)
        const [px, py] = iso(x + 0.5, y + 0.5, 0), tt = performance.now() / 1000;
        ell(g, px, py + 0.5, 4, 1.6, 'rgba(0,0,0,.15)'); ell(g, px, py - 2, 4, 2.6, '#f0a24a'); R2(g, px - 2, py - 3.6, 1, 2.4, '#d9822b'); R2(g, px + 0.2, py - 4, 1, 2.6, '#d9822b');
        circle(g, px - 3.4, py - 3.6, 2.2, '#f0a24a'); poly(g, [[px - 5.2, py - 4.6], [px - 4.8, py - 7], [px - 3.6, py - 5.2]], '#f0a24a'); poly(g, [[px - 3.2, py - 5.4], [px - 2.4, py - 7.2], [px - 1.8, py - 5]], '#f0a24a');
        const awake = f.meow > performance.now();
        if (awake) { R2(g, px - 4.3, py - 4.2, 0.7, 0.8, '#3a2a22'); R2(g, px - 2.8, py - 4.2, 0.7, 0.8, '#3a2a22'); } else { R2(g, px - 4.4, py - 3.8, 0.9, 0.3, '#3a2a22'); R2(g, px - 2.9, py - 3.8, 0.9, 0.3, '#3a2a22'); } R2(g, px - 3.6, py - 3, 0.6, 0.4, '#ff8fab');
        g.strokeStyle = '#d9822b'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 3.5, py - 1.5); g.quadraticCurveTo(px + 6, py - 2 + Math.sin(tt * 2) * 1.5, px + 5, py - 5 + Math.sin(tt * 2)); g.stroke();
        if (!awake && Math.floor(tt) % 6 < 3) { g.fillStyle = '#7a8cff'; g.font = '4px sans-serif'; g.fillText('z', px - 1, py - 8 - (tt % 1) * 2); }
        break;
      }
      case 'monstera': { // 큰 몬스테라 화분
        box(g, x + 0.28, y + 0.28, 0, 0.44, 0.44, 8, '#f4f4f0', { t: '#e2e2de' });
        const [px, py] = iso(x + 0.5, y + 0.5, 8), tt = performance.now() / 1000;
        for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.45, len = 9 + (i % 3) * 2, sw = Math.sin(tt * 0.8 + i) * 0.4; const lx = px + Math.cos(a) * len * 0.7 + sw, ly = py + Math.sin(a) * len - 2;
          g.strokeStyle = '#3f7d3a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(px, py); g.lineTo(lx, ly); g.stroke(); ell(g, lx, ly, 3.6, 2.4, i % 2 ? '#3f8f45' : '#4fa055'); R2(g, lx - 1.2, ly - 0.2, 0.8, 0.5, '#2e6b33'); R2(g, lx + 0.6, ly + 0.4, 0.8, 0.5, '#2e6b33'); R2(g, lx - 0.3, ly - 1.4, 0.4, 2.6, '#6fbf6f'); }
        break;
      }
      case 'drinkfridge': { // 유리문 음료 냉장고: 소주 · 맥주 · 콜라
        box(g, x + 0.08, y + 0.1, 0, 0.84, 0.8, 27, '#d8dde2', { t: '#eef1f4' });
        sRect(g, y + 0.9, x + 0.14, x + 0.86, 2, 25, '#2a3a44'); top(g, x + 0.08, y + 0.85, 25.5, 0.84, 0.05, '#7fd3ff');
        for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) { const c = ['#3aa55a', '#3aa55a', '#c9a227', '#e8343a', '#3aa55a'][(i + r) % 5]; sRect(g, y + 0.9, x + 0.18 + i * 0.13, x + 0.27 + i * 0.13, 3 + r * 5.6, 7.5 + r * 5.6, c); sRect(g, y + 0.9, x + 0.2 + i * 0.13, x + 0.23 + i * 0.13, 4 + r * 5.6, 7 + r * 5.6, 'rgba(255,255,255,.35)'); }
        g.globalAlpha = 0.2; sRect(g, y + 0.9, x + 0.14, x + 0.3, 2, 25, '#ffffff'); g.globalAlpha = 1;
        sRect(g, y + 0.9, x + 0.14, x + 0.86, 25, 27, '#e8343a');
        break;
      }
      case 'crates': for (let k = 0; k < 3; k++) { box(g, x + 0.12, y + 0.12, k * 4.6, 0.76, 0.76, 4.4, k === 2 ? '#e8e3d6' : '#2e9e5b', { t: k === 2 ? '#f4f0e6' : '#3cb96b' }); if (k < 2) for (let i = 0; i < 4; i++) sRect(g, y + 0.88, x + 0.18 + i * 0.18, x + 0.28 + i * 0.18, k * 4.6 + 1, k * 4.6 + 3.6, '#1f7a44'); } break;
      case 'umbrella': box(g, x + 0.3, y + 0.3, 0, 0.4, 0.4, 7, '#3a3d42', { t: '#4a4f58' }); for (const [ux, c] of [[0.38, '#e8343a'], [0.5, '#2f6fb3'], [0.6, '#f2c230']]) { const [px, py] = iso(x + ux, y + 0.5, 7); R2(g, px - 0.4, py - 8, 0.8, 8, c); R2(g, px - 1.2, py - 9, 1.6, 1.2, '#3a2a22'); } break;
      case 'floorlamp': { // 스탠드 조명 (켜면 밤에 집이 밝아짐)
        const on = townSt.lights, [px, py] = iso(x + 0.5, y + 0.5, 0);
        ell(g, px, py, 4, 2, 'rgba(0,0,0,.15)'); box(g, x + 0.35, y + 0.35, 0, 0.3, 0.3, 1.5, '#3a3d42');
        R(g, px - 0.5, py - 27, 1, 26, '#4a4f58');
        g.fillStyle = on ? '#fff3c4' : '#efe6d2'; g.beginPath(); g.moveTo(px - 5, py - 26); g.lineTo(px + 5, py - 26); g.lineTo(px + 3, py - 33); g.lineTo(px - 3, py - 33); g.closePath(); g.fill();
        g.fillStyle = on ? '#e8c26a' : '#c9bda4'; g.fillRect(px - 5, py - 26.5, 10, 1);
        if (on) { g.fillStyle = 'rgba(255,230,150,.18)'; g.beginPath(); g.moveTo(px - 5, py - 26); g.lineTo(px + 5, py - 26); g.lineTo(px + 12, py - 2); g.lineTo(px - 12, py - 2); g.closePath(); g.fill(); }
        break;
      }
      case 'speaker': { // 블루투스 스피커 (탁자 위) — 켜면 LED 가 반짝
        const on = Boolean(TOWN_MUSIC.current), z = 9.7, tt = performance.now() / 1000;
        box(g, x + 0.3, y + 0.32, z, 0.4, 0.36, 7, '#3a3d46', { t: '#4c515c', e: '#2c2f36' });
        sRect(g, y + 0.68, x + 0.34, x + 0.66, z + 1, z + 6, '#2a2c32');
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) sRect(g, y + 0.681, x + 0.38 + i * 0.09, x + 0.43 + i * 0.09, z + 2 + j * 2, z + 3 + j * 2, '#5a5f6a');
        top(g, x + 0.45, y + 0.42, z + 7.05, 0.1, 0.1, on ? (Math.floor(tt * 2) % 2 ? '#7cf0a8' : '#5ad6ff') : '#8a8f98');
        break;
      }
      case 'moodlamp': { // 무드등: 작은 협탁 + 둥근 버섯 램프 (누를 때마다 색이 바뀜)
        const md = (townSt.lamps || {})[f.id] || 0, col = LAMP_COL[md], [px, py] = iso(x + 0.5, y + 0.5, 0), tt = performance.now() / 1000;
        box(g, x + 0.22, y + 0.22, 0, 0.56, 0.56, 7, '#c89a6a', { t: '#e0b888' }); sRect(g, y + 0.78, x + 0.3, x + 0.7, 3.5, 4.2, '#a87a4a');
        R2(g, px - 0.5, py - 12, 1, 5, '#8a7a6a');
        if (md) { const gl = 0.25 + 0.08 * Math.sin(tt * 2); g.fillStyle = `rgba(${col[1]},${gl})`; g.beginPath(); g.arc(px, py - 13, 9, 0, 7); g.fill(); }
        ell(g, px, py - 13.5, 4.2, 3.4, md ? col[2] : col[2]); ell(g, px - 1.2, py - 15, 1.3, 1, 'rgba(255,255,255,.55)'); R2(g, px - 4.2, py - 13.5, 8.4, 1.2, md ? shade(col[2], -0.15) : '#bfb8ac');
        if (md) for (let i = 0; i < 3; i++) { const a = tt * 1.5 + i * 2.1; R2(g, px + Math.cos(a) * 7, py - 16 + Math.sin(a) * 3, 0.8, 0.8, `rgba(${col[1]},.8)`); }
        break;
      }
      case 'pethouse': { // 소파 옆 펫 집: 분홍 지붕 나무집 + 방석
        box(g, x + 0.12, y + 0.12, 0, 0.76, 0.76, 9, '#e9c99e', { t: '#f3dcb8' });
        poly(g, [iso(x + 0.05, y + 0.88, 9), iso(x + 0.95, y + 0.88, 9), iso(x + 0.95, y + 0.5, 16)], '#ff9eb5');
        poly(g, [iso(x + 0.95, y + 0.05, 9), iso(x + 0.95, y + 0.95, 9), iso(x + 0.95, y + 0.5, 16)], '#e8829b');
        sRect(g, y + 0.88, x + 0.3, x + 0.7, 0, 6, '#6b4a35'); sRect(g, y + 0.88, x + 0.35, x + 0.65, 0, 5.5, '#3a2a22');
        top(g, x + 0.2, y + 0.9, 0.3, 0.6, 0.35, '#ffd1dc'); // 방석
        { const [hx, hy] = iso(x + 0.5, y + 0.88, 12); g.fillStyle = '#ff6b81'; g.fillRect(hx - 1, hy, 1, 1); g.fillRect(hx + 1, hy, 1, 1); g.fillRect(hx - 1, hy + 1, 3, 1); g.fillRect(hx, hy + 2, 1, 1); }
        break;
      }
      case 'car': box(g, x + 0.1, y + 0.05, 0, 0.8, d - 0.1, 7, '#1f2126'); box(g, x + 0.2, y + 0.5, 7, 0.6, d - 1.1, 6, '#2c2f36', { s: '#7d93a8', e: '#5d7388' }); break;
    }
  }
  function drawBlanket(g, f) {
    if (f.rot && !ROT) { ROT = { f, r: f.rot, W0: f.w0, D0: f.h0 }; try { drawBlanket(g, { ...f, w: f.w0, h: f.h0 }); } finally { ROT = null; } return; }
    const { x, y, w, h: d } = f;
    box(g, x + 0.1, y + 1.05, 6, w - 0.2, d - 1.15, 6, '#24345e', { t: '#2f4374', edge: '#4a5f94' }); // 남색 이불
    for (let i = 0; i < 3; i++) top(g, x + 0.1, y + 1.55 + i * 0.45, 12.1, w - 0.2, 0.04, '#1f2c50');
    // 누운 사람: 이불 아래 몸통이 불룩 + 끝에 발 뻗은 자국
    for (const lx of f.sleepers || []) {
      const breathe = Math.sin(performance.now() / 700 + lx * 3) * 0.6;
      box(g, x + lx - 0.36, y + 1.08, 12, 0.72, d - 1.62, 3 + breathe, '#2b3d6b', { t: '#33497d', edge: '#4a5f94' }); // 몸통
      box(g, x + lx - 0.3, y + d - 0.62, 12, 0.24, 0.32, 4.5, '#2b3d6b', { t: '#3a5088', edge: '#5a6fa6' }); // 왼발
      box(g, x + lx + 0.06, y + d - 0.6, 12, 0.24, 0.32, 4.2, '#2b3d6b', { t: '#3a5088', edge: '#5a6fa6' }); // 오른발
    }
    top(g, x + 0.1, y + 1.05, 12.1 + (f.sleepers?.length ? 2.5 : 0), w - 0.2, 0.18, '#f2f3f6'); // 위로 접힌 흰 시트
  }
  let tvOn = false;
  function drawTvFace(g, f, t) {
    const x = f.x + 0.37, y0 = f.y + 0.35, y1 = f.y + f.h - 0.35;
    if (!tvOn) { eRect(g, x, y0 + 0.05, y1 - 0.05, 10, 25, '#3c4a5a'); return; }
    const cols = ['#8fd0ff', '#ffd166', '#ff8fab', '#9be29b', '#c79bd8'];
    const n = 5;
    for (let i = 0; i < n; i++) eRect(g, x, y0 + 0.05 + ((y1 - y0 - 0.1) / n) * i, y0 + 0.05 + ((y1 - y0 - 0.1) / n) * (i + 1), 10, 25, cols[(Math.floor((t || 0) * 4) + i) % cols.length]);
  }

  // =====================================================================
  // 장면
  // =====================================================================
  const scenes = {};
  function makeScene(def) {
    const s = { objects: [], labels: [], npcs: [], lights: [], dyn: [], ...def };
    s.blocked = new Set();
    s.objects.forEach((o) => { if (o.solid !== false) for (let i = 0; i < (o.w || 1); i++) for (let j = 0; j < (o.h || 1); j++) s.blocked.add(`${o.x + i},${o.y + j}`); });
    const pad = 48;
    s.ox = s.h * 16 + pad; s.oy = WH + 60;
    s.pw = (s.w + s.h) * 16 + pad * 2; s.ph = (s.w + s.h) * 8 + WH + 120;
    s.res = s.res || (s.key === 'street' || s.key === 'yunseul' || s.key === 'beach' ? 2 : 3); // 고화질: 한 픽셀을 2~3칸으로 쪼개 그림
    s.canvas = newCanvas(s.pw * s.res, s.ph * s.res);
    OX = s.ox; OY = s.oy;
    const sg = s.canvas.getContext('2d'); sg.scale(s.res, s.res); sg.imageSmoothingEnabled = false;
    s.paint(sg, s);
    return s;
  }
  const walkable = (s, x, y) => x >= 0 && y >= 0 && x < s.w && y < s.h && s.isFloor(x, y) && !s.blocked.has(`${x},${y}`)
    && !s.objects.some((o) => o.dynamicBlock && o.dynamicBlock() && x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1));

  // ----- 1) 물결로 사거리 -----
  const SHOPS = {
    jumak: { name: '달빛주막', sub: '고추튀김 맛있는 한식주점', right: ['비 오는 날엔 전', '윤슬점'], sign: '#ffcc2e', ink: '#6b3a10', wall: '#e9dcc6', glow: true, say: '우리 단골 달빛주막! 고추튀김에 막걸리 한 잔 할까?' },
    starre: { name: '별빛 부동산', sub: '공인중개사', sign: '#e2463c', ink: '#fff', wall: '#ece3d4', say: '오피스텔 바로 옆 부동산. 유리창에 매물 전단이 가득!' },
    starlight: { name: 'STARLIGHT', sub: '별빛 아침 오피스텔', sign: '#3a3f46', ink: '#f3efe6', wall: '#e6dccb', say: '우리 오피스텔!' },
    sunny: { name: '햇살부동산', sub: '오피스텔 · 상가 · 분양', sign: '#e8336d', ink: '#fff', wall: '#9aa7b3', say: '분홍 간판이 반짝이는 부동산이에요.' },
    peach: { name: '복사꽃', sub: '한우로스구이', right: ['1++ 한우 12,000원'], sign: '#2a2a2a', ink: '#f6efe0', wall: '#efe7d6', say: '한우로스구이 도화. 테이블마다 숯불이 지글지글!' },
    tuna: { name: '바다참치', sub: '활어 · 참치 · 연어 · 스시', sign: '#2f5fb3', ink: '#fff', wall: '#a3abb4', say: '수조에 물고기가 헤엄쳐요. 참치 먹고 싶은 날은 여기!' },
    hanwoo: { name: '한우마을', sub: '퓨전 한식 주점', sign: '#1f5a35', ink: '#e9c766', wall: '#8a5a3c', glow: true, say: '퓨전 한식 술집 미광! 오늘은 하이볼에 퓨전 안주 어때? 🍶' },
    straw: { name: '볏짚', sub: '짚풀 지붕 술집', sign: '#f2e6c9', ink: '#5a3a22', wall: '#f4efe6', say: '짚풀 지붕이 포근한 고짚! 막걸리 한 사발?' },
    freshmart: { name: 'FRESH MART', sub: '프레시 마트', sign: '#0b7ac2', ink: '#fff', wall: '#eef7f4', say: '' },
    olive: { name: '올리브샵', sub: '', sign: '#9bc53d', ink: '#fff', wall: '#f2f5f7', say: '사거리 건너 올리브샵. 화장품이 알록달록!' },
    parang: { name: '파랑 오션오피스텔', sub: '', sign: '#5c7a99', ink: '#fff', wall: '#cfd8e0', say: '높은 유리 오피스텔이에요.' },
  };
  function streetScene() {
    const W = 20, H = 56, ROAD0 = 7, ROAD1 = 12;
    const ROAD = (x, y) => (x >= ROAD0 && x <= ROAD1) || (y >= 10 && y <= 15);
    const BUILD = (x, y) => (x <= 4 || x >= 15) && !(y >= 9 && y <= 16);
    // 가게(단면) · 타워
    const B = [
      { id: 'olive', kind: 'cut', x: 0, y: 0, w: 5, h: 4, side: 'left', floor: 'tile', wall: '#f2f5f7', door: 2, items: [['shelf', 1, 1, 3, 1], ['counter', 3, 3, 1, 1]], people: [['c6', 2.5, 2.5, 'left']] },
      { id: 'freshmart', kind: 'cut', x: 0, y: 4, w: 5, h: 5, side: 'left', floor: 'tile', wall: '#eef7f4', door: 2, items: [['produce', 1, 1, 2, 1], ['produce', 1, 3, 2, 1], ['shelf', 3, 1, 1, 1]], people: [['c2', 3.5, 3.5, 'up']] },
      { id: 'parang', kind: 'tower', x: 15, y: 0, w: 5, h: 9, roof: '#b9c8d6', wall: '#a9b9c8', glass: '#7fa7c9' },
      { id: 'sunny', kind: 'cut', x: 0, y: 17, w: 5, h: 6, side: 'left', floor: 'stone', wall: '#9aa7b3', door: 3, items: [['realtydesk', 1, 1, 2, 1], ['realtydesk', 1, 3, 2, 1], ['plant', 3, 1, 1, 1]], people: [['c5', 1.5, 2.4, 'up']] },
      { id: 'peach', kind: 'cut', x: 0, y: 23, w: 5, h: 6, side: 'left', floor: 'dark', wall: '#efe7d6', door: 3, items: [['grilltable', 1, 1, 2, 1], ['grilltable', 1, 3, 2, 1], ['grilltable', 1, 5, 2, 1]], people: [['c3', 1.5, 0.6, 'down'], ['c2', 2.3, 2.6, 'down'], ['c4', 1.5, 4.6, 'down']] },
      { id: 'tuna', kind: 'cut', x: 0, y: 29, w: 5, h: 6, side: 'left', floor: 'tile', wall: '#a3abb4', door: 4, items: [['counter', 1, 1, 3, 1], ['fishtank', 1, 4, 2, 1]], people: [['c1', 1.5, 2.3, 'up'], ['c4', 2.5, 2.3, 'up']] },
      { id: 'hanwoo', kind: 'cut', x: 0, y: 35, w: 5, h: 5, side: 'left', floor: 'wood', wall: '#a87452', door: 2, items: [['pubtable', 1, 1, 2, 1], ['pubtable', 1, 3, 2, 1], ['plant', 3, 3, 1, 1]], people: [['c5', 1.5, 0.6, 'down']] },
      { id: 'straw', kind: 'cut', x: 0, y: 40, w: 5, h: 6, side: 'left', floor: 'wood', wall: '#f4efe6', door: 3, items: [['pubtable', 1, 1, 2, 1], ['pubtable', 1, 4, 2, 1]], people: [['c6', 1.5, 0.6, 'down'], ['c3', 2.5, 3.6, 'down']] },
      { id: 'jumak', kind: 'cut', x: 15, y: 17, w: 5, h: 6, side: 'right', floor: 'dark', wall: '#e9dcc6', door: 3, glow: true, items: [['counter', 3, 1, 1, 3], ['pubtable', 1, 1, 2, 1], ['pubtable', 1, 4, 2, 1]], people: [['c1', 1.5, 0.6, 'down'], ['c2', 2.5, 2.4, 'up'], ['c4', 1.5, 3.6, 'down'], ['c5', 2.3, 5.4, 'up']] },
      { id: 'starre', kind: 'cut', x: 15, y: 23, w: 5, h: 4, side: 'right', floor: 'stone', wall: '#ece3d4', door: 2, items: [['realtydesk', 2, 1, 2, 1]], people: [['c3', 2.5, 2.4, 'up']] },
      { id: 'starlight', kind: 'tower', x: 15, y: 27, w: 5, h: 12, roof: '#e3d9c7', wall: '#e6dccb', glass: '#55707f', entrance: 4 },
      { id: 'starlight2', kind: 'tower', x: 15, y: 39, w: 5, h: 17, roof: '#e3d9c7', wall: '#e6dccb', glass: '#9fb6c4' },
    ];
    const objects = [], dyn = [], lights = [], labels = [], people = [];
    B.forEach((b) => {
      const ax = b.side === 'left' ? 5 : 14;
      const ay = b.id === 'starlight' ? 31 : b.y + (b.door ?? 2);
      const act = b.id === 'starlight' ? askEnterBuilding : b.id === 'jumak' ? () => goScene('jumak') : b.id === 'freshmart' ? () => goScene('mart') : b.id === 'starlight2' ? null : () => openShop(SHOPS[b.id]);
      objects.push({ x: b.x, y: b.y, w: b.w, h: b.h, approach: [ax, ay], face: b.side === 'left' ? 'left' : 'right', interact: act, hitH: b.kind === 'tower' ? 60 : WH });
      if (b.kind === 'tower') dyn.push({ kind: 'tower', b, x: b.x, y: b.y, w: b.w, h: b.h });
      else lights.push({ gx: b.x + b.w / 2, gy: b.y + b.h / 2, r: 70, c: b.id === 'jumak' ? '255,205,110' : '255,230,170', a: 0.6 });
    });
    // 거리 장식 (나무·가로등은 사람과 겹치므로 매 프레임 그림)
    const D = (kind, x, y, extra = {}) => { const o = { kind, x, y, w: 1, h: 1, ...extra }; dyn.push(o); objects.push({ x, y, w: 1, h: 1 }); return o; };
    [[13, 21], [13, 30], [13, 42], [13, 51], [6, 20], [6, 33], [6, 44], [6, 3], [13, 4]].forEach(([x, y]) => D('tree', x, y));
    [[13, 26], [13, 47], [6, 27], [6, 50]].forEach(([x, y]) => { D('lamp', x, y); lights.push({ gx: x + 0.5, gy: y + 0.5, z: 34, r: 60, c: '255,236,170', a: 1 }); });
    D('pallet', 14, 36); D('pallet', 14, 37); D('cone', 14, 38);
    D('banner', 14, 21, { color: '#c0392b', color2: '#ffcc2e' }); D('banner', 14, 22, { color: '#1f1f1f', color2: '#ff7043' });
    D('banner', 5, 18, { color: '#e8336d', color2: '#ffd1dc' }); D('banner', 5, 24, { color: '#f2c230', color2: '#e74c3c' });
    D('fishtank', 5, 30); D('plant', 5, 36); D('plant', 5, 37);
    dyn.push({ kind: 'car', x: 1, y: 49, w: 1, h: 3 }); objects.push({ x: 1, y: 49, w: 1, h: 3 });
    // 골목 소품: 공유 자전거 · 분리수거함 · 스쿠터 · 전봇대 · 길고양이
    const P = (kind, x, y, extra, act, ap) => { const o = D(kind, x, y, { id: `${kind}${x}_${y}`, ...extra }); Object.assign(objects[objects.length - 1], { id: o.id, interact: act, approach: ap, hitH: kind === 'moto' ? 14 : 12 }); return o; };
    const bike0 = P('bike', 6, 38, { color: '#f2c230', ride: 'b0' }, () => mountAsk(bike0), [7, 38]);
    const bike1 = P('bike', 6, 39, { color: '#7fd3c6', ride: 'b1' }, () => mountAsk(bike1), [7, 39]);
    const moto = P('moto', 13, 49, { color: '#ffd21f', ride: 'm' }, () => mountAsk(moto), [12, 49]);
    const cat = P('cat', 6, 41, {}, () => meow(cat), [7, 41]);
    D('bins', 6, 46); D('bins', 13, 34); D('scooter', 13, 44);
    D('pole', 6, 23); D('pole', 13, 40); D('pole', 6, 52);
    for (const [x, y] of [[14, 18], [14, 19]]) dyn.push({ kind: 'stool', x, y, w: 1, h: 1, color: '#f4f4f0' });

    const scene = makeScene({
      key: 'street', title: '물결로 사거리', w: W, h: H, viewW: 280, spawn: [14, 50, 'up'],
      isFloor: (x, y) => !BUILD(x, y), objects, dyn, lights,
      npcs: [{ id: 'chaehee', spr: 'chaehee', name: '김바다', x: 14 * T + 8, y: 20 * T + 8, face: 'left', smoke: true,
        lines: ['후~ 오늘 장사 잘 되네.', '들어가서 고추튀김 먹어봐. 끝내줘!', '달빛주막 단골이지? 얼굴 익숙한데~', '비 오는 날엔 여기 막걸리지.', '담배 한 대 하고 들어가야지.', '둘이 보기 좋네 허허.'] }],
      paint(g, s) {
        const r = rnd(7);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const kind = ROAD(x, y) ? 'road' : x <= 4 && y >= 46 ? 'grass' : BUILD(x, y) ? null : 'sidewalk';
          if (kind) floorTile(g, kind, x, y, r);
        }
        // 연석
        for (let y = 0; y < H; y++) if (y < 10 || y > 15) { box(g, ROAD0 - 0.08, y, 0, 0.08, 1, 2, '#b3ada3'); box(g, ROAD1 + 1, y, 0, 0.08, 1, 2, '#b3ada3'); }
        // 차선 · 중앙선 · 횡단보도
        for (let y = 0; y < H; y++) {
          if ((y >= 7 && y <= 8) || (y >= 10 && y <= 18)) continue;
          top(g, 9.94, y, 0.2, 0.05, 1, '#f2c230'); top(g, 10.04, y, 0.2, 0.05, 1, '#f2c230');
          if (y % 2 === 0) { top(g, 8.48, y + 0.15, 0.2, 0.05, 0.6, '#f4f4f4'); top(g, 11.48, y + 0.15, 0.2, 0.05, 0.6, '#f4f4f4'); }
        }
        for (const yy of [7, 17]) for (let x = ROAD0 + 0.15; x < ROAD1 + 0.9; x += 0.42) top(g, x, yy + 0.15, 0.2, 0.2, 1.7, '#f6f6f2');
        for (const xx of [5, 13]) for (let y = 10.15; y < 15.9; y += 0.42) top(g, xx + 0.15, y, 0.2, 1.7, 0.2, '#f6f6f2');
        for (let x = 0; x < W; x++) { if (x >= 5 && x <= 14) continue; top(g, x, 12.94, 0.2, 1, 0.05, '#f2c230'); top(g, x, 13.04, 0.2, 1, 0.05, '#f2c230'); }
        // 점자 보도블록 (노란 줄)
        for (let y = 0; y < H; y++) { if (y >= 9 && y <= 16) continue; for (const xx of [6.62, 13.12]) { top(g, xx, y, 0.15, 0.26, 1, '#e9b92c'); for (let k = 0; k < 4; k++) top(g, xx + 0.03, y + 0.05 + k * 0.25, 0.2, 0.2, 0.03, '#f6d35a'); } }
        // 맨홀 · 배수구
        for (const [mx, my] of [[9.5, 30], [10.5, 45], [8.5, 20]]) { const [px, py] = iso(mx, my, 0.2); ell(g, px, py, 7, 3.5, '#55585f'); ell(g, px, py, 6, 3, '#6a6d74'); for (let i = -2; i <= 2; i++) R2(g, px - 4, py + i * 0.9, 8, 0.3, '#55585f'); }
        // 단면 가게
        B.filter((b) => b.kind === 'cut').sort((a, b) => a.x + a.y - (b.x + b.y)).forEach((b) => cutShop(g, b, labels, people));
        s.people = people;
      },
    });
    scene.labels = labels;
    scene.rides = { b0: bike0, b1: bike1, m: moto }; scene.cat = cat;
    scene.entrance = { gx: 14.5, gy: 31.5, obj: objects.find((o) => o.interact === askEnterBuilding) }; // 오피스텔 입구 (건물 뒤라 표시를 띄움)
    // 가게 손님 (앉은 모습)
    scene.npcs = scene.npcs.concat(people);
    return scene;
  }
  // 지붕 없는 가게: 바닥 + 뒤(서·북) 높은 벽 + 앞(동·남) 낮은 유리벽 + 안 가구 + 세움 간판
  function cutShop(g, b, labels, people) {
    if (CAP) return; // 3D 에선 가게 앞모습 건물로 대신
    const r = rnd(b.x * 31 + b.y);
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) floorTile(g, b.floor, x, y, r);
    const x0 = b.x, x1 = b.x + b.w, y0 = b.y, y1 = b.y + b.h, t = 0.18, sh = SHOPS[b.id];
    // 뒤쪽 벽 (북, 서) 높게
    box(g, x0, y0, 0, b.w, t, WH, b.wall, { t: '#fbf6ef' });
    const leftSide = b.side === 'left';
    box(g, x0, y0, 0, t, b.h, leftSide ? WH : 12, leftSide ? b.wall : '#cfe9f5', leftSide ? { t: '#fbf6ef' } : { t: '#ffffff', e: 'rgba(170,215,235,.9)' });
    sRect(g, y0 + t, x0, x1, 0, 3, shade(b.wall, -0.25)); if (leftSide) eRect(g, x0 + t, y0, y1, 0, 3, shade(b.wall, -0.3));
    // 벽 장식: 메뉴판 · 포스터
    for (let i = 0; i < b.w - 1; i++) { sRect(g, y0 + t, x0 + 0.6 + i, x0 + 1.3 + i, 14, 24, '#3b2a20'); sRect(g, y0 + t, x0 + 0.65 + i, x0 + 1.25 + i, 15, 23, i % 2 ? '#f6efe0' : '#fff7d6'); }
    // 가구
    b.items.forEach(([kind, ix, iy, iw, ih]) => drawFurniture(g, { kind, x: x0 + ix, y: y0 + iy, w: iw, h: ih, food: '#e8a33d' }));
    // 앞쪽 낮은 유리벽 (동 · 남) — 도로 쪽에 문
    const doorY = b.door != null ? y0 + b.door : -1;
    for (let y = y0; y < y1; y++) { if (b.side === 'left' && y === doorY) continue; box(g, x1 - t, y, 0, t, 1, b.side === 'left' ? 12 : LOW, '#cfe9f5', { t: '#ffffff', s: 'rgba(170,215,235,.85)', e: 'rgba(150,200,225,.85)' }); }
    box(g, x0, y1 - t, 0, b.w, t, LOW, b.wall, { t: '#fbf6ef' });
    if (b.side === 'right') { for (let y = y0; y < y1; y++) if (y === doorY) eRect(g, x0 + t, y + 0.15, y + 0.85, 0, 11, '#6b5a4a'); }
    if (b.glow) { // 달빛주막 앞 전구 줄 + 막걸리 입간판
      for (let y = y0 + 0.2; y < y1; y += 0.4) { const [bx, by] = iso(x0 + 0.1, y, WH - 2 - Math.abs(Math.sin((y - y0) * Math.PI / 3)) * 3); circle(g, bx, by, 0.9, ['#ffe27a', '#ffb347', '#ff8fab'][Math.round(y * 2.5) % 3]); }
      box(g, x1 + 0.05, y0 + b.door - 1 + 0.2, 0, 0.12, 0.6, 9, '#3b2a20', { t: '#5e381f' }); eRect(g, x1 + 0.17, y0 + b.door - 1 + 0.25, y0 + b.door - 1 + 0.75, 1, 8.5, '#fff5e1'); eRect(g, x1 + 0.17, y0 + b.door - 1 + 0.3, y0 + b.door - 1 + 0.7, 6, 8, '#c0392b');
    }
    // 세움 간판 (뒤 벽 위)
    const sx = x0 + 0.4, sw = b.w - 0.8, z = WH + 1;
    box(g, sx, y0 - 0.02, z, sw, 0.22, 12, sh.sign, { t: shade(sh.sign, 0.25) });
    const [lx, ly] = iso(sx + sw / 2, y0 + 0.2, z + 6);
    labels.push({ wx: lx, wy: ly, text: sh.name, bg: 'transparent', fg: sh.ink, max: sw * 26, glow: b.glow, skew: true });
    // 손님
    (b.people || []).forEach(([spr, px, py, face]) => people.push({ spr, x: (x0 + px) * T, y: (y0 + py) * T, face, sit: true, lines: ['냠냠~', '여기 맛집이네!', '한 잔 더?', '좋다~'] }));
  }
  function drawTower(g, b) {
    const { x, y, w, h } = b, Ht = 52;
    box(g, x + 0.1, y, 0, w - 0.1, h, Ht, b.wall, { t: b.roof });
    // 창문 (남·동 면)
    for (let i = 0; i < w; i++) for (let k = 0; k < 3; k++) sRect(g, y + h, x + 0.3 + i, x + 0.8 + i, 8 + k * 14, 16 + k * 14, b.glass);
    for (let j = 0; j < h; j++) for (let k = 0; k < 3; k++) eRect(g, x + w, y + 0.2 + j, y + 0.75 + j, 8 + k * 14, 16 + k * 14, shade(b.glass, -0.12));
    // 옥상 소품
    box(g, x + 1, y + 1, Ht, 1.2, 1.2, 8, '#d7dde3'); box(g, x + 3, y + 2, Ht, 1.4, 0.8, 4, '#2c4a7a', { t: '#3d5f95' }); box(g, x + 1.5, y + h - 3, Ht, 0.8, 0.6, 5, '#e9ecef');
    if (b.entrance != null) { // 서쪽(도로) 입구 캐노피는 뒤쪽이라 남쪽 모서리에 표시
      const ey = y + b.entrance; box(g, x - 0.4, ey, 18, 0.5, 2, 2, '#2a2f34');
    }
  }

  // ----- 1-2) 물결로 사거리 동쪽 → 윤슬역 · 윤슬로 → 윤슬해수욕장 (실제 방향: 동쪽으로 나가 역 앞에서 남쪽으로 쭉) -----
  // 지금 거리는 그대로 두고, 거리 동쪽 끝(사거리 길)에서 이어지는 새 장면 2개
  const OUTSIDE = new Set(['street', 'yunseul', 'beach']); // 바깥 (밤 하늘·탈것 그대로)
  const TRAIN = { at: 0, near: false }; // 바닷길선 열차 (가끔 지나감)
  Object.assign(SHOPS, {
    ystation: { name: '윤슬역', sub: '바닷길선', sign: '#1d4f9a', ink: '#fff', wall: '#e9eef3', say: '바닷길선 윤슬역! 시내도, 옆 동네도 금방이에요 🚆' },
    bokjip: { name: '바다복집', sub: '복국 · 복수육', sign: '#14466e', ink: '#fff', wall: '#eef2f4', say: '시원한 복국 한 그릇! 해장엔 여기 🐡' },
    agujjim: { name: '바다아구찜', sub: '아구찜 · 해물찜', sign: '#c0392b', ink: '#fff', wall: '#f4ece2', say: '매콤한 아구찜에 콩나물 듬뿍! 둘이 먹기 딱이에요 🌶️' },
    castle: { name: '성곽모텔', sub: '', sign: '#7a4ab0', ink: '#fff', wall: '#d8cfe6', say: '보라색 간판의 성곽모텔이에요.' },
    post: { name: '윤슬우체국', sub: '우체국', sign: '#e8402e', ink: '#fff', wall: '#f2efe8', say: '빨간 우체통이 있는 윤슬우체국. 편지 한 통 부쳐볼까요? ✉️' },
    redwhite: { name: '빨강하양', sub: '카페 · 브런치', sign: '#b8262e', ink: '#fff', wall: '#f7f1ea', say: '역 앞 카페 빨강하양! 아메리카노 두 잔이요 ☕' },
    skyocean: { name: '윤슬역 스카이뷰', sub: '오피스텔', sign: '#3a5a7a', ink: '#fff', wall: '#cfdce6', say: '바다가 보이는 높은 오피스텔이에요.' },
    walkhotel: { name: '산책호텔', sub: '윤슬점', sign: '#2a2a2a', ink: '#ffd36b', wall: '#e6e0d6', say: '산책호텔 윤슬점.' },
    office: { name: '윤슬동 행정복지센터', sub: '', sign: '#2f7a4a', ink: '#fff', wall: '#eef3ec', say: '윤슬동 행정복지센터. 등본 떼러 왔어요 📄' },
    pebble: { name: '조약돌민박', sub: '바다 앞 민박', sign: '#3aa0a8', ink: '#fff', wall: '#f2f7f4', say: '파도 소리 들리는 바다 앞 민박 🌊' },
    fishboat: { name: '고깃배밥상', sub: '물회 · 회덮밥 · 해물뚝배기', sign: '#1f6fb3', ink: '#fff', wall: '#eaf3f8', say: '시원한 물회에 회덮밥! 바다 보면서 한 그릇 🐟' },
    acorn: { name: '도토리호텔', sub: '윤슬해수욕장점', sign: '#6b4430', ink: '#fff', wall: '#e8dccb', say: '해수욕장 바로 앞 도토리호텔.' },
    sandgrain: { name: '모래알 리조트빌', sub: '아파트', sign: '#5c7a99', ink: '#fff', wall: '#dfe6ec', say: '바닷가 리조트빌 아파트예요.' },
    rescue: { name: '윤슬119 수상구조대', sub: '', sign: '#e8402e', ink: '#fff', wall: '#ffffff', say: '여름엔 구조대원들이 해변을 지켜요! 수영은 안전하게 🛟' },
    mart24: { name: '24마트', sub: '편의점', sign: '#2aa7e0', ink: '#fff', wall: '#f2f8fb', say: '바닷가 편의점! 아이스크림이랑 컵라면 하나? 🍦' },
    terrace: { name: '노을펜션', sub: '오션뷰 펜션', sign: '#f2a33a', ink: '#fff', wall: '#fff3e2', say: '바다 보이는 테라스가 있는 펜션이에요.' },
    seven: { name: '세븐마트', sub: '편의점', sign: '#1f8a4a', ink: '#fff', wall: '#f4f7f2', say: '해변 끝 세븐마트. 시원한 맥주 한 캔? 🍺' },
    beachcafe: { name: '포말카페', sub: '오션뷰 카페', sign: '#ff8fab', ink: '#fff', wall: '#fff6f8', say: '창가 자리에서 바다 보며 라떼 한 잔 ☕🌊' },
  });
  // 바깥 장면 공통: 가게(단면)·건물(타워)·장식을 만드는 도우미
  function outdoorBuild(B, Dlist) {
    const objects = [], dyn = [], lights = [], labels = [];
    B.forEach((b) => {
      const left = b.side === 'left', ax = left ? b.x + b.w : b.x - 1, ay = b.y + (b.door ?? Math.floor(b.h / 2));
      objects.push({ x: b.x, y: b.y, w: b.w, h: b.h, approach: [ax, ay], face: left ? 'left' : 'right', interact: () => openShop(SHOPS[b.id]), hitH: b.kind === 'tower' ? 60 : WH });
      if (b.kind === 'tower') { dyn.push({ kind: 'tower', b, x: b.x, y: b.y, w: b.w, h: b.h }); const sh = SHOPS[b.id]; if (sh) { const [lx, ly] = iso(b.x + b.w / 2, b.y + b.h / 2, 60); labels.push({ wx: lx, wy: ly, text: sh.name, bg: sh.sign, fg: sh.ink, max: 120 }); } }
      else lights.push({ gx: b.x + b.w / 2, gy: b.y + b.h / 2, r: 70, c: '255,230,170', a: 0.6 });
    });
    const D = (kind, x, y, extra = {}, solid = true) => { const o = { kind, x, y, w: 1, h: 1, ...extra }; dyn.push(o); if (solid) objects.push({ x, y, w: o.w, h: o.h }); return o; };
    (Dlist || []).forEach(([kind, x, y, extra, solid]) => { D(kind, x, y, extra, solid !== false); if (kind === 'lamp') lights.push({ gx: x + 0.5, gy: y + 0.5, z: 34, r: 60, c: '255,236,170', a: 1 }); });
    return { objects, dyn, lights, labels, D };
  }
  function yunseulScene() {
    const W = 20, H = 56, R0 = 9, R1 = 13; // 윤슬로 (남북)
    const ROAD = (x, y) => (x >= R0 && x <= R1) || (y >= 10 && y <= 15 && x <= R1);
    const RAIL = (x, y) => x >= 6 && x <= 7 && !(y >= 10 && y <= 15);
    const BUILD = (x, y) => ((x <= 4 || x >= 15) && !(y >= 9 && y <= 16)) && !(x <= 4 && y >= 51);
    const B = [
      { id: 'ystation', kind: 'cut', x: 0, y: 1, w: 5, h: 7, side: 'left', floor: 'stone', wall: '#e9eef3', door: 4, items: [['counter', 1, 1, 3, 1], ['bench', 1, 4, 1, 2], ['bench', 3, 4, 1, 2]], people: [['c3', 1.5, 4.5, 'right'], ['c6', 3.5, 5.2, 'right']] },
      { id: 'bokjip', kind: 'cut', x: 15, y: 1, w: 5, h: 7, side: 'right', floor: 'tile', wall: '#eef2f4', door: 4, items: [['pubtable', 1, 1, 2, 1], ['pubtable', 1, 4, 2, 1], ['fishtank', 3, 1, 1, 1]], people: [['c1', 1.5, 0.6, 'down'], ['c4', 2.4, 3.6, 'down']] },
      { id: 'redwhite', kind: 'cut', x: 0, y: 17, w: 5, h: 6, side: 'left', floor: 'wood', wall: '#f7f1ea', door: 3, items: [['counter', 1, 1, 3, 1], ['pubtable', 1, 3, 2, 1], ['plant', 4, 4, 1, 1]], people: [['c2', 1.5, 2.6, 'down'], ['c5', 2.5, 4.4, 'up']] },
      { id: 'skyocean', kind: 'tower', side: 'left', x: 0, y: 23, w: 5, h: 12, roof: '#d6e0e8', wall: '#cfdce6', glass: '#6f9ec4' },
      { id: 'walkhotel', kind: 'tower', side: 'left', x: 0, y: 35, w: 5, h: 9, roof: '#e3dccf', wall: '#e6e0d6', glass: '#55707f' },
      { id: 'office', kind: 'cut', x: 0, y: 44, w: 5, h: 7, side: 'left', floor: 'stone', wall: '#eef3ec', door: 3, items: [['realtydesk', 1, 1, 2, 1], ['realtydesk', 1, 3, 2, 1], ['plant', 4, 1, 1, 1]], people: [['c3', 1.5, 2.4, 'up']] },
      { id: 'agujjim', kind: 'cut', x: 15, y: 17, w: 5, h: 6, side: 'right', floor: 'dark', wall: '#f4ece2', door: 3, items: [['grilltable', 1, 1, 2, 1], ['grilltable', 1, 4, 2, 1]], people: [['c6', 1.5, 0.6, 'down'], ['c2', 2.4, 3.6, 'down']] },
      { id: 'castle', kind: 'tower', x: 15, y: 23, w: 5, h: 9, roof: '#cfc4e0', wall: '#d8cfe6', glass: '#7a5ab0' },
      { id: 'post', kind: 'cut', x: 15, y: 32, w: 5, h: 6, side: 'right', floor: 'tile', wall: '#f2efe8', door: 3, items: [['counter', 1, 1, 1, 4], ['shelf', 3, 1, 1, 1]], people: [['c4', 2.5, 2.4, 'left']] },
      { id: 'gs25x', kind: 'tower', x: 15, y: 38, w: 5, h: 18, roof: '#e3d9c7', wall: '#e9e1d2', glass: '#8fb0c4' },
    ];
    SHOPS.gs25x = { name: '윤슬 오션 아파트', sub: '', sign: '#5c7a99', ink: '#fff', wall: '#e9e1d2', say: '바다 쪽으로 늘어선 아파트예요.' };
    const { objects, dyn, lights, labels } = outdoorBuild(B, [
      ['tree', 8, 18], ['tree', 8, 28], ['tree', 8, 40], ['tree', 14, 22], ['tree', 14, 34], ['tree', 14, 46], ['tree', 3, 52], ['tree', 1, 54],
      ['lamp', 8, 24], ['lamp', 8, 47], ['lamp', 14, 30], ['lamp', 14, 52],
      ['railsign', 5, 16, {}, false], ['railsign', 8, 9, {}, false], ['bench', 8, 6, { w: 1, h: 2 }], ['bins', 14, 40], ['pole', 14, 8], ['pole', 8, 35],
      ['banner', 14, 18, { color: '#14466e', color2: '#ffffff' }], ['banner', 14, 33, { color: '#e8402e', color2: '#ffffff' }],
    ]);
    // 우체통
    dyn.push({ kind: 'cone', x: 14, y: 37, w: 1, h: 1 }); objects.push({ x: 14, y: 37, w: 1, h: 1 });
    const scene = makeScene({
      key: 'yunseul', title: '윤슬역 · 윤슬로', w: W, h: H, viewW: 280, spawn: [1, 12, 'right'],
      isFloor: (x, y) => !BUILD(x, y) && !RAIL(x, y), objects, dyn, lights,
      npcs: [
        { id: 'ilg1', spr: 'c5', name: '역무원', x: 3.5 * T, y: 9.5 * T, face: 'down', route: [[3, 9], [5, 9], [5, 16], [3, 16]], lines: ['열차 곧 들어옵니다~ 🚆', '건널목 조심하세요!', '해수욕장은 이 길로 쭉 내려가요 🏖️'] },
        { id: 'ilg2', spr: 'c2', name: '산책하는 분', x: 14.5 * T, y: 28.5 * T, face: 'down', route: [[14, 22], [14, 50], [8, 50], [8, 22]], lines: ['바다 바람 좋다~', '아구찜 먹으러 가는 길!', '오늘 파도 예쁘대요'] },
      ],
      drawExtra(g) { // 바닷길선 열차: 45초마다 남북으로 지나감 (건널목 경보등 깜빡)
        const now = performance.now() / 1000, cyc = now % 45, k = cyc / 7; TRAIN.near = cyc < 8;
        if (k <= 1) { const y = -10 + k * (H + 20); for (let c = 0; c < 3; c++) { const yy = y - c * 3.4; if (yy < -4 || yy > H + 1) continue; box(g, 6.1, yy, 2, 1.8, 3.2, 15, '#f4f6f8', { t: '#e2e8ee', e: '#dfe5ea' }); for (let w2 = 0; w2 < 3; w2++) eRect(g, 7.9, yy + 0.3 + w2 * 0.95, yy + 0.95 + w2 * 0.95, 8, 12.5, '#5a7da8'); eRect(g, 7.9, yy + 0.1, yy + 3.1, 3, 5, '#1d4f9a'); } }
      },
      paint(g, s) {
        const r = rnd(11);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const kind = RAIL(x, y) ? null : ROAD(x, y) ? 'road' : x <= 4 && y >= 51 ? 'grass' : BUILD(x, y) ? null : 'sidewalk';
          if (kind) floorTile(g, kind, x, y, r);
        }
        // 바닷길선 철길: 자갈 · 침목 · 레일 + 울타리 (건널목은 길로)
        for (let y = 0; y < H; y++) { if (y >= 10 && y <= 15) { top(g, 6, y, 0.05, 2, 1, '#5d6068'); top(g, 6.35, y, 0.12, 0.08, 1, '#b8c0c8'); top(g, 7.55, y, 0.12, 0.08, 1, '#b8c0c8'); continue; }
          top(g, 6, y, 0, 2, 1, '#a39a8c'); for (let k = 0; k < 3; k++) top(g, 6.1, y + k * 0.33 + 0.05, 0.05, 1.8, 0.12, '#7a5c40'); top(g, 6.35, y, 0.12, 0.08, 1, '#c9d0d6'); top(g, 7.55, y, 0.12, 0.08, 1, '#c9d0d6');
          box(g, 5.95, y, 0, 0.05, 1, 7, '#9aa3ad'); box(g, 8, y, 0, 0.05, 1, 7, '#9aa3ad'); }
        // 연석 · 중앙선 · 횡단보도
        for (let y = 0; y < H; y++) if (y < 10 || y > 15) { box(g, R0 - 0.08, y, 0, 0.08, 1, 2, '#b3ada3'); box(g, R1 + 1, y, 0, 0.08, 1, 2, '#b3ada3'); }
        for (let y = 0; y < H; y++) { if (y >= 9 && y <= 17) continue; top(g, 10.94, y, 0.2, 0.05, 1, '#f2c230'); top(g, 11.04, y, 0.2, 0.05, 1, '#f2c230'); if (y % 2 === 0) { top(g, 9.98, y + 0.15, 0.2, 0.05, 0.6, '#f4f4f4'); top(g, 12.48, y + 0.15, 0.2, 0.05, 0.6, '#f4f4f4'); } }
        for (const yy of [8, 17, 40]) for (let x = R0 + 0.15; x < R1 + 0.9; x += 0.42) top(g, x, yy + 0.15, 0.2, 0.2, 1.7, '#f6f6f2');
        for (let x = 0; x <= R0 - 1; x++) { if (x >= 6 && x <= 7) continue; top(g, x, 12.94, 0.2, 1, 0.05, '#f2c230'); top(g, x, 13.04, 0.2, 1, 0.05, '#f2c230'); }
        // 남쪽 바닥 화살표 (해수욕장 방향)
        for (const yy of [44, 50]) { top(g, 11.35, yy, 0.2, 0.3, 1.2, '#f4f4f4'); top(g, 11.1, yy + 1.1, 0.2, 0.8, 0.3, '#f4f4f4'); }
        B.filter((b) => b.kind === 'cut').sort((a, b) => a.x + a.y - (b.x + b.y)).forEach((b) => cutShop(g, b, labels, s.people = s.people || []));
      },
    });
    scene.labels = labels.concat([{ wx: iso(11.5, 54, 30)[0], wy: iso(11.5, 54, 30)[1], text: '↓ 윤슬해수욕장', bg: '#2aa7e0', fg: '#fff', max: 120 }, { wx: iso(1, 12, 30)[0], wy: iso(1, 12, 30)[1], text: '← 물결로', bg: '#5c7a99', fg: '#fff', max: 100 }]);
    scene.npcs = scene.npcs.concat(scene.people || []);
    scene.exits = [{ x: 0, y: 10, w: 1, h: 6, to: 'street', at: (tx, ty) => [18, ty, 'left'] }, { x: R0, y: H - 1, w: R1 - R0 + 1, h: 1, to: 'beach', at: (tx) => [tx, 1, 'down'] }];
    return scene;
  }
  function beachScene() {
    const W = 34, H = 42, R0 = 9, R1 = 13, SAND0 = 21, SEA0 = 26; // 길 · 산책로(19~20) · 모래사장 · 바다
    const ROAD = (x) => x >= R0 && x <= R1;
    const BUILD = (x, y) => (x <= 5 && !(y >= 15 && y <= 16)) || (x >= 15 && x <= 18 && !((y >= 9 && y <= 10) || (y >= 24 && y <= 31) || y >= 39));
    const SEA = (x) => x >= SEA0;
    const B = [
      { id: 'pebble', kind: 'cut', x: 0, y: 1, w: 6, h: 6, side: 'left', floor: 'wood', wall: '#f2f7f4', door: 3, items: [['bench', 1, 1, 1, 2], ['plant', 4, 1, 1, 1], ['counter', 1, 4, 3, 1]], people: [['c6', 2.5, 2.5, 'down']] },
      { id: 'fishboat', kind: 'cut', x: 0, y: 7, w: 6, h: 8, side: 'left', floor: 'tile', wall: '#eaf3f8', door: 4, items: [['pubtable', 1, 1, 2, 1], ['pubtable', 1, 3, 2, 1], ['pubtable', 1, 5, 2, 1], ['fishtank', 4, 1, 1, 1]], people: [['c1', 1.5, 0.6, 'down'], ['c3', 2.4, 2.6, 'down'], ['c5', 1.6, 4.6, 'down']] },
      { id: 'acorn', kind: 'tower', side: 'left', x: 0, y: 17, w: 6, h: 11, roof: '#d9c9b2', wall: '#e8dccb', glass: '#6b4430' },
      { id: 'sandgrain', kind: 'tower', side: 'left', x: 0, y: 28, w: 6, h: 14, roof: '#d6dee6', wall: '#dfe6ec', glass: '#7fa7c9' },
      { id: 'rescue', kind: 'cut', x: 15, y: 2, w: 4, h: 7, side: 'right', floor: 'stone', wall: '#ffffff', door: 3, items: [['counter', 1, 1, 2, 1], ['shelf', 1, 4, 2, 1]], people: [['c4', 2.5, 2.5, 'left']] },
      { id: 'mart24', kind: 'cut', x: 15, y: 11, w: 4, h: 6, side: 'right', floor: 'tile', wall: '#f2f8fb', door: 2, items: [['shelf', 1, 1, 2, 1], ['shelf', 1, 3, 2, 1], ['counter', 3, 4, 1, 1]], people: [['c2', 2.5, 2.4, 'up']] },
      { id: 'terrace', kind: 'tower', x: 15, y: 17, w: 4, h: 7, roof: '#f2dcc0', wall: '#fff3e2', glass: '#f2a33a' },
      { id: 'beachcafe', kind: 'cut', x: 15, y: 32, w: 4, h: 7, side: 'right', floor: 'wood', wall: '#fff6f8', door: 3, items: [['counter', 1, 1, 2, 1], ['pubtable', 1, 3, 2, 1], ['pubtable', 1, 5, 2, 1]], people: [['c5', 1.5, 2.6, 'down'], ['c1', 2.4, 4.6, 'down']] },
      { id: 'seven', kind: 'cut', x: 15, y: 39, w: 4, h: 3, side: 'right', floor: 'tile', wall: '#f4f7f2', door: 1, items: [['shelf', 1, 1, 2, 1]], people: [] },
    ];
    // seven 은 맨 아래 칸 (y 39~41) — 걸을 수 있는 칸에서 빼기
    const BUILD2 = (x, y) => BUILD(x, y) || (x >= 15 && x <= 18 && y >= 39);
    const { objects, dyn, lights, labels } = outdoorBuild(B, [
      ['tree', 8, 4], ['tree', 8, 14], ['tree', 8, 30], ['tree', 14, 6], ['tree', 14, 36],
      ['lamp', 8, 9], ['lamp', 8, 24], ['lamp', 19, 6], ['lamp', 19, 20], ['lamp', 19, 34],
      ['bench', 20, 4, { w: 1, h: 2 }], ['bench', 20, 16, { w: 1, h: 2 }], ['bench', 20, 35, { w: 1, h: 2 }],
      ['parasol', 22, 6, { color: '#ff6b6b' }, false], ['sunbed', 23, 6, { w: 1, h: 2 }], ['parasol', 23, 13, { color: '#ffd23a', color2: '#ff8fab' }, false], ['sunbed', 24, 13, { w: 1, h: 2, color: '#ff8fab', color2: '#ffc6d3' }],
      ['lifeguard', 24, 21], ['parasol', 22, 28, { color: '#5fb3d9' }, false], ['sunbed', 23, 28, { w: 1, h: 2, color: '#7fd36b', color2: '#b6e8a0' }],
      ['parasol', 23, 35, { color: '#8a7ad8', color2: '#fff' }, false], ['sandcastle', 22, 38], ['beachsign', 16, 27, { w: 3, h: 1 }],
      ['bins', 14, 25], ['pole', 14, 28], ['banner', 14, 10, { color: '#2aa7e0', color2: '#ffffff' }],
    ]);
    // 바다: 누르면 파도 구경 · 사진
    objects.push({ x: SEA0, y: 0, w: W - SEA0, h: H, approach: [SEA0 - 1, 20], face: 'right', hitH: 4, interact: seaAsk });
    // 선베드 (앉기)
    const beds = dyn.filter((o) => o.kind === 'sunbed');
    beds.forEach((b) => { const o = objects.find((ob) => ob.x === b.x && ob.y === b.y && !ob.interact); if (o) Object.assign(o, { approach: [b.x - 1, b.y], face: 'right', hitH: 8, interact: () => lieSunbed(b) }); });
    const scene = makeScene({
      key: 'beach', title: '윤슬해수욕장', w: W, h: H, viewW: 300, spawn: [11, 1, 'down'],
      isFloor: (x, y) => !BUILD2(x, y) && !SEA(x), objects, dyn, lights,
      npcs: [
        { id: 'bch1', spr: 'c4', name: '수상구조대원', x: 23.5 * T, y: 22.5 * T, face: 'right', route: [[23, 22], [23, 8], [25, 8], [25, 36], [23, 36]], lines: ['수영은 안전 부표 안에서만! 🛟', '오늘 파도 잔잔해요~', '해파리 조심하세요!'] },
        { id: 'bch2', spr: 'c6', name: '모래놀이 꼬마', x: 21.5 * T, y: 37.5 * T, face: 'down', route: [[21, 37], [21, 40], [24, 40], [24, 37]], lines: ['모래성 내가 만들었어요!', '조개 찾았다~ 🐚', '언니 오빠 커플이에요? 헤헤'] },
        { id: 'bch3', spr: 'c3', name: '산책하는 분', x: 19.5 * T, y: 12.5 * T, face: 'down', route: [[19, 1], [19, 40], [20, 40], [20, 1]], lines: ['윤슬 바다 최고~', '노을 질 때 오면 더 예뻐요 🌅', '고깃배밥상 물회 꼭 먹어봐요!'] },
      ],
      drawExtra(g) { // 바다: 넘실대는 물결 · 하얀 파도 거품 · 반짝임 · 갈매기
        const t = performance.now() / 1000;
        for (let y = 0; y < H; y++) {
          const fx0 = SEA0 - 0.25 + Math.sin(t * 1.4 + y * 0.6) * 0.18;
          top(g, fx0 - 0.15, y, 0.05, 0.5, 1, 'rgba(160,215,235,.55)');
          top(g, fx0, y, 0.08, 0.22, 1, 'rgba(255,255,255,.9)');
          for (let k = 0; k < 2; k++) { const xx = SEA0 + 0.8 + ((y * 7 + k * 13) % 30) / 10, ph = (t * 0.8 + y * 0.3 + k) % 2; if (ph < 1) top(g, xx + ph * 0.3, y + 0.3, 0.06, 0.5 - ph * 0.3, 0.08, `rgba(255,255,255,${0.7 * (1 - ph)})`); }
        }
        for (let i = 0; i < 3; i++) { const gx = SEA0 + 1 + ((t * 0.6 + i * 1.7) % 6), gy = 6 + i * 12 + Math.sin(t + i) * 2, [px, py] = iso(gx, gy, 46 + i * 6); const fl = Math.sin(t * 8 + i) * 2.5; g.strokeStyle = '#ffffff'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px - 5, py - fl); g.quadraticCurveTo(px - 2, py - 3, px, py); g.quadraticCurveTo(px + 2, py - 3, px + 5, py - fl); g.stroke(); }
      },
      paint(g, s) {
        const r = rnd(23);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (SEA(x)) { const deep = Math.min(1, (x - SEA0) / 3.5); top(g, x, y, 0, 1, 1, deep > 0.6 ? '#3f9fd0' : deep > 0.3 ? '#5bb7de' : '#7fcde8'); if ((x * 3 + y * 7) % 5 === 0) top(g, x + 0.2, y + 0.3, 0.02, 0.4, 0.06, 'rgba(255,255,255,.35)'); continue; }
          if (x >= SAND0) { top(g, x, y, 0, 1, 1, (x + y) % 2 ? '#f2dcae' : '#efd6a4'); for (let k = 0; k < 3; k++) top(g, x + r() * 0.9, y + r() * 0.9, 0, 0.05, 0.05, r() < 0.5 ? '#e2c48e' : '#fbe9c4'); if (x === SEA0 - 1) top(g, x + 0.4, y, 0, 0.6, 1, '#d9c08e'); continue; }
          if (x >= 19) { floorTile(g, 'deck', x, y, r); continue; } // 해변 산책로 (나무 데크)
          const kind = ROAD(x) ? 'road' : BUILD2(x, y) ? null : 'sidewalk';
          if (kind) floorTile(g, kind, x, y, r);
        }
        // 산책로 난간 (모래 쪽) · 모래로 내려가는 계단 자리
        for (let y = 0; y < H; y++) { if (y % 8 === 3) continue; box(g, 20.92, y, 0, 0.08, 1, 6, '#b07a52', { t: '#d0a07a' }); }
        // 길: 연석 · 중앙선 · 횡단보도
        for (let y = 0; y < H; y++) { box(g, R0 - 0.08, y, 0, 0.08, 1, 2, '#b3ada3'); box(g, R1 + 1, y, 0, 0.08, 1, 2, '#b3ada3'); if (y === 9 || y === 10 || y === 26 || y === 27) continue; top(g, 10.94, y, 0.2, 0.05, 1, '#f2c230'); top(g, 11.04, y, 0.2, 0.05, 1, '#f2c230'); }
        for (const yy of [9, 26]) for (let x = R0 + 0.15; x < R1 + 0.9; x += 0.42) top(g, x, yy + 0.15, 0.2, 0.2, 1.7, '#f6f6f2');
        // 안전 부표 줄
        for (let y = 2; y < H - 1; y += 2) { const [px, py] = iso(SEA0 + 2.6, y + 0.5, 1); circle(g, px, py, 1.8, '#ff9e3a'); }
        B.filter((b) => b.kind === 'cut').sort((a, b) => a.x + a.y - (b.x + b.y)).forEach((b) => cutShop(g, b, labels, s.people = s.people || []));
      },
    });
    scene.labels = labels.concat([{ wx: iso(11.5, 1, 30)[0], wy: iso(11.5, 1, 30)[1], text: '↑ 윤슬역', bg: '#1d4f9a', fg: '#fff', max: 80 }]);
    scene.npcs = scene.npcs.concat(scene.people || []);
    scene.exits = [{ x: R0, y: 0, w: R1 - R0 + 1, h: 1, to: 'yunseul', at: (tx) => [tx, 54, 'up'] }];
    return scene;
  }
  // 지금 거리는 그대로: 동쪽 끝 사거리 길(19, 10~15)로 나가면 윤슬역 쪽으로 (표지판만 덧붙임)
  function linkStreet() {
    const st = scenes.street;
    st.exits = [{ x: st.w - 1, y: 10, w: 1, h: 6, to: 'yunseul', at: (tx, ty) => [1, ty, 'right'] }];
    const [lx, ly] = (OX = st.ox, OY = st.oy, iso(st.w - 1, 12.5, 30));
    st.labels = (st.labels || []).concat([{ wx: lx, wy: ly, text: '윤슬역 · 해수욕장 →', bg: '#2aa7e0', fg: '#fff', max: 130 }]);
  }
  // 장면 가장자리 출구: 그 칸에 들어서면 이어진 장면으로
  function checkExits() {
    if (!scene || !scene.exits || busy || player.pose) return;
    const [tx, ty] = ptile(), e = scene.exits.find((x) => tx >= x.x && tx < x.x + x.w && ty >= x.y && ty < x.y + x.h);
    if (e && scenes[e.to]) { path = []; pending = null; goScene(e.to, e.at(tx, ty)); }
  }
  function seaAsk() {
    say('철썩철썩… 윤슬 바다예요 🌊', [
      { label: '파도 구경하기 🌊', fn: () => { player.face = 'right'; fx.bubbles[me] = { text: '바다 냄새 좋다~ 🌊', until: Date.now() + 3200 }; buddySays('파도 소리 들으니까 마음이 편해 💕'); melody([523, 659, 784, 659]); } },
      { label: '같이 사진 찍기 📸', fn: () => { beep(1200, 0.05); setTimeout(() => beep(1500, 0.05), 120); const [px, py] = (OX = scene.ox, OY = scene.oy, iso(player.x / T, player.y / T)); for (let i = 0; i < 8; i++) fx.hearts.push({ x: px - 10 + Math.random() * 20, y: py - 30, t: 1.2 + Math.random(), life: 2.2, s: Math.random() * 6 }); toast('찰칵! 윤슬 바다 앞에서 한 장 📸'); buddySays('예쁘게 나왔다! 💕'); sendAct({ type: 'emote', e: 'love' }); } },
    ]);
  }
  function lieSunbed(b) {
    player.x = (b.x + 0.5) * T; player.y = (b.y + 1) * T; player.face = 'right'; player.pose = 'sit';
    if (withBuddy()) { buddy.x = (b.x - 0.4) * T; buddy.y = (b.y + 1) * T; buddy.face = 'right'; buddy.pose = 'sit'; buddy.bubble = { text: '바다 보면서 쉬자~ 🏖️', until: Date.now() + 2400 }; }
    say('선베드에 앉았어요. 바다 바람 솔솔~ 화면을 누르면 일어나요.'); syncSoon();
  }

  // ----- 2) 달빛주막 안 -----
  // 입구에서 정면 = 주방(주황 발로 가림)·카운터, 문 왼쪽 1테이블, 오른쪽 줄 4테이블, 꺾어서 왼쪽으로 3테이블
  // 카운터 오른편 직원 통로 쪽에 삿포로 · 카스 생맥주 기계, 테이블마다 위에 조명
  function jumakScene() {
    const W = 13, H = 12;
    const grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '#' : y === 1 ? 't' : 'd')));
    grid[H - 1][6] = 'd'; grid[H - 1][7] = 'd'; // 출입문
    const T2 = (x, y, food) => ({ kind: 'pubtable', x, y, w: 2, h: 1, food });
    const tables = [
      T2(2, 9, '#e8a33d'),                                                     // 문 왼쪽 1테이블
      T2(10, 4, '#f2c94c'), T2(10, 6, '#d35400'), T2(10, 8, '#e8a33d'), T2(10, 10, '#f2c94c'), // 오른쪽 4테이블
      T2(7, 4, '#d35400'), T2(4, 4, '#e8a33d'), T2(1, 4, '#f2c94c'),             // 꺾어서 왼쪽 3테이블
    ];
    const F = [{ kind: 'counter', x: 1, y: 2, w: 8, h: 1 }, { kind: 'beer', x: 9, y: 2, w: 1, h: 1 }, { kind: 'drinkfridge', x: 11, y: 1, w: 1, h: 1 }, { kind: 'crates', x: 10, y: 1, w: 1, h: 1 }, { kind: 'plant', x: 9, y: 10, w: 1, h: 1 }, { kind: 'umbrella', x: 1, y: 10, w: 1, h: 1 }, ...tables];
    const objects = F.map((f) => ({ x: f.x, y: f.y, w: f.w, h: f.h }));
    objects.push({ x: 6, y: 11, w: 2, h: 1, solid: false, approach: [6, 10], face: 'down', interact: () => goScene('street', [14, 20, 'down']), hitH: 4 });
    objects.push({ x: 9, y: 2, w: 1, h: 1, approach: [9, 3], face: 'up', hitH: 22, interact: () => say('삿포로랑 카스 생맥주 기계! 시원하게 한 잔씩?', [{ label: '생맥주 주문 🍺', fn: () => { say('하늘: 삿포로 하나, 카스 하나 나갑니다~ 🍺🍺'); melody([659, 784, 1047]); } }]) });
    const pendants = tables.map((t) => ({ kind: 'pendant', x: t.x, y: t.y, w: t.w, h: t.h }));
    const C = (spr, gx, gy, face) => ({ spr, x: gx * T, y: gy * T, face, sit: true, lines: drunk });
    const drunk = ['캬~ 막걸리 맛있다!', '짠! 🍶', '여기 고추튀김 하나 더요!', '2차는 어디로 가?', '빗소리 들으면서 전에 막걸리 최고지', '오늘 진짜 행복하다~', '사장님 여기 생맥 두 잔이요!', '이 집 육전 미쳤어…', '삿포로 한 잔 더!'];
    const npcs = [
      C('c1', 2.5, 8.6, 'down'), C('c2', 3.3, 10.4, 'up'),
      C('c3', 10.5, 3.6, 'down'), C('c4', 11.3, 5.4, 'up'), C('c5', 10.6, 7.6, 'down'), C('c6', 11.2, 9.4, 'up'), C('c2', 10.5, 9.6, 'down'),
      C('c5', 7.5, 3.6, 'down'), C('c1', 8.3, 5.4, 'up'), C('c4', 4.5, 3.6, 'down'), C('c3', 1.6, 5.4, 'up'), C('c6', 2.3, 3.6, 'down'),
      { id: 'chanbin', spr: 'chanbin', name: '이파도', x: 6.5 * T, y: 7.5 * T, face: 'down', route: [[6, 7], [6, 3], [9, 3], [9, 7], [9, 9], [6, 9]],
        lines: ['어서오세요~ 달빛주막입니다!', '고추튀김 금방 나와요!', '오늘 막걸리 시원합니다 :)', '두 분 자리 이쪽으로 모실게요.', '저희 집 육전도 꼭 드셔보세요.', '주말엔 웨이팅 있어요, 오늘 운 좋으시네요!'] },
      { id: 'jinhee', spr: 'jinhee', name: '하늘', x: 10.5 * T, y: 3.5 * T, face: 'left', route: [[10, 3], [9, 3], [9, 5], [9, 7], [9, 3], [3, 3]],
        lines: ['주문하시겠어요?', '육전 추천드려요! 진짜 맛있어요', '생맥은 삿포로랑 카스 있어요!', '앗 잠시만요~ 금방 갈게요!', '오늘 비 온대요, 막걸리 각이에요', '맛있게 드세요~'] },
      { id: 'haeun', spr: 'haeun', name: '소라', x: 4.5 * T, y: 7.5 * T, face: 'right', route: [[4, 7], [8, 7], [8, 10], [5, 10], [5, 7], [1, 7]],
        lines: ['맛있게 드세요~ 🐶', '막걸리 한 병 더 드릴까요?', '앞접시 필요하시면 말씀해주세요!', '고추튀김은 뜨거우니까 조심!', '두 분 너무 잘 어울려요 ㅎㅎ', '헤헤 오늘도 화이팅!'] },
    ];
    return makeScene({
      key: 'jumak', title: '달빛주막 윤슬점', w: W, h: H, viewW: 215, spawn: [6, 10, 'up'],
      isFloor: (x, y) => grid[y][x] !== '#', objects, npcs,
      dyn: F.map((f) => ({ ...f })).concat(pendants),
      lights: tables.map((t) => ({ gx: t.x + 1, gy: t.y + 0.5, r: 48, c: '255,190,90', a: 0.9 })),
      paint(g, s) {
        paintWalls(g, grid, (c) => (c === 't' ? 'tile' : 'dark'), { wall: () => '#f0a35e', base: '#8a4a22', cap: '#ffe2c2' }); // 주황 톤
        // 주방 (뒤쪽, 주황 발 너머)
        box(g, 1.2, 0.7, 0, 3, 0.5, 14, '#c9ced4', { t: '#e3e7eb' }); box(g, 5, 0.7, 0, 3, 0.5, 14, '#c9ced4', { t: '#e3e7eb' });
        for (let i = 0; i < 3; i++) { top(g, 1.5 + i * 0.9, 0.85, 14.3, 0.5, 0.3, '#3a3d42'); top(g, 5.3 + i * 0.9, 0.85, 14.3, 0.5, 0.3, i % 2 ? '#3a3d42' : '#b8c1ca'); }
        // 메뉴판 (뒤 벽)
        for (let i = 0; i < 3; i++) { sRect(g, 0.61, 1.5 + i * 2.6, 3.6 + i * 2.6, 22, 31, '#3b2a20'); sRect(g, 0.61, 1.6 + i * 2.6, 3.5 + i * 2.6, 23, 30, '#fff3e0'); sRect(g, 0.61, 1.8 + i * 2.6, 3.2 + i * 2.6, 27, 28.2, '#c0392b'); sRect(g, 0.61, 1.8 + i * 2.6, 2.9 + i * 2.6, 24.5, 25.5, '#777'); }
        // 개구리 그림 액자
        sRect(g, 0.61, 9.4, 10.4, 12, 22, '#3b2a20'); sRect(g, 0.61, 9.48, 10.32, 13, 21, '#1c1c1f'); { const [fx0, fy0] = iso(9.9, 0.61, 17); circle(g, fx0, fy0, 3, '#56c271'); R(g, fx0 - 2, fy0 - 3, 1, 1, '#ffffff'); R(g, fx0 + 1, fy0 - 3, 1, 1, '#ffffff'); }
        s.labels = [{ wx: iso(5, 0.6, WH + 8)[0], wy: iso(5, 0.6, WH + 8)[1], text: '달빛주막 · 고추튀김 · 육전 · 막걸리', bg: 'transparent', fg: '#6b3a10', max: 150, glow: true }];
        box(g, 2, 0.4, WH + 1, 6, 0.22, 13, '#ffcc2e', { t: '#ffe27a' });
        // 아래쪽 원목 징두리 판벽 (뒤 벽 두 면)
        sRect(g, 0.61, 1, W - 1, 0, 11, '#6b4024'); eRect(g, 0.61, 1, H - 1, 0, 11, '#5e381f');
        for (let x = 1; x < W - 1; x += 0.5) sRect(g, 0.61, x, x + 0.03, 0.5, 10.5, '#4f2e18');
        for (let y = 1; y < H - 1; y += 0.5) eRect(g, 0.61, y, y + 0.03, 0.5, 10.5, '#47291a');
        sRect(g, 0.61, 1, W - 1, 11, 12, '#8a5a34'); eRect(g, 0.61, 1, H - 1, 11, 12, '#7a4e2c');
        // 서쪽 벽: 막걸리 선반 2단 (초록·흰 병) + 포스터 + 창문
        for (const z of [15, 22]) {
          box(g, 0.62, 5.2, z, 0.28, 3.4, 0.8, '#7a4f30', { t: '#9a6a45' });
          for (let i = 0; i < 11; i++) { const by3 = 5.35 + i * 0.3, c = i % 3 === 1 ? '#f4f4ee' : '#3aa55a'; box(g, 0.68, by3, z + 0.8, 0.12, 0.12, 4.2, c, { t: shade(c, 0.2), noEdge: true }); box(g, 0.7, by3 + 0.02, z + 5, 0.08, 0.08, 1.2, i % 3 === 1 ? '#2e7d32' : '#f2c230', { noEdge: true }); }
        }
        eRect(g, 0.61, 1.6, 3.6, 14, 28, '#3b2a20'); eRect(g, 0.61, 1.7, 3.5, 15, 27, '#fff5e1');
        eRect(g, 0.61, 1.9, 3.3, 23.5, 26, '#c0392b'); eRect(g, 0.61, 2.1, 2.7, 16, 22, '#f2c94c'); eRect(g, 0.61, 2.85, 3.15, 16, 21, '#3aa55a'); // 막걸리 포스터
        eRect(g, 0.61, 9.2, 10.8, 15, 28, '#5e381f'); eRect(g, 0.61, 9.3, 10.7, 16, 27, '#a9d7ee'); eRect(g, 0.61, 9.3, 10.7, 16, 19, '#7fbbe0'); eRect(g, 0.61, 9.98, 10.02, 16, 27, '#5e381f'); // 창문
        // 북쪽 벽: 야구 중계 TV · 둥근 시계
        sRect(g, 0.61, 10.7, 12.3, 18, 27.5, '#1d1f24'); sRect(g, 0.61, 10.8, 12.2, 18.6, 27, '#3f8f45'); sRect(g, 0.61, 10.8, 12.2, 18.6, 21, '#2b6e33'); { const [bx4, by4] = iso(11.2, 0.61, 24); R2(g, bx4, by4, 1, 1, '#ffffff'); const [sx4, sy4] = iso(11.9, 0.61, 26); R2(g, sx4 - 3, sy4, 6, 1.2, 'rgba(0,0,0,.6)'); }
        { const [cx4, cy4] = iso(9.9, 0.61, 29); circle(g, cx4, cy4, 2.6, '#3b2a20'); circle(g, cx4, cy4, 2.1, '#fffaf0'); R2(g, cx4 - 0.25, cy4 - 1.6, 0.5, 1.6, '#3b2a20'); R2(g, cx4, cy4 - 0.25, 1.2, 0.5, '#3b2a20'); }
        // 출입문 매트
        top(g, 6.1, 10.3, 0.3, 1.8, 0.6, '#8a3a2a'); top(g, 6.2, 10.38, 0.4, 1.6, 0.44, '#a84a36');
      },
      drawExtra(g) { // 주황 발 (주방 입구를 가림) — 살랑살랑
        const t = performance.now() / 1000;
        for (let i = 0; i < 8; i++) {
          const x0 = 1.05 + i, sway = Math.sin(t * 1.6 + i) * 0.03;
          g.globalAlpha = 0.92;
          sRect(g, 1.85, x0 + sway, x0 + 0.9 + sway, 15, 31, i % 2 ? '#f07b22' : '#f5892f');
          sRect(g, 1.85, x0 + sway, x0 + 0.9 + sway, 29, 31, '#c85a10');
          g.globalAlpha = 1;
        }
        const [nx, ny] = iso(5, 1.85, 24); g.fillStyle = '#fff3e0'; g.font = '6px sans-serif'; g.fillText('달 빛 주 막', nx - 10, ny);
        // 벽 위 전구 줄 (반짝반짝)
        const bulb = (x0, y0, z0, i) => { const on = (Math.floor(t * 2) + i) % 5 !== 0; const [bx, by] = iso(x0, y0, z0); R2(g, bx - 0.3, by - 1.5, 0.6, 1.2, '#3a2a22'); circle(g, bx, by, 1.1, on ? ['#ffe27a', '#ffb347', '#ff8fab', '#fff3c4'][i % 4] : '#a08060'); if (on) circle(g, bx, by, 2.4, 'rgba(255,220,140,.18)'); };
        g.strokeStyle = '#3a2a22'; g.lineWidth = 0.4; g.beginPath();
        for (let x = 1; x <= 12; x += 0.25) { const [lx, ly] = iso(x, 0.62, 33 - Math.abs(Math.sin((x - 1) * Math.PI / 2.75)) * 3); if (x === 1) g.moveTo(lx, ly); else g.lineTo(lx, ly); }
        for (let y = 1; y <= 11; y += 0.25) { const [lx, ly] = iso(0.62, y, 33 - Math.abs(Math.sin((y - 1) * Math.PI / 2.5)) * 3); g.lineTo(lx, ly); }
        g.stroke();
        let bi = 0; for (let x = 1.4; x < 12; x += 0.7) bulb(x, 0.62, 32 - Math.abs(Math.sin((x - 1) * Math.PI / 2.75)) * 3, bi++);
        for (let y = 1.4; y < 11; y += 0.7) bulb(0.62, y, 32 - Math.abs(Math.sin((y - 1) * Math.PI / 2.5)) * 3, bi++);
        // 빨간 · 노란 종이 등 (살랑)
        for (const [lx0, ly0, c0] of [[0.9, 4.5, '#e8343a'], [0.9, 8.5, '#f2a531'], [4.5, 0.9, '#e8343a'], [8, 0.9, '#f2a531']]) {
          const sw = Math.sin(t * 1.3 + lx0) * 0.6, [px, py] = iso(lx0, ly0, 27);
          R2(g, px - 0.2 + sw, py - 6, 0.4, 6, '#3a2a22'); ell(g, px + sw, py + 2, 2.6, 3.4, c0); ell(g, px + sw - 0.8, py + 1, 0.7, 1.6, 'rgba(255,255,255,.35)');
          R2(g, px - 1.6 + sw, py - 1.4, 3.2, 0.8, '#3a2a22'); R2(g, px - 1.6 + sw, py + 5, 3.2, 0.8, '#3a2a22'); R2(g, px - 0.2 + sw, py + 5.8, 0.4, 2, '#f2c230');
        }
      },
    });
  }

  // ----- 2-1) FRESH MART 안: 섹션별 진열대 → 누르면 장보기, 계산대에서 결제 -----
  const MART_FIX = [ // [섹션, 종류, x, y, w, h]
    ['meat', 'coolcase', 1, 1, 3, 1], ['fish', 'coolcase', 4, 1, 3, 1], ['dairy', 'coolcase', 7, 1, 3, 1], ['drink', 'coolcase', 10, 1, 3, 1],
    ['veg', 'produce', 1, 4, 3, 2], ['fruit', 'produce', 1, 7, 3, 2],
    ['pantry', 'gondola', 5, 4, 3, 1], ['season', 'gondola', 5, 7, 3, 1], ['snack', 'gondola', 9, 4, 3, 1], ['liquor', 'gondola', 9, 6, 3, 1],
  ];
  const SECTION_LOOK = { meat: ['#c0392b', '#e8786b', '#f4b2a8'], fish: ['#2f6fb3', '#f08a5d', '#cfd8e0'], dairy: ['#fdfdf8', '#f2c94c', '#ffffff'], drink: ['#2e9e5b', '#e8343a', '#7d5bd6'], liquor: ['#3aa55a', '#7a1f3a', '#c8781e', '#f4f4ee', '#2b2b2b'],
    veg: ['#5fae4e', '#3f8f3a', '#f08a2b', '#7cc36a', '#c9a0dc'], fruit: ['#e8343a', '#f2c94c', '#f08a2b', '#7d5bd6', '#7cc36a'], pantry: ['#d9822b', '#f2e6c9', '#c0392b'], season: ['#8a5a3c', '#c0392b', '#2b2b2b'], snack: ['#e86aa6', '#f2c94c', '#8a5a3c'] };
  function martScene() {
    const W = 14, H = 12;
    const grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '#' : 't')));
    grid[H - 1][6] = 't'; grid[H - 1][7] = 't';
    const F = MART_FIX.map(([sec, kind, x, y, w, h]) => ({ kind, sec, x, y, w, h }));
    F.push({ kind: 'checkout', x: 9, y: 8, w: 3, h: 1 }, { kind: 'carts', x: 2, y: 10, w: 1, h: 1 }, { kind: 'plant', x: 12, y: 10, w: 1, h: 1 });
    const objects = F.map((f) => {
      const o = { x: f.x, y: f.y, w: f.w, h: f.h, hitH: f.kind === 'coolcase' ? 24 : 14 };
      if (f.sec) Object.assign(o, { interact: () => openMart(f.sec), face: f.kind === 'produce' ? 'left' : 'up', approach: f.kind === 'produce' ? [f.x + f.w, f.y] : [f.x + 1, f.y + f.h] });
      if (f.kind === 'checkout') Object.assign(o, { interact: openCheckout, face: 'up', approach: [10, 9] });
      return o;
    });
    objects.push({ x: 6, y: 11, w: 2, h: 1, solid: false, approach: [6, 10], face: 'down', hitH: 4, interact: () => leaveMart() });
    const npcs = [
      { id: 'cashier', spr: 'c4', name: '점원', x: 10.5 * T, y: 7.45 * T, face: 'down', lines: ['어서오세요~ FRESH MART 입니다!', '오늘 딸기 할인해요 🍓', '계산 도와드릴게요!', '봉투 필요하세요?'] },
      { spr: 'c3', x: 4.5 * T, y: 6.5 * T, face: 'right', route: [[4, 6], [8, 6], [8, 3], [4, 3]], lines: ['오늘 저녁 뭐 해먹지…', '삼겹살 세일이네!'] },
      { spr: 'c6', x: 12.5 * T, y: 7.5 * T, face: 'left', route: [[12, 7], [12, 3], [8, 3], [8, 7]], lines: ['우유 어디 있지?', '장바구니 무거워~'] },
    ];
    return makeScene({
      key: 'mart', title: 'FRESH MART', w: W, h: H, viewW: 230, spawn: [6, 10, 'up'],
      isFloor: (x, y) => grid[y][x] !== '#', objects, npcs, dyn: F,
      lights: [{ gx: 4, gy: 4, r: 90, c: '235,248,255', a: 0.7, always: true }, { gx: 10, gy: 4, r: 90, c: '235,248,255', a: 0.7, always: true }, { gx: 7, gy: 9, r: 80, c: '235,248,255', a: 0.6, always: true }],
      paint(g, s) {
        paintWalls(g, grid, () => 'tile', { wall: () => '#f4faf8', base: '#13a89e', cap: '#ffffff' });
        // 뒤 벽 초록·파랑 띠 + 섹션 간판
        for (let x = 1; x < W - 1; x++) { sRect(g, 0.61, x, x + 1, 24, 27, '#13a89e'); sRect(g, 0.61, x, x + 1, 27, 29, '#0b7ac2'); }
        for (let y = 1; y < H - 1; y++) { eRect(g, 0.61, y, y + 1, 24, 27, '#109488'); eRect(g, 0.61, y, y + 1, 27, 29, '#0a6aab'); }
        // 바닥 가운데 통로 표시
        for (let y = 2; y < 11; y++) top(g, 8.2, y + 0.1, 0.2, 0.06, 0.8, 'rgba(19,168,158,.25)');
        s.labels = [];
        const name = (sec) => (MART ? (MART.find((m) => m.id === sec) || {}).name : '') || { meat: '정육', fish: '수산', dairy: '유제품·계란', drink: '음료', liquor: '주류', veg: '채소', fruit: '과일', pantry: '면·쌀·가공', season: '양념', snack: '간식·베이커리' }[sec];
        for (const f of F) if (f.sec) { const [lx, ly] = iso(f.x + f.w / 2, f.y + f.h / 2, f.kind === 'coolcase' ? 36 : 28); s.labels.push({ wx: lx, wy: ly, text: name(f.sec), bg: SECTION_LOOK[f.sec][0] === '#fdfdf8' ? '#f2c94c' : SECTION_LOOK[f.sec][0], fg: '#fff', max: 70, small: true }); }
        const [cx0, cy0] = iso(10.5, 8.5, 26); s.labels.push({ wx: cx0, wy: cy0, text: '계산대', bg: '#0b7ac2', fg: '#fff', max: 50, small: true });
        const [tx, ty] = iso(7, 0.6, WH + 6); s.labels.push({ wx: tx, wy: ty, text: 'FRESH MART', bg: 'transparent', fg: '#0b7ac2', max: 160 });
      },
    });
  }

  // ----- 3) 공동현관 로비 -----
  let lobbyOpen = false;
  function lobbyScene() {
    const rows = ['##########', '#ssssssss#', '#ssssssss#', '#ssssssss#', '#ssssssss#', '#ssssssss#', '#ssssssss#', 'GGGGddGGGG', '#ssssssss#', '#ssssssss#', '#ssssssss#', '####oo####'];
    const grid = rows.map((r) => r.split(''));
    grid[7][0] = '#'; grid[7][9] = '#';
    const isF = (x, y) => ['s', 'd', 'o'].includes(grid[y][x]);
    const dyn = [{ kind: 'plant', x: 8, y: 1, w: 1, h: 1 }, { kind: 'closet', x: 8, y: 4, w: 1, h: 2 }];
    return makeScene({
      key: 'lobby', title: '별빛 아침 오피스텔 · 1층', w: 10, h: 12, viewW: 260, spawn: [4, 10, 'up'],
      isFloor: isF, dyn,
      objects: [
        { x: 4, y: 7, w: 2, h: 1, solid: false, dynamicBlock: () => !lobbyOpen, approach: [4, 8], face: 'up', hitH: 14, interact: () => !lobbyOpen && goKeypad() },
        { x: 6, y: 7, approach: [6, 8], face: 'up', hitH: 20, interact: () => openKeypad('lobby') },
        { x: 1, y: 2, w: 1, h: 3, approach: [2, 3], face: 'left', hitH: 26, interact: () => say('우편함이에요. 406호 칸에 까치 소식이 있을지도!', [{ label: '우체통 열기', go: '/?view=hints' }]) },
        { x: 4, y: 0, w: 2, h: 1, approach: [4, 1], face: 'up', hitH: WH, interact: () => ride('up') },
        { x: 8, y: 1 }, { x: 8, y: 4, h: 2 },
        { x: 4, y: 11, w: 2, h: 1, solid: false, approach: [4, 10], face: 'down', hitH: 6, interact: () => goScene('street', [14, 31, 'left']) },
      ],
      lights: [{ gx: 5, gy: 4, r: 80, c: '255,245,220', a: 0.6 }],
      paint(g, s) {
        const pg = grid.map((r) => r.map((c) => (c === 'd' || c === 'o' ? 's' : c)));
        paintWalls(g, pg, () => 'stone', { wall: () => '#d8cfc2', base: '#8e8378' });
        // 엘리베이터 (북쪽 벽)
        sRect(g, 0.61, 4.05, 5.95, 0, 28, '#8e99a4'); sRect(g, 0.61, 4.15, 4.97, 0, 26, '#b8c1ca'); sRect(g, 0.61, 5.03, 5.85, 0, 26, '#b8c1ca'); sRect(g, 0.61, 4.7, 5.3, 29, 32, '#222');
        // 우편함 (서쪽 벽)
        eRect(g, 0.61, 2.05, 4.95, 4, 28, '#8e979f'); for (let j = 0; j < 3; j++) for (let k = 0; k < 4; k++) eRect(g, 0.61, 2.2 + j * 0.95, 2.95 + j * 0.95, 6 + k * 5.5, 10 + k * 5.5, '#c7ced6');
        // 키패드 단말
        box(g, 6.35, 7.3, 0, 0.3, 0.3, 14, '#1e2226'); sRect(g, 7.6, 6.37, 6.63, 10, 13, '#7ef0a0');
        // 매트
        top(g, 3.2, 9.2, 0.5, 3.6, 1.3, '#4f413b'); top(g, 3.35, 9.35, 0.6, 3.3, 1, '#665249');
        s.labels = [{ wx: iso(5, 0.6, WH + 4)[0], wy: iso(5, 0.6, WH + 4)[1], text: '엘리베이터', bg: '#3a3f46', fg: '#fff', max: 70, small: true }];
      },
      drawExtra(g) { // 유리 자동문
        const open = lobbyOpen ? 0.8 : 0;
        box(g, 4 - open, 7.4, 0, 1, 0.2, 14, '#b9dcec', { t: '#ffffff', s: 'rgba(160,205,225,.85)' });
        box(g, 5 + open, 7.4, 0, 1, 0.2, 14, '#b9dcec', { t: '#ffffff', s: 'rgba(160,205,225,.85)' });
      },
    });
  }

  // ----- 4) 4층 복도 -----
  function hallScene() {
    const W = 21, H = 7;
    const inside = (x, y) => (y >= 3 && y <= 4 && x >= 1 && x <= 19) || (x >= 8 && x <= 11 && y >= 1 && y <= 4);
    const grid = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (inside(x, y) ? 'c' : '#')));
    const doors = [[2, '401'], [4, '402'], [6, '403'], [13, '404'], [15, '405'], [18, '406']];
    const objects = [{ x: 9, y: 0, w: 2, h: 1, approach: [9, 1], face: 'up', hitH: WH, interact: () => ride('down') }];
    doors.forEach(([x, no]) => objects.push({ x, y: 2, approach: [x, 3], face: 'up', hitH: WH, interact: () => (no === '406' ? openKeypad('door') : say(`${no}호 이웃집이에요. 쉿!`)) }));
    return makeScene({
      key: 'hall', title: '4층 복도', w: W, h: H, viewW: 300, spawn: [9, 2, 'down'],
      isFloor: inside, objects, dyn: [{ kind: 'plant', x: 8, y: 1, w: 1, h: 1 }],
      lights: [{ gx: 10, gy: 3, r: 70, c: '255,245,220', a: 0.5 }, { gx: 4, gy: 3.5, r: 60, c: '255,245,220', a: 0.4 }, { gx: 16, gy: 3.5, r: 60, c: '255,245,220', a: 0.4 }],
      paint(g, s) {
        paintWalls(g, grid, () => 'carpet', { wall: () => '#efe8dc', base: '#b9ad9a' });
        sRect(g, 0.61, 9.05, 10.95, 0, 28, '#8e99a4'); sRect(g, 0.61, 9.15, 9.97, 0, 26, '#b8c1ca'); sRect(g, 0.61, 10.03, 10.85, 0, 26, '#b8c1ca');
        s.labels = [{ wx: iso(10, 0.6, 31)[0], wy: iso(10, 0.6, 31)[1], text: '4F', bg: '#22272c', fg: '#ff8a8a', max: 24, small: true }];
        doors.forEach(([x, no]) => {
          const ours = no === '406';
          sRect(g, 2.61, x + 0.15, x + 0.85, 0, 26, ours ? '#9e5a45' : '#6f5040'); sRect(g, 2.61, x + 0.2, x + 0.8, 1, 25, ours ? '#c47a60' : '#87624e');
          sRect(g, 2.61, x + 0.66, x + 0.74, 11, 16, ours ? '#222' : '#c9b28a'); if (ours) sRect(g, 2.61, x + 0.67, x + 0.73, 14, 15, '#7ef0a0');
          if (ours) { const px = 0.08, x0 = x + 0.22, z0 = 24.5, ph = 1.4; HEART.forEach((row, j) => { for (const m of row.matchAll(/X+/g)) sRect(g, 2.62, x0 + m.index * px, x0 + (m.index + m[0].length) * px, z0 - (j + 1) * ph, z0 - j * ph, '#ff4f72'); }); } // 우리 집 문 하트 (2D·3D 둘 다 보이게 면으로)
          const [lx, ly] = iso(x + 0.5, 2.61, 30);
          s.labels.push({ wx: lx, wy: ly, text: ours ? '406호 우리 집' : no, bg: ours ? '#ff6b81' : 'rgba(0,0,0,.5)', fg: '#fff', max: ours ? 70 : 30, small: true });
        });
      },
    });
  }

  // ----- 5) 406호 우리 집 -----
  let layout = {};
  const HOME_GRID = (() => {
    const W = 19, H = 16;
    const grid = Array.from({ length: H }, () => Array(W).fill('#'));
    const room = (x1, y1, x2, y2, c) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) grid[y][x] = c; };
    room(1, 1, 5, 12, 'w'); room(7, 1, 12, 12, 'w'); room(7, 10, 9, 13, 'k'); room(10, 13, 11, 14, 'e');
    room(14, 1, 17, 2, 'v'); room(14, 4, 17, 9, 'w'); room(13, 11, 17, 14, 'b');
    room(1, 10, 2, 10, '#'); room(3, 11, 3, 12, '#'); room(1, 11, 2, 12, 'b'); grid[11][3] = 'b';
    grid[6][6] = 'w'; grid[7][13] = 'w'; grid[3][15] = 'v'; grid[13][12] = 'b';
    grid[15][10] = 'D'; grid[15][11] = 'D';
    for (let x = 7; x <= 12; x++) grid[0][x] = 'W';
    for (let x = 14; x <= 17; x++) grid[0][x] = 'W';
    return grid;
  })();
  const FURNITURE = [
    { id: 'bed', x: 3, y: 1, w: 3, h: 3, kind: 'bed', ax: 1, ay: 3, face: 'up', move: true, name: '침대' },
    { id: 'vanity', x: 1, y: 7, w: 1, h: 2, kind: 'vanity', ax: 1, ay: 1, face: 'left', move: true, name: '화장대' },
    { id: 'closet', x: 5, y: 11, w: 1, h: 2, kind: 'closet', ax: -1, ay: 0, face: 'right', move: true, name: '서랍장' },
    { id: 'plant1', x: 1, y: 1, w: 1, h: 1, kind: 'plant', move: true, name: '화분' },
    { id: 'toiletA', x: 1, y: 12, w: 1, h: 1, kind: 'toilet' }, { id: 'sinkA', x: 1, y: 11, w: 1, h: 1, kind: 'sink' },
    { id: 'rug2', x: 3, y: 6, w: 2, h: 2, kind: 'rug2', solid: false, move: true, name: '러그' },
    { id: 'calendar', x: 2, y: 0, w: 1, h: 1, kind: 'calendar', wall: true, ax: 0, ay: 1, face: 'up' },
    { id: 'tv', x: 7, y: 3, w: 1, h: 3, kind: 'tv', ax: 1, ay: 1, face: 'left', move: true, name: 'TV' },
    { id: 'rug', x: 9, y: 3, w: 2, h: 3, kind: 'rug', solid: false, move: true, name: '러그' },
    { id: 'gtable', x: 10, y: 3, w: 1, h: 3, kind: 'glasstable', move: true, name: '유리 탁자' },
    { id: 'sofa', x: 12, y: 3, w: 1, h: 3, kind: 'sofa', ax: -1, ay: 1, face: 'right', move: true, name: '소파' },
    { id: 'guitar', x: 12, y: 2, w: 1, h: 1, kind: 'guitar', ax: -1, ay: 0, face: 'right', move: true, name: '기타' },
    { id: 'plant2', x: 7, y: 1, w: 1, h: 1, kind: 'plant', move: true, name: '화분' },
    { id: 'shelfL', x: 9, y: 1, w: 2, h: 1, kind: 'bookshelf', move: true, name: '책장' },
    { id: 'fridge', x: 9, y: 13, w: 1, h: 1, kind: 'fridge', ax: 0, ay: -1, face: 'down' },
    { id: 'induction', x: 8, y: 13, w: 1, h: 1, kind: 'induction', ax: 0, ay: -1, face: 'down' },
    { id: 'sinkK', x: 7, y: 13, w: 1, h: 1, kind: 'sinkK', ax: 0, ay: -1, face: 'down' },
    { id: 'table', x: 8, y: 10, w: 1, h: 2, kind: 'table', ax: 0, ay: 2, face: 'up', move: true, name: '식탁' },
    { id: 'chairK1', x: 7, y: 10, w: 1, h: 1, kind: 'clearchair', move: true, name: '투명 의자' },
    { id: 'chairK2', x: 9, y: 10, w: 1, h: 1, kind: 'clearchair', r: 2, move: true, name: '투명 의자' },
    { id: 'deskA', x: 17, y: 4, w: 1, h: 2, kind: 'desk', ax: -1, ay: 0, face: 'right', move: true, name: '컴퓨터 책상' },
    { id: 'deskB', x: 17, y: 6, w: 1, h: 2, kind: 'desk', ax: -1, ay: 1, face: 'right', move: true, name: '컴퓨터 책상' },
    { id: 'wardrobe', x: 14, y: 9, w: 3, h: 1, kind: 'wardrobe', ax: 1, ay: -1, face: 'down', move: true, name: '장롱' },
    { id: 'chair', x: 16, y: 1, w: 1, h: 1, kind: 'chair', ax: 0, ay: 1, face: 'up', move: true, name: '의자' },
    { id: 'washer', x: 17, y: 1, w: 1, h: 2, kind: 'washer' },
    { id: 'plant3', x: 14, y: 1, w: 1, h: 1, kind: 'plant', move: true, name: '화분' },
    { id: 'tub', x: 14, y: 11, w: 4, h: 1, kind: 'tub' }, { id: 'toiletB', x: 17, y: 13, w: 1, h: 1, kind: 'toilet' }, { id: 'sinkB', x: 17, y: 14, w: 1, h: 1, kind: 'sink' },
    { id: 'shoes', x: 11, y: 14, w: 1, h: 1, kind: 'shoes' },
    { id: 'floorlamp', x: 11, y: 1, w: 1, h: 1, kind: 'floorlamp', ax: 0, ay: 1, face: 'up', move: true, name: '스탠드 조명' },
    { id: 'monstera', x: 12, y: 9, w: 1, h: 1, kind: 'monstera', move: true, name: '몬스테라' },
    { id: 'lampA', x: 2, y: 1, w: 1, h: 1, kind: 'moodlamp', ax: 0, ay: 1, face: 'up', move: true, name: '큰방 무드등' },
    { id: 'lampB', x: 8, y: 1, w: 1, h: 1, kind: 'moodlamp', ax: 0, ay: 1, face: 'up', move: true, name: '거실 무드등' },
    { id: 'lampC', x: 14, y: 4, w: 1, h: 1, kind: 'moodlamp', ax: 1, ay: 0, face: 'left', move: true, name: '작은방 무드등' },
    { id: 'pethouse', x: 12, y: 6, w: 1, h: 1, kind: 'pethouse', ax: -1, ay: 0, face: 'right', move: true, name: '펫 집' },
  ];
  const LAMP_COL = [['꺼짐', '0,0,0', '#d9d4ca'], ['노란', '255,214,120', '#ffd878'], ['분홍', '255,140,190', '#ff9ccb'], ['파란', '120,170,255', '#8fb6ff'], ['보라', '190,140,255', '#c39cff']];
  const ACTIONS = {
    bed: (f) => lieDown(f),
    vanity: () => say('화장대 거울: 오늘도 예쁘고 멋있어요!'),
    closet: () => say('서랍장: 차곡차곡 개어둔 옷들.'),
    calendar: () => say('달력: 이달의 낭만 리스트!', [{ label: '낭만 리스트 열기', go: `/?view=romance&day=${todayStr()}` }]),
    tv: () => toggleTv(),
    sofa: (f) => sitDown(f),
    guitar: (f) => playGuitar(f),
    fridge: () => say('냉장고예요. 뭘 볼까요?', [{ label: '🧊 냉장고 보기', fn: () => openFridge() }, { label: `📌 사진 보드 보기${photos.length ? ` (${photos.length})` : ''}`, fn: () => openPhotoBoard() }]),
    induction: () => say('인덕션이에요. 뭐 해 먹을까?', [{ label: '🍳 요리하기', fn: () => openCook() }, { label: '🧊 냉장고 보기', fn: () => openFridge() }]),
    sinkK: () => say('설거지는 같이 하기!'),
    table: () => atTable(() => { fx.bubbles[me] = { text: '식탁에 앉았어요~ 뭐 먹을까?', until: Date.now() + 2600 }; buddySays('나도 옆에 앉을래!'); say('식탁에 앉았어요.', [{ label: '🧊 냉장고에서 꺼내 먹기', fn: () => openFridge() }, { label: '🍳 요리하기', fn: () => { standUp(); goCook(); } }]); }),
    desk: (f) => say(f.id === 'deskA' ? '컴퓨터 1: 의결서를 쓰러 가볼까요?' : '컴퓨터 2: 같이 게임 한 판?', f.id === 'deskA' ? [{ label: '의결서 쓰기', go: '/?view=agenda' }] : []),
    wardrobe: () => openWardrobe(),
    floorlamp: () => { const on = !townSt.lights; townSt.lights = on; beep(on ? 880 : 440, 0.05); stateOp({ op: 'lights', on }); say(on ? '불을 켰어요 💡 집이 환해졌어요' : sky().dark > 0.3 ? '불을 껐어요. 깜깜해요 🌙' : '불을 껐어요. 낮이라 햇살로 충분해요 ☀️'); },
    pethouse: () => (townSt.pet ? openPet() : (townSt.petGone || []).length ? showPetGone(true) : say('펫 집이에요. 곧 알이 도착할 거예요!')),
    speaker: () => openSpeaker(),
    moodlamp: (f) => { const cur = (townSt.lamps || {})[f.id] || 0, nx = (cur + 1) % LAMP_COL.length; townSt.lamps = { ...(townSt.lamps || {}), [f.id]: nx }; beep(nx ? 660 + nx * 110 : 330, 0.06); stateOp({ op: 'lamp', id: f.id, mode: nx }); toast(nx ? `${f.name} ${LAMP_COL[nx][0]} 불빛 ✨` : `${f.name}을 껐어요`); if (nx) buddySays('분위기 좋다~ 💕'); },
    chair: (f) => say('담배를 한 대 필까요?', [{ label: '한 대 피기 🚬', fn: () => smoke(f) }, { label: '그냥 앉기', fn: () => sitChair(f) }]),
  };
  function homeScene() {
    const grid = HOME_GRID, W = grid[0].length, H = grid.length;
    const F = [];
    for (const base of FURNITURE) {
      const L = base.move ? layout[base.id] || {} : {};
      if (L.inv) continue; // 인벤토리에 넣은 가구
      const rot = ((L.r ?? base.r ?? 0) % 4 + 4) % 4;
      const f = { ...base, x: L.x ?? base.x, y: L.y ?? base.y, rot, w0: base.w, h0: base.h, w: rot % 2 ? base.h : base.w, h: rot % 2 ? base.w : base.h };
      if (base.face) { const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[base.face]; const [dx, dy] = rotVec(rot, v[0], v[1]); f.face = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'; }
      F.push(f);
    }
    const gt = F.find((f) => f.kind === 'glasstable'); // 블루투스 스피커: 거실 유리 탁자 위 (탁자를 옮기면 같이)
    if (gt) F.push({ id: 'speaker', kind: 'speaker', x: gt.x, y: gt.y + Math.floor((gt.h - 1) / 2), w: 1, h: 1, w0: 1, h0: 1, rot: 0, solid: false, onTable: true, ax: -1, ay: 0, face: 'right', name: '블루투스 스피커' });
    const localPt = (f, lx, ly) => rotPt({ f, r: f.rot, W0: f.w0, D0: f.h0 }, f.x + lx, f.y + ly);
    const objects = F.map((f) => ({
      ...f, solid: f.solid !== false && !f.wall, furn: f,
      approach: f.ax != null ? localPt(f, f.ax + 0.5, f.ay + 0.5).map(Math.floor) : null,
      interact: ACTIONS[f.kind] ? () => ACTIONS[f.kind](f) : null,
      hitH: { speaker: 18, floorlamp: 30, moodlamp: 16, pethouse: 14, bed: 20, sofa: 16, tv: 26, fridge: 28, wardrobe: 30, bookshelf: 24, desk: 20, guitar: 26, plant: 18, calendar: 30 }[f.kind] || 12,
    }));
    objects.push({ x: 10, y: 15, w: 2, h: 1, solid: false, approach: [10, 14], face: 'down', hitH: 6, interact: () => goScene('hall', [18, 3, 'down']) });
    const L = (gx, gy, text) => { const [wx, wy] = iso(gx, gy, 2); return { wx, wy, text, bg: 'rgba(255,255,255,.8)', fg: '#7a5a5a', max: 60, small: true }; };
    return makeScene({
      key: 'home', title: '406호 우리 집', w: W, h: H, viewW: 300, spawn: [10, 14, 'up'],
      isFloor: (x, y) => !['#', 'D', 'W'].includes(grid[y][x]), objects, furniture: F,
      dyn: F.filter((f) => !['rug', 'rug2', 'calendar'].includes(f.kind)).concat(F.some((f) => f.kind === 'table') ? [{ kind: 'pendant', x: F.find((f) => f.kind === 'table').x, y: F.find((f) => f.kind === 'table').y, w: 1, h: 2, color: '#f4f4f0' }] : []),
      lights: [{ gx: 3, gy: 6, r: 80, c: '255,236,200', a: 0.6 }, { gx: 10, gy: 6, r: 100, c: '255,236,200', a: 0.65 }, { gx: 15.5, gy: 6.5, r: 70, c: '255,236,200', a: 0.5 }, { gx: 8, gy: 12, r: 60, c: '255,236,200', a: 0.5 }, { gx: 15, gy: 13, r: 60, c: '235,245,255', a: 0.5 }],
      paint(g, s) {
        paintWalls(g, grid, (c) => ({ w: 'marble', k: 'marble', b: 'bath', v: 'deck', e: 'entry' }[c] || 'marble'), {
          wall: (f) => (f === 'b' ? '#e3e8ec' : '#e4e6e9'), base: '#b4b8be', cap: '#f8f9fa', // 밝은 그레이 모노톤 벽지
        });
        F.filter((f) => ['rug', 'rug2', 'calendar'].includes(f.kind)).forEach((f) => drawFurniture(g, f));
        // 거실 · 작은방 통창 커튼 (주름)
        for (const [c0, c1] of [[6.95, 7.35], [12.6, 13.0], [13.95, 14.3], [17.7, 18.05]]) { sRect(g, 0.61, c0, c1, 3, 31, '#eef0f2'); for (let k = c0 + 0.08; k < c1; k += 0.12) sRect(g, 0.61, k, k + 0.03, 3, 31, '#d9dde1'); }
        sRect(g, 0.61, 6.9, 13.05, 31, 32, '#b4b8be'); sRect(g, 0.61, 13.9, 18.1, 31, 32, '#b4b8be');
        // 침대 위 사진 줄 (폴라로이드 + 하트)
        { g.strokeStyle = '#8a7a6a'; g.lineWidth = 0.4; const a = iso(2.9, 0.61, 29), b = iso(5.6, 0.61, 29); g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 3, b[0], b[1]); g.stroke();
          [[3.2, '#ffd1dc'], [3.8, '#cfe8ff'], [4.4, '#fff3c4'], [5.0, '#d8f5d0']].forEach(([px0, c], i) => { const zz = 27.6 - Math.sin((px0 - 2.9) / 2.7 * Math.PI) * 1.4; sRect(g, 0.61, px0, px0 + 0.42, zz - 6, zz, '#ffffff'); sRect(g, 0.61, px0 + 0.05, px0 + 0.37, zz - 4.6, zz - 0.5, c); const [hx, hy] = iso(px0 + 0.21, 0.61, zz - 2.6); if (i % 2 === 0) { R2(g, hx - 1, hy, 0.8, 0.8, '#ff6b81'); R2(g, hx + 0.2, hy, 0.8, 0.8, '#ff6b81'); R2(g, hx - 0.6, hy + 0.7, 1.2, 0.8, '#ff6b81'); } }); }
        s.labels = [L(3, 5, '큰방'), L(10, 7.5, '거실'), L(8.5, 11.5, '주방'), L(15.5, 6.5, '작은방'), L(15.5, 1.8, '베란다'), L(15, 13, '화장실'), L(11, 14.5, '현관')];
      },
    });
  }

  // =====================================================================
  // 상태 · 이동
  // =====================================================================
  let scene, player, path = [], pending = null, cam = { x: 0, y: 0 }, tapMark = null, busy = false;
  const fx = { hearts: [], notes: [], puffs: [], bubbles: {} };
  let anim = null; // { type: 'hug'|'kiss', start, until }
  let editing = null;
  let hits = []; // 이번 프레임에 그린 것들의 화면 영역 (터치 판정)

  function place(s, [x, y, face]) {
    const wasRide = player && (player.ride || player.pillion) && !OUTSIDE.has(s.key);
    if (wasRide) setTimeout(() => toast('탈것은 밖에 세워두고 들어왔어요'), 900);
    const keepRide = player && OUTSIDE.has(s.key) && scene && OUTSIDE.has(scene.key) ? player.ride : null; // 바깥끼리는 타고 이동
    scene = s;
    player = { x: x * T + T / 2, y: y * T + T / 2, face: face || 'down', step: 0, moving: false, pose: '', smoke: 0, ride: keepRide, pillion: false };
    buddy.pillion = false; setTimeout(updateRideBtn, 0);
    if (s.key !== 'street' && fv.target > 0) { fv.t = 0; fv.target = 0; setTimeout(updateViewBtn, 0); }
    path = []; pending = null; fx.puffs = []; fx.hearts = []; fx.notes = []; anim = null;
    if (myGuitarUntil) { myGuitarUntil = 0; fx.bubbles[me] = null; if (songStop) songStop(); }
    document.getElementById('invBtn').hidden = false; document.getElementById('invPanel').hidden = true; renderInv(); // 가방은 어디서든
    document.getElementById('sceneTitle').textContent = s.title;
    closeSay(); endEdit(false); camOff.x = camOff.y = 0; zoom = 0.85; resize(); updateCamBtn(); toast(s.title); syncSoon(); // 장면이 바뀌면 살짝 넓게 보이며 시작
    // 상대가 오프라인이면: 손잡고 있으면 같이 옮겨 오고, 집에 오면 마중 나옴
    buddy.trail = []; buddy.target = null; buddy.greeting = false; buddy.pose = '';
    if (other.online) { buddy.on = false; buddy.hold = false; }
    else if (buddy.hold) { buddy.on = true; buddy.scene = s.key; const sp = nearestWalkable(Math.floor(player.x / T) + 1, Math.floor(player.y / T)) || ptile(); buddy.x = sp[0] * T + 8; buddy.y = sp[1] * T + 8; }
    if (s.key === 'home') setTimeout(ensurePet, 800);
    if (s.key === 'home' && sky().dark > 0.4 && !townSt.lights) setTimeout(() => toast('깜깜해요 🌙 거실 스탠드 조명을 누르면 불이 켜져요'), 2600);
    if (s.key === 'home' && !other.online && !buddy.hold) { buddy.on = true; buddy.scene = 'home'; buddy.x = 11 * T; buddy.y = 9.5 * T; buddy.face = 'down'; setTimeout(() => greetRun(s), 450); }
  }
  // ===== buddy: 상대가 오프라인일 때 집에 있는 상대 캐릭터 =====
  const buddy = { on: false, scene: '', x: 0, y: 0, face: 'down', walking: false, step: 0, hold: false, target: null, trail: [], bubble: null, greeting: false };
  const buddyHere = () => buddy.on && !other.online && scene && buddy.scene === scene.key;
  const BUDDY_LINES = ['어서 와~ 보고 싶었어 💕', '오늘 하루 고생 많았어!', '밥은 먹었어?', '손 잡고 산책 갈래?', '안아줘!', '오늘도 수고했어 우리 강아지', '히히 좋아~'];
  function greetRun(s) { // "보고 싶었어!" 하고 달려와서 안기 → 뽀뽀 → 안고 한 바퀴
    if (scene !== s || !buddyHere() || buddy.hold) return;
    buddy.bubble = { text: '보고 싶었어!! 💕', until: Date.now() + 2200 };
    toast(`${names[partner]}가 보고 싶었다며 달려와요 💕`);
    buddy.greeting = true;
    buddy.target = [player.x + 11, player.y - 3];
  }
  function startBuddyAnim(type) {
    anim = { type, with: 'buddy', start: performance.now(), until: performance.now() + (type === 'greet' ? 6400 : 3800) };
    const burst = () => { OX = scene.ox; OY = scene.oy; const [ax, ay] = iso(player.x / T, player.y / T), [bx, by] = iso(buddy.x / T, buddy.y / T); for (let i = 0; i < 7; i++) fx.hearts.push({ x: (ax + bx) / 2 - 8 + Math.random() * 16, y: Math.min(ay, by) - 30 + Math.random() * 6, t: 1.2 + Math.random() * 1.2, life: 2.4, s: Math.random() * 6 }); };
    if (type === 'greet') { setTimeout(burst, 500); setTimeout(burst, 1900); setTimeout(burst, 3400); melody([784, 988, 1175]); setTimeout(() => melody([1047, 1319, 1568]), 1600); setTimeout(() => melody([784, 988, 1175, 1568, 1319, 1568]), 3000); }
    else if (type === 'bite') biteFx('buddy');
    else { setTimeout(burst, type === 'kiss' ? 700 : 500); melody(type === 'kiss' ? [1047, 1319, 1568] : [784, 988, 1175, 1568]); }
  }
  // 앙 깨물기: "앙!" → 상대 "아야!" 하고 파르르 → 이빨 자국
  function biteFx(target, mine = true) {
    const meSays = (t) => (fx.bubbles[me] = { text: t, until: Date.now() + 1600 });
    const themSay = (t) => { if (target === 'buddy') buddy.bubble = { text: t, until: Date.now() + 1800 }; else fx.bubbles[partner] = { text: t, until: Date.now() + 1800 }; };
    const biter = mine ? meSays : themSay, bitten = mine ? themSay : meSays;
    setTimeout(() => { biter('앙! 🦷'); melody([660, 520]); }, 500);
    setTimeout(() => { bitten(['아야! 😣', '앗 깨물었어?!', '으앙 아파~ 🥺', '히잉 이빨자국 났잖아!'][Math.floor(Math.random() * 4)]); beep(330, 0.08); }, 1000);
    setTimeout(() => { if (target === 'buddy') buddySays('나도 깨물 거야! 앙!'); }, 2600);
  }
  // ---------- 감정 표현: 신남 · 화남 · 우울 … (상대가 있으면 상대를 보고) ----------
  const EMOTES = {
    happy: { ico: 'happy', label: '신남', icon: '🤩', line: '신난다~!! 🎉', buddy: '나도 덩달아 신나! 🎶' },
    angry: { ico: 'angry', label: '화남', icon: '😤', line: '흥! 화났어 💢', buddy: '헉 화났어? 미안해ㅠㅠ 안아줄게' },
    sad: { ico: 'sad', label: '우울', icon: '😢', line: '오늘 좀 우울해…', buddy: '괜찮아… 내가 옆에 있을게 🫂' },
    shy: { ico: 'shy', label: '부끄', icon: '☺️', line: '아잉 부끄러워…', buddy: '뭐야 귀여워 ㅎㅎ' },
    love: { ico: 'love', label: '사랑', icon: '🥰', line: '사랑해 💕', buddy: '나도 사랑해!! 💗' },
    surprise: { ico: 'surprise', label: '놀람', icon: '😲', line: '헉! 진짜?!', buddy: '왜왜 무슨 일이야?!' },
    sulk: { ico: 'sulk', label: '삐짐', icon: '😒', line: '흥, 삐졌어', buddy: '삐졌어? 맛있는 거 사줄게~' },
    sleepy: { ico: 'sleepy', label: '졸림', icon: '😪', line: '졸려… 하암', buddy: '같이 코 자자 🌙' },
  };
  // 😊 버튼: 감정 표현 + 🎒 인벤토리 (재료 · 레시피 노트 · 옷 · 가구 · 탈것 · 포인트)
  let invSec = 'food', recipeCache = null;
  function openEmotes(tab = 'emote') {
    const m = document.getElementById('modal');
    const who = other.visible ? names[partner] : buddyHere() ? names[partner] : '';
    const head = `<div class="inv-tabs"><button type="button" data-t="emote" class="${tab === 'emote' ? 'on' : ''}">😊 감정 표현</button><button type="button" data-t="inv" class="${tab === 'inv' ? 'on' : ''}">🎒 인벤토리</button></div>`;
    const body = tab === 'emote'
      ? `<b class="wd-title">감정 표현${who ? ` · ${esc(who)}에게` : ''}</b><div class="emote-grid">${Object.entries(EMOTES).map(([k, e]) => `<button type="button" data-e="${k}"><i>${TOWN_ICONS.img(e.ico)}</i>${e.label}</button>`).join('')}</div>`
      : invHtml();
    m.innerHTML = `<div class="card emote-card inv-card">${head}${body}<button type="button" class="btn ghost" id="modalClose">닫기</button></div>`;
    m.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => openEmotes(b.dataset.t)));
    m.querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => { m.hidden = true; doEmote(b.dataset.e); }));
    m.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { invSec = b.dataset.s; openEmotes('inv'); }));
    m.querySelectorAll('[data-cook]').forEach((b) => (b.onclick = () => { if (scene.key === 'home' && b.dataset.ready === '1') { m.hidden = true; goCook(b.dataset.cook); } else openRecipeCook(b.dataset.cook); })); // 재료 보기는 그 자리에서 바로
    m.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => { m.hidden = true; changeOutfit(b.dataset.o); }));
    m.querySelectorAll('[data-take]').forEach((b) => (b.onclick = () => { m.hidden = true; if (scene.key !== 'home') return toast('가구는 집에서 꺼낼 수 있어요 🏠'); takeOut(b.dataset.take); }));
    const ph = m.querySelector('[data-photos]'); if (ph) ph.onclick = () => { m.hidden = true; openPhotoBoard(); };
    m.querySelector('#modalClose').onclick = () => (m.hidden = true);
    m.hidden = false;
    if (tab === 'inv' && invSec === 'recipe' && !recipeCache) fetch('/api/recipes', { cache: 'no-store' }).then((r) => r.json()).then((d) => { recipeCache = d.recipes || []; if (!m.hidden && m.querySelector('.inv-tabs')) openEmotes('inv'); }).catch(() => { recipeCache = []; });
  }
  function invHtml() {
    const secs = [['food', '🧊 재료'], ['recipe', '📒 레시피 노트'], ['wear', '👕 옷'], ['furn', '🛋️ 가구'], ['etc', '🎒 기타']];
    let html = `<div class="inv-secs">${secs.map(([k, l]) => `<button type="button" data-s="${k}" class="${invSec === k ? 'on' : ''}">${l}</button>`).join('')}</div><div class="inv-body">`;
    if (invSec === 'food') {
      const have = Object.entries(townSt.fridge || {}).filter(([id, n]) => n > 0 && ITEMS[id]);
      html += have.length ? `<div class="fr-items">${have.map(([id, n]) => `<span><i>${ITEMS[id].icon}</i>${esc(ITEMS[id].name)}<b>${n}</b></span>`).join('')}</div><p class="inv-note">냉장고에 있는 재료예요 (둘이 같이 써요)</p>` : '<p class="empty">재료가 없어요. FRESH MART에서 장 봐 와요! 🛒</p>';
    } else if (invSec === 'recipe') {
      if (!recipeCache) html += '<p class="empty">레시피 노트를 펼치는 중… 📖</p>';
      else if (!recipeCache.length) html += '<p class="empty">레시피 노트가 비었어요.</p>';
      else html += `<div class="inv-recipes">${recipeCache.map((r) => { const { need } = matchIngredients(r.ingredients); const ok = need.filter((n) => (townSt.fridge[n.id] || 0) > 0).length; return `<div class="inv-recipe">${r.image_thumb || r.image_url ? `<img src="${esc(r.image_thumb || r.image_url)}" alt="">` : '<i>🍽️</i>'}<span><b>${esc(r.title)}</b><small>${need.length ? `재료 ${ok}/${need.length} 있음` : r.ingredients == null ? '눌러서 재료 확인' : '마트 재료 없음'}</small></span><button type="button" data-cook="${esc(r.id)}" data-ready="${need.length && ok === need.length ? 1 : 0}">${need.length && ok === need.length ? '🍳 요리' : '재료 보기'}</button></div>`; }).join('')}</div>`;
    } else if (invSec === 'wear') {
      html += `<div class="wd-grid">${TOWN_SPRITES.OUTFITS[me].map((o) => `<button type="button" class="wd-item${o.id === outfit[me] ? ' on' : ''}" data-o="${o.id}"><span>${o.id === outfit[me] ? '✅ ' : ''}${esc(o.name)}</span></button>`).join('')}</div>${player.ride === 'm' || player.pillion ? '<p class="inv-note">⛑️ 노란 헬멧 쓰는 중</p>' : ''}`;
    } else if (invSec === 'furn') {
      const stored = FURNITURE.filter((f) => layout[f.id]?.inv);
      html += stored.length ? `<div class="inv-furn">${stored.map((f) => `<button type="button" data-take="${f.id}"><i>${INV_ICON[f.kind] || '📦'}</i>${esc(f.name || f.kind)}<small>꺼내기</small></button>`).join('')}</div>` : '<p class="empty">보관 중인 가구가 없어요. 집에서 가구를 꾹 눌러 넣을 수 있어요.</p>';
    } else {
      const P = townSt.pet;
      html += `<ul class="inv-etc">
        ${me === 'girl' ? `<li><i>💳</i>FRESH MART 포인트<b>${myPoints().toLocaleString('ko-KR')}P</b></li>` : '<li><i>💳</i>FRESH MART<b>와이프 번호로 결제</b></li>'}
        <li><i>${player.ride === 'm' ? '🛵' : player.ride ? '🚲' : player.pillion ? '🛵' : '🚶'}</i>탈것<b>${player.ride === 'm' ? '노란 오토바이 타는 중' : player.ride ? '공유 자전거 타는 중' : player.pillion ? '오토바이 뒤에 타는 중' : '걸어 다니는 중'}</b></li>
        ${P ? `<li><i>🥚</i>${esc(P.name || PET_FORM[P.form])}<b>친밀감 💗 ${P.intimacy}</b></li>` : ''}
        <li><i>📌</i>냉장고 사진 보드<button type="button" data-photos>열기</button></li>
      </ul>`;
    }
    return html + '</div>';
  }
  function faceToward(x, y) { const dx = x - player.x, dy = y - player.y; player.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
  function doEmote(e) {
    const E = EMOTES[e]; if (!E) return;
    const tgt = other.visible ? other : buddyHere() ? buddy : null;
    if (tgt) faceToward(tgt.x, tgt.y);
    if (tgt && e === 'sulk') player.face = { left: 'right', right: 'left', up: 'down', down: 'up' }[player.face]; // 삐지면 고개 홱
    player.emote = { e, start: performance.now(), until: performance.now() + 4200 };
    fx.bubbles[me] = { text: E.line, until: Date.now() + 3200 };
    emoteSound(e); sendAct({ type: 'emote', e });
    if (buddyHere()) setTimeout(() => { buddySays(E.buddy); if (e === 'angry' || e === 'sad') setTimeout(() => approachBuddy('hug'), 900); }, 1200);
  }
  function emoteSound(e) { const m = { happy: [784, 988, 1175, 1568], angry: [220, 196], sad: [523, 440, 392], shy: [1047, 1175], love: [1047, 1319, 1568], surprise: [880, 1320], sulk: [392, 330], sleepy: [440, 392, 349] }[e]; if (m) melody(m); }
  function tapBuddy() {
    say(`${names[partner]}에게 뭘 할까요?`, [
      { label: buddy.hold ? '손 놓기 👋' : '손잡기 🤝', fn: () => { buddy.hold = !buddy.hold; if (!buddy.hold) buddy.pose = ''; buddy.trail = []; say(buddy.hold ? '손을 꼭 잡았어요! 어디든 같이 가요 💕' : '손을 놓았어요. 여기서 기다릴게!'); beep(buddy.hold ? 880 : 520, 0.06); } },
      ...(player.ride === 'm' ? [{ label: buddy.pillion ? '내려주기' : '뒤에 태우기 🛵', fn: () => { buddy.pillion = !buddy.pillion; buddy.hold = false; buddySays(buddy.pillion ? '꺄 신난다! 꽉 잡을게 💕' : '재밌었어!'); } }] : []),
      { label: '안아주기 🤗', fn: () => approachBuddy('hug') },
      { label: '뽀뽀 💋', fn: () => approachBuddy('kiss') },
      { label: '깨물기 😬', fn: () => approachBuddy('bite') },
      { label: '감정 😊', fn: () => openEmotes() },
    ]);
  }
  function approachBuddy(type) {
    const tx = Math.floor(buddy.x / T), ty = Math.floor(buddy.y / T), [px, py] = ptile();
    if (Math.abs(px - tx) + Math.abs(py - ty) <= 1) return startBuddyAnim(type);
    const spots = [[tx - 1, ty], [tx + 1, ty], [tx, ty + 1], [tx, ty - 1]].filter(([x, y]) => walkable(scene, x, y));
    spots.sort((a, b) => Math.abs(a[0] - px) + Math.abs(a[1] - py) - (Math.abs(b[0] - px) + Math.abs(b[1] - py)));
    if (!spots.length) return startBuddyAnim(type);
    walkTo(spots[0][0], spots[0][1], () => startBuddyAnim(type));
  }
  function goScene(key, at) {
    if (busy) return;
    fade(() => { if (key === 'street') lobbyOpen = false; place(scenes[key], at || scenes[key].spawn); });
  }
  function bfs(sx, sy, tx, ty) {
    const key = (x, y) => y * 1000 + x;
    const prev = new Map([[key(sx, sy), null]]);
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) { const out = []; let k = key(x, y); while (k !== null && k !== key(sx, sy)) { out.unshift([k % 1000, Math.floor(k / 1000)]); k = prev.get(k); } return out; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = key(nx, ny); if (!prev.has(nk) && walkable(scene, nx, ny)) { prev.set(nk, key(x, y)); q.push([nx, ny]); } }
    }
    return null;
  }
  function nearestWalkable(tx, ty) {
    for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.abs(dx) + Math.abs(dy) !== r) continue; if (walkable(scene, tx + dx, ty + dy)) return [tx + dx, ty + dy]; }
    return null;
  }
  const ptile = () => [Math.floor(player.x / T), Math.floor(player.y / T)];
  // 공동현관 유리 자동문: 안(엘리베이터 쪽)에서 나갈 때는 비밀번호 없이 저절로 열림
  // 잠긴 유리문 너머로 가려 하면: 키패드 앞으로 가서 비밀번호 창
  function goKeypad() { const o = scene.objects.find((ob) => ob.x === 6 && ob.y === 7 && ob.interact); if (o) useObject(o); }
  const lockedAhead = (ty) => scene && scene.key === 'lobby' && !lobbyOpen && player.y / T > 7 && ty <= 7;
  // 입구(출구) 밖을 누르면 그 문으로 나가기: 장면 바깥·벽 쪽을 누른 곳에서 가까운 출구
  function exitNear(gx, gy) {
    if (!scene || OUTSIDE.has(scene.key)) return null;
    const inside = gx >= 0 && gy >= 0 && gx < scene.w && gy < scene.h && scene.isFloor(Math.floor(gx), Math.floor(gy));
    if (inside) return null;
    let best = null, bd = 3.6;
    for (const o of scene.objects) {
      if (!o.interact || o.solid !== false) continue;
      const cx = o.x + (o.w || 1) / 2, cy = o.y + (o.h || 1) / 2, d = Math.hypot(gx - cx, gy - cy);
      const bottom = o.y + (o.h || 1) >= scene.h - 1, topE = o.y <= 0, left = o.x <= 0, right = o.x + (o.w || 1) >= scene.w - 1; // 가장자리 문만
      const beyond = (bottom && gy >= o.y) || (topE && gy < o.y + (o.h || 1)) || (left && gx < o.x + (o.w || 1)) || (right && gx >= o.x); // 문 선 너머(바깥)를 눌렀을 때만
      if ((bottom || topE || left || right) && beyond && d < bd) { bd = d; best = o; }
    }
    return best;
  }
  function lobbyAutoOpen() { if (scene && scene.key === 'lobby' && !lobbyOpen && player.y / T < 7) { lobbyOpen = true; toast('자동문이 스르륵 열렸어요'); beep(660, 0.05); } }
  function walkTo(tx, ty, then) {
    if (player.pose) standUp();
    lobbyAutoOpen();
    const [sx, sy] = ptile();
    const p = bfs(sx, sy, tx, ty);
    if (!p) { pending = null; return false; }
    path = p; pending = then || null;
    if (!p.length && then) { pending = null; then(); }
    return true;
  }

  // ---------- 입력: 탭 / 꾹 ----------
  let press = null;
  function toScene(e) { const r = cv.getBoundingClientRect(); const yc = (e.clientY - r.top) * (cv.height / r.height), y0 = fv.anchor + (yc - fv.anchor) / (fv.sy || 1); return [(e.clientX - r.left) * (cv.width / r.width) / view.scale + cam.x, y0 / view.scale + cam.y]; }
  const toGrid = (sx, sy) => { const a = (sx - scene.ox) / 16, b = (sy - scene.oy) / 8; return [(a + b) / 2, (b - a) / 2]; };
  function hitAt(sx, sy) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; const [x0, y0, x1, y1] = h.box; if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) return h; } return null; }
  // 한 손가락: 탭(걷기) · 꾹(가구) · 쓸기(시야 이동) / 두 손가락: 벌리고 오므려 확대·축소 / 휠: 확대
  const pts = new Map(); let pinch = null;
  const cssToBuf = () => { const r = cv.getBoundingClientRect(); return (cv.width / r.width) / view.scale; };
  const midOf = () => { const a = [...pts.values()]; return [(a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)]; };
  function startPinch() {
    if (press) { clearTimeout(press.timer); press = null; }
    const [mx, my, d] = midOf(), [sx, sy] = toScene({ clientX: mx, clientY: my });
    pinch = { sx, sy, d: Math.max(20, d), d0: d, my0: my, z: zoom, fz: fv.zoom, t0: fv.t, mode: '' };
  }
  cv.addEventListener('pointerdown', (e) => {
    if (window.T3D && window.T3D.ready) return;
    if (busy || !document.getElementById('modal').hidden) return;
    audio();
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cv.setPointerCapture(e.pointerId); } catch {}
    if (pts.size === 2) return startPinch();
    if (pts.size > 2) return;
    const [sx, sy] = toScene(e);
    press = { sx, sy, cx: e.clientX, cy: e.clientY, lx: e.clientX, ly: e.clientY, long: false, pan: false, lt: performance.now() };
    panVel.x = panVel.y = panVel.fx = 0;
    if (scene.key === 'home') {
      const h = hitAt(sx, sy);
      if (h && h.obj && h.obj.move) press.timer = setTimeout(() => { if (press && !press.pan) { press.long = true; startEdit(h.obj); } }, 550);
    }
  });
  cv.addEventListener('pointermove', (e) => {
    if (window.T3D && window.T3D.ready) return;
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size >= 2) { // 두 손가락: 벌리기 = 확대 · 같이 위아래로 쓸기 = 시점 기울이기 (위 → 정면, 아래 → 내려다보기)
      const [mx, my, d] = midOf();
      if (!pinch.mode) { if (Math.abs(d - pinch.d0) > 22) pinch.mode = 'zoom'; else if (Math.abs(my - pinch.my0) > 16) pinch.mode = 'tilt'; else return; }
      if (pinch.mode === 'tilt') { tiltTo(pinch.t0 + (pinch.my0 - my) / 230); return; }
      if (fv.t > 0.6) { fv.zoom = Math.max(0.35, Math.min(4, pinch.fz * d / pinch.d)); return; }
      setZoom(pinch.z * d / pinch.d);
      const r = cv.getBoundingClientRect(), k = cssToBuf();
      anchorCam(pinch.sx - (mx - r.left) * k, pinch.sy - (my - r.top) * k);
      return;
    }
    if (!press || press.long) return;
    if (!press.pan && Math.hypot(e.clientX - press.cx, e.clientY - press.cy) > 10) { press.pan = true; clearTimeout(press.timer); }
    const now = performance.now(), dts = Math.max(8, now - (press.lt || now - 16)) / 1000; press.lt = now;
    if (press.pan && fv.t > 0.6) { const r = cv.getBoundingClientRect(), d = -(e.clientX - press.lx) * (cv.width / r.width) / (fv.kx || 1); fv.pan += d; panVel.fx = panVel.fx * 0.5 + (d / dts) * 0.5; press.lx = e.clientX; press.ly = e.clientY; return; }
    if (press.pan) { const k = cssToBuf(), [bx, by] = followCam(), dx = -(e.clientX - press.lx) * k, dy = -(e.clientY - press.ly) * k; anchorCam(bx + camOff.x + dx, by + camOff.y + dy); panVel.x = panVel.x * 0.5 + (dx / dts) * 0.5; panVel.y = panVel.y * 0.5 + (dy / dts) * 0.5; press.lx = e.clientX; press.ly = e.clientY; }
  });
  function pointerEnd(e) {
    if (window.T3D && window.T3D.ready) return;
    pts.delete(e.pointerId);
    if (pinch) { if (pts.size < 2) { if (pinch.mode === 'tilt') setTilt(fv.t > 0.4 ? 1 : fv.t < -0.4 ? -1 : 0); pinch = null; } return; }
    if (!press) return;
    clearTimeout(press.timer); const p = press; press = null;
    if (!p.pan || performance.now() - (p.lt || 0) > 90) panVel.x = panVel.y = panVel.fx = 0; // 멈췄다 뗐으면 관성 없음
    if (p.long || p.pan || editing || e.type === 'pointercancel') return;
    if (fv.t > 0.6) return frontTap(p.cx, p.cy);
    tap(p.sx, p.sy);
  }
  cv.addEventListener('pointerup', pointerEnd);
  cv.addEventListener('pointercancel', pointerEnd);
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (window.T3D && window.T3D.ready) return;
    if (e.shiftKey || e.altKey) { tiltTo(fv.t - e.deltaY * 0.004); clearTimeout(fv.wt); fv.wt = setTimeout(() => setTilt(fv.t > 0.4 ? 1 : fv.t < -0.4 ? -1 : 0), 250); return; } // PC: Shift+휠 = 기울이기
    if (fv.t > 0.6) { fv.zoom = Math.max(0.35, Math.min(4, fv.zoom * Math.exp(-e.deltaY * 0.0015))); return; }
    const [sx, sy] = toScene(e), r = cv.getBoundingClientRect();
    setZoom(zoom * Math.exp(-e.deltaY * 0.0015));
    const k = cssToBuf(); anchorCam(sx - (e.clientX - r.left) * k, sy - (e.clientY - r.top) * k);
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault()); // iOS 페이지 확대 막기
  function tap(sx, sy) {
    closeSay();
    const h = hitAt(sx, sy);
    if (h && h.entrance) return useObject(scene.entrance.obj);
    if (h && h.pet) { const tx = Math.floor(petE.x / T), ty = Math.floor(petE.y / T), [px, py] = ptile(); if (Math.abs(px - tx) + Math.abs(py - ty) <= 2) return openPet(); const t = nearestWalkable(tx, ty + 1) || nearestWalkable(tx, ty); if (t) return walkTo(t[0], t[1], openPet); return openPet(); }
    if (h && h.partner) return tapPartner();
    if (h && h.buddy) return tapBuddy();
    if (h && h.npc) return talkNpc(h.npc);
    if (player.pillion) return toast('뒤에 타고 있어요! 내리려면 🛑 내리기');
    if (h && h.obj && h.obj.interact) return useObject(h.obj);
    const [gx, gy] = toGrid(sx, sy);
    const tx = Math.floor(gx), ty = Math.floor(gy);
    if (lockedAhead(ty)) return goKeypad();
    const ex = exitNear(gx, gy); if (ex) return useObject(ex);
    const o = scene.objects.find((ob) => ob.interact && tx >= ob.x && tx < ob.x + (ob.w || 1) && ty >= ob.y && ty < ob.y + (ob.h || 1));
    if (o) return useObject(o);
    const t = walkable(scene, tx, ty) ? [tx, ty] : nearestWalkable(tx, ty);
    if (t) { tapMark = { x: t[0], y: t[1], t: 0.6 }; walkTo(t[0], t[1]); }
  }
  function useObject(o) {
    const [ax, ay] = (o.approach && walkable(scene, o.approach[0], o.approach[1]) ? o.approach : nearestWalkable(o.x, o.y)) || [];
    if (ax == null) return;
    tapMark = { x: ax, y: ay, t: 0.6 };
    if (!walkTo(ax, ay, () => { if (o.face) player.face = o.face; o.interact(); })) say('거기는 갈 수 없어요.');
  }
  function talkNpc(n) {
    const line = n.lines[Math.floor(Math.random() * n.lines.length)];
    n.bubble = { text: line, until: Date.now() + 3500 };
    if (n.name) toast(`${n.name}: ${line}`);
    beep(700 + Math.random() * 300, 0.05);
  }

  // ---------- 가구 옮기기 ----------
  const editBar = document.getElementById('editBar');
  function startEdit(o) {
    const f = scene.furniture.find((x) => x.id === o.id);
    if (!f) return;
    editing = f; closeSay(); path = [];
    document.getElementById('editName').textContent = `${f.name || '가구'} 옮기기`;
    editBar.hidden = false; beep(990, 0.06);
  }
  function endEdit(save = true) { if (!editing) { editBar.hidden = true; return; } if (save) saveLayout(); editing = null; editBar.hidden = true; }
  function canPlace(f, nx, ny, w = f.w, h = f.h) {
    const [px, py] = ptile();
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
      const x = nx + i, y = ny + j;
      if (!scene.isFloor(x, y)) return false;
      if (f.solid === false) continue;
      if (x === px && y === py) return false;
      if (scene.furniture.some((o) => o.id !== f.id && o.solid !== false && !o.wall && x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h)) return false;
      if (scene.objects.some((o) => o.interact && !o.furn && x >= o.x && x < o.x + (o.w || 1) && y >= o.y && y < o.y + (o.h || 1))) return false;
    }
    return true;
  }
  function nudge(dx, dy) {
    if (!editing) return;
    const nx = editing.x + dx, ny = editing.y + dy;
    if (!canPlace(editing, nx, ny)) { beep(240, 0.08); return; }
    layout[editing.id] = { x: nx, y: ny, r: editing.rot || 0 };
    const id = editing.id; rebuildHome(); editing = scene.furniture.find((f) => f.id === id); beep(820, 0.03);
  }
  function rotateEditing() {
    if (!editing) return;
    const r = ((editing.rot || 0) + 1) % 4, w = r % 2 ? editing.h0 : editing.w0, h = r % 2 ? editing.w0 : editing.h0;
    let spot = null;
    for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1]]) if (canPlace(editing, editing.x + dx, editing.y + dy, w, h)) { spot = [editing.x + dx, editing.y + dy]; break; }
    if (!spot) { beep(240, 0.08); toast('여기서는 돌릴 공간이 없어요'); return; }
    layout[editing.id] = { x: spot[0], y: spot[1], r };
    const id = editing.id; rebuildHome(); editing = scene.furniture.find((f) => f.id === id); beep(900, 0.04);
  }
  // 인벤토리: 가구를 넣어 두었다가 다시 꺼내 놓기
  function storeEditing() {
    if (!editing) return;
    const id = editing.id, name = editing.name;
    layout[id] = { inv: true };
    editing = null; editBar.hidden = true; rebuildHome(); saveLayout(); renderInv();
    toast(`${name}을(를) 인벤토리에 넣었어요 📦`); beep(660, 0.05); beep(880, 0.05, 0.06);
  }
  function takeOut(id) {
    const base = FURNITURE.find((f) => f.id === id); if (!base) return;
    const r = base.r || 0, w = r % 2 ? base.h : base.w, h = r % 2 ? base.w : base.h;
    const [px, py] = ptile();
    let spot = null;
    for (let rad = 1; rad < 9 && !spot; rad++) for (let dy = -rad; dy <= rad && !spot; dy++) for (let dx = -rad; dx <= rad && !spot; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
      const tmp = { ...base, w, h };
      if (canPlace(tmp, px + dx, py + dy, w, h)) spot = [px + dx, py + dy];
    }
    if (!spot) { toast('놓을 자리가 없어요'); return; }
    layout[id] = { x: spot[0], y: spot[1], r };
    rebuildHome(); renderInv(); document.getElementById('invPanel').hidden = true;
    const f = scene.furniture.find((x) => x.id === id); if (f) startEdit(f);
    toast(`${base.name}을(를) 꺼냈어요. 자리를 잡고 완료를 눌러요`);
  }
  const INV_ICON = Object.fromEntries(Object.entries({ bed: 'bed', vanity: 'mirror', closet: 'drawer', plant: 'plant', rug: 'rug', rug2: 'rug', tv: 'tv', sofa: 'sofa', guitar: 'guitar', bookshelf: 'bookshelf', table: 'table', clearchair: 'chair', chair: 'chair', desk: 'monitor', wardrobe: 'wardrobe', glasstable: 'glasstable', moodlamp: 'moodlamp', floorlamp: 'lamp', monstera: 'plant', pethouse: 'pethouse' }).map(([k, v]) => [k, TOWN_ICONS.img(v)]));
  function renderInv() {
    const list = document.getElementById('invList'); if (!list) return;
    const items = FURNITURE.filter((f) => layout[f.id]?.inv);
    document.getElementById('invCount').textContent = items.length || '';
    document.getElementById('invCount').hidden = !items.length;
    list.innerHTML = items.length ? items.map((f) => `<button type="button" class="inv-item" data-id="${f.id}"><span>${INV_ICON[f.kind] || '📦'}</span><b>${esc(f.name)}</b><small>꺼내기</small></button>`).join('') : '<p class="empty">인벤토리가 비어 있어요.<br>가구를 꾹 눌러 📦 넣기를 해보세요.</p>';
    list.querySelectorAll('.inv-item').forEach((b) => (b.onclick = () => takeOut(b.dataset.id)));
  }
  document.getElementById('invBtn').onclick = () => { document.getElementById('invPanel').hidden = true; openEmotes('inv'); }; // 전체 인벤토리 (가구 꺼내기는 '가구' 칸)
  document.getElementById('invClose').onclick = () => (document.getElementById('invPanel').hidden = true);
  document.getElementById('editRot').onclick = () => rotateEditing();
  document.getElementById('editStore').onclick = () => storeEditing();
  function rebuildHome() { const wasHome = scene && scene.key === 'home'; scenes.home = homeScene(); if (wasHome) scene = scenes.home; }
  let layoutAt = '';
  // 둘이 같이 쓰는 상태: 냉장고 · 집 조명 · 펫 (서버 /api/town/state)
  let townSt = { fridge: {}, lights: true, pet: null, lamps: {} }, stateAt = '', stateLoaded = false;
  async function stateOp(body) {
    try {
      const r = await fetch('/api/town/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ me, ...body }) });
      const d = await r.json();
      if (!d.ok) { toast(d.error || '잠시 후 다시 해주세요'); return null; }
      applyState(d.state, d.stateAt); return d;
    } catch { toast('연결이 잠깐 끊겼어요'); return null; }
  }
  function applyState(st, at) {
    if (!st) return;
    const hadPet = townSt.pet;
    townSt = { fridge: {}, lights: true, pet: null, lamps: {}, ...st }; stateAt = at || stateAt; stateLoaded = true;
    if (hadPet && townSt.pet && hadPet.stage !== townSt.pet.stage) petCelebrate();
    if (hadPet && !townSt.pet && (townSt.petGone || []).length) setTimeout(showPetGone, 300);
    ensurePet();
  }
  async function saveLayout() {
    try { const r = await fetch('/api/town/layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: layout }) }); const d = await r.json(); if (d.layoutAt) layoutAt = d.layoutAt; toast('가구 배치를 저장했어요'); }
    catch { toast('배치를 저장하지 못했어요'); }
  }
  editBar.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { const [dx, dy] = b.dataset.d.split(',').map(Number); nudge(dx, dy); }));
  document.getElementById('editDone').onclick = () => endEdit(true);

  // ---------- 화면 크기 ----------
  const view = { scale: 2, w: 0, h: 0 };
  const ZMIN = 0.35, ZMAX = 5; // 2D 거리: 더 멀리 · 더 가까이
  let zoom = 1; const camOff = { x: 0, y: 0 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
    view.scale = cv.width / (scene?.viewW || 300) * zoom;
    view.w = Math.ceil(cv.width / view.scale); view.h = Math.ceil(cv.height / view.scale);
    const res = scene?.res || 2;
    buf.width = view.w * res; buf.height = view.h * res;
  }
  window.addEventListener('resize', resize);
  function setZoom(z) { zoom = Math.max(ZMIN, Math.min(ZMAX, z)); zoomGoal = null; resize(); updateCamBtn(); }
  // 2D 도 3D 처럼 부드럽게: 끌다 놓으면 미끄러지듯 멈춤 · 확대는 천천히 · 카메라는 캐릭터를 부드럽게 따라감
  const panVel = { x: 0, y: 0, fx: 0 }; let zoomGoal = null;
  function zoomTo(z) { zoomGoal = Math.max(ZMIN, Math.min(ZMAX, z)); }
  function smooth2D(dt) {
    if (zoomGoal != null) { const z = zoom + (zoomGoal - zoom) * Math.min(1, dt * 9); if (Math.abs(z - zoomGoal) < 0.004) setZoom(zoomGoal); else { zoom = z; resize(); updateCamBtn(); } }
    if (!press && !pinch && (Math.abs(panVel.x) + Math.abs(panVel.y) > 2)) { const [bx, by] = followCam(); anchorCam(bx + camOff.x + panVel.x * dt, by + camOff.y + panVel.y * dt); const k = Math.pow(0.02, dt); panVel.x *= k; panVel.y *= k; }
    if (!press && Math.abs(panVel.fx) > 2) { fv.pan += panVel.fx * dt; panVel.fx *= Math.pow(0.02, dt); }
  }
  // 카메라: 기본은 캐릭터를 따라가고, 쓸어 넘긴 만큼(camOff) 비켜서 봄
  const lim = (c, size, v) => { const mid = (size - v) / 2, lo = Math.min(0, mid) - (size < v ? 24 : 0), hi = Math.max(size - v, mid) + (size < v ? 24 : 0); return Math.max(lo, Math.min(hi, c)); };
  function followCam() { // 캐릭터 따라가는 기본 위치 (장면 끝에서는 멈춤)
    OX = scene.ox; OY = scene.oy; const [pcx, pcy] = iso(player.x / T, player.y / T, 0);
    const f = (c, size, v) => (size < v ? (size - v) / 2 : lim(c, size, v));
    return [f(pcx - view.w / 2, scene.pw, view.w), f(pcy - 20 - view.h / 2, scene.ph, view.h)];
  }
  function anchorCam(cx, cy) { const [bx, by] = followCam(); camOff.x = lim(cx, scene.pw, view.w) - bx; camOff.y = lim(cy, scene.ph, view.h) - by; }
  function resetCam() { camOff.x = camOff.y = 0; setZoom(1); }
  const camBtn = document.getElementById('camReset');
  function updateCamBtn() { const h = Math.abs(zoom - 1) < 0.02 && Math.hypot(camOff.x, camOff.y) < 6; if (camBtn && camBtn.hidden !== h) camBtn.hidden = h; }
  document.getElementById('zoomIn').onclick = () => (fv.t > 0.6 ? (fv.zoom = Math.min(4, fv.zoom * 1.4)) : setZoom(zoom * 1.4));
  document.getElementById('zoomOut').onclick = () => (fv.t > 0.6 ? (fv.zoom = Math.max(0.35, fv.zoom / 1.4)) : setZoom(zoom / 1.4));
  if (camBtn) camBtn.onclick = () => resetCam();
  document.getElementById('emoteBtn').onclick = () => openEmotes();
  document.getElementById('rideBtn').onclick = () => dismount();
  // 배경음악은 거실 유리 탁자 위 블루투스 스피커로 (켜 두었으면 다음에 처음 누를 때 이어서)
  { const sv = TOWN_MUSIC.saved(); if (sv && sv.on) { const go = () => { document.removeEventListener('pointerdown', go, true); if (!TOWN_MUSIC.current) TOWN_MUSIC.shuffle(sv.mode || 'all'); }; document.addEventListener('pointerdown', go, true); } }
  TOWN_MUSIC.onChange((sg) => { if (sg) toast(`🎵 ${sg.title}`); });
  document.getElementById('viewBtn').onclick = () => setTilt(fv.target > 0.5 ? 0 : frontOk() ? 1 : (fv.target < -0.5 ? 0 : -1));
  document.getElementById('turnBtn').onclick = () => turnAround();

  // ---------- 낮 · 노을 · 밤 ----------
  function sky() {
    const forced = qs.get('t');
    const d = new Date(Date.now() + 9 * 3600e3);
    const h = forced != null ? Number(forced) : d.getUTCHours() + d.getUTCMinutes() / 60;
    if (h >= 7 && h < 17) return { dark: 0, warm: 0 };
    if (h >= 17 && h < 19.5) { const k = (h - 17) / 2.5; return { dark: k, warm: 1 - k * 0.6 }; }
    if (h >= 5 && h < 7) { const k = (7 - h) / 2; return { dark: k, warm: (1 - k) * 0.7 }; }
    return { dark: 1, warm: 0 };
  }

  // 화면 바깥 배경: 낮엔 밝은 하늘색, 밤엔 어두운 남색
  function backdrop() {
    const k = sky().dark, a = [214, 236, 245], b = [27, 29, 48];
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;
  }
  // ---------- 루프 ----------
  let last = performance.now();
  function frame(now) { requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; try { update(dt); draw(now / 1000); } catch (err) { if (!frame.err) { frame.err = 1; console.error(err); } try { ctx.reset ? ctx.reset() : ctx.setTransform(1, 0, 0, 1, 0, 0); } catch {} } }
  function update(dt) {
    if (player.pillion) { // 오토바이 뒤에 탐: 운전하는 상대 바로 뒤에 붙어서
      if (!other.visible || other.ride !== 'm') dismount();
      else { [player.x, player.y] = behind(other); player.face = other.face; player.moving = other.walking; player.step = other.step; path = []; }
    }
    if (path.length && !(anim && performance.now() < anim.until)) {
      const [nx, ny] = path[0];
      const gx = nx * T + T / 2, gy = ny * T + T / 2;
      const dx = gx - player.x, dy = gy - player.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy)) player.face = dx > 0 ? 'right' : 'left'; else if (dy) player.face = dy > 0 ? 'down' : 'up';
      const stepLen = SPEED * (player.ride ? RIDE_SPEED[player.ride] : 1) * dt;
      if (d <= stepLen) { player.x = gx; player.y = gy; path.shift(); if (!walkable(scene, nx, ny)) path = []; }
      else { player.x += (dx / d) * stepLen; player.y += (dy / d) * stepLen; }
      player.moving = true; player.step += dt;
      if (!path.length) { player.moving = false; const p = pending; pending = null; if (p) p(); syncSoon(); }
    } else player.moving = false;
    joyMove(dt); lobbyAutoOpen(); checkExits();
    if (tapMark) { tapMark.t -= dt; if (tapMark.t <= 0) tapMark = null; }
    if (buddyHere() && !(anim && anim.with === 'buddy' && performance.now() < anim.until)) {
      let goal = buddy.target;
      if (!goal && buddy.hold && !buddy.pose && !player.pose) { // 손잡고 바로 옆에 딱 붙어서 (펫처럼)
        const side = { right: [0, 0.62], left: [0, -0.62], down: [-0.62, 0], up: [0.62, 0] }[player.face] || [0.62, 0];
        const gx = player.x + side[0] * T, gy = player.y + side[1] * T;
        const k = Math.min(1, dt * 14);
        buddy.x += (gx - buddy.x) * k; buddy.y += (gy - buddy.y) * k;
        buddy.face = player.face; buddy.walking = player.moving; buddy.step = player.step + 0.07;
      }
      if (goal) {
        const dx = goal[0] - buddy.x, dy = goal[1] - buddy.y, d = Math.hypot(dx, dy);
        if (d > 0.8) {
          const sp = Math.min(d, (buddy.greeting ? 80 : SPEED * 1.1) * dt); buddy.x += (dx / d) * sp; buddy.y += (dy / d) * sp; buddy.walking = true; buddy.step += dt;
          buddy.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        } else {
          buddy.walking = false;
          if (buddy.target) { buddy.target = null; if (buddy.greeting) { buddy.greeting = false; startBuddyAnim('greet'); } const f = buddy.onArrive; buddy.onArrive = null; if (f) f(); }
        }
      } else buddy.walking = false;
      if (buddy.hold && !buddy.pose) buddy.face = player.face;
    }
    if (buddyHere() && buddy.pillion) { if (player.ride !== 'm') buddy.pillion = false; else { [buddy.x, buddy.y] = behind(player); buddy.face = player.face; buddy.walking = player.moving; buddy.step = player.step; buddy.target = null; } }
    if (other.visible) {
      const dx = other.tx - other.x, dy = other.ty - other.y, d = Math.hypot(dx, dy);
      const rs = other.ride ? RIDE_SPEED[other.ride] || 1 : 1; // 탈것이면 그 속도로 따라감 (안 그러면 멈칫하다 순간이동)
      if (d > 48 * rs * 2 || other.pose) { other.x = other.tx; other.y = other.ty; other.walking = false; }
      else if (d > 0.5) { const s = Math.min(d, Math.max(SPEED * 1.15 * rs, d * 2.5) * dt); other.x += (dx / d) * s; other.y += (dy / d) * s; other.walking = true; other.step += dt; if (Math.abs(dx) > Math.abs(dy)) other.face = dx > 0 ? 'right' : 'left'; else other.face = dy > 0 ? 'down' : 'up'; }
      else other.walking = false;
    }
    (scene.npcs || []).forEach((n) => {
      if (!n.route) return;
      n.i = n.i || 0; n.wait = n.wait ?? 1;
      if (n.wait > 0) { n.wait -= dt; n.walking = false; return; }
      const [tx, ty] = n.route[(n.i + 1) % n.route.length];
      const gx = tx * T + 8, gy = ty * T + 8, dx = gx - n.x, dy = gy - n.y, d = Math.hypot(dx, dy);
      if (d < 1) { n.i = (n.i + 1) % n.route.length; n.wait = 0.8 + Math.random() * 2.2; if (Math.random() < 0.3) talkNpc({ ...n, name: '' }); return; }
      const s = Math.min(d, 34 * dt);
      if (Math.abs(dx) > 0.5) { n.x += Math.sign(dx) * Math.min(Math.abs(dx), s); n.face = dx > 0 ? 'right' : 'left'; }
      else { n.y += Math.sign(dy) * Math.min(Math.abs(dy), s); n.face = dy > 0 ? 'down' : 'up'; }
      n.walking = true; n.step = (n.step || 0) + dt;
    });
    if (scene.key === 'jumak' && Math.random() < dt * 0.35) { const sitters = scene.npcs.filter((n) => n.sit); const n = sitters[Math.floor(Math.random() * sitters.length)]; if (n && (!n.bubble || n.bubble.until < Date.now())) n.bubble = { text: n.lines[Math.floor(Math.random() * n.lines.length)], until: Date.now() + 2600 }; }
    const smokers = [];
    if (player.smoke > 0) { player.smoke -= dt; smokers.push(player); if (player.smoke <= 0) say('후~ 다 피웠어요.'); }
    if (other.visible && other.smokeUntil > Date.now()) smokers.push(other);
    (scene.npcs || []).filter((n) => n.smoke).forEach((n) => smokers.push(n));
    smokers.forEach((c) => { if (Math.random() < dt * 3) fx.puffs.push({ gx: c.x / T, gy: c.y / T, t: 1.6, life: 1.6, dx: c.face === 'left' || c.face === 'up' ? -5 : 5 }); });
    for (const c of [myGuitarUntil > Date.now() ? player : null, other.visible && other.guitarUntil > Date.now() ? other : null]) {
      if (c && Math.random() < dt * 2.5) { OX = scene.ox; OY = scene.oy; const [px, py] = iso(c.x / T, c.y / T, 0); fx.notes.push({ x: px + 4 + Math.random() * 6, y: py - 26, t: 1.8, life: 1.8, ch: ['♪', '♫', '♬', '🎵'][Math.floor(Math.random() * 4)] }); }
    }
    if (TOWN_MUSIC.current && scene.key === 'home' && Math.random() < dt * 1.2) { const sp = (scene.furniture || []).find((f) => f.kind === 'speaker'); if (sp) { OX = scene.ox; OY = scene.oy; const [px, py] = iso(sp.x + 0.5, sp.y + 0.5, 0); fx.notes.push({ x: px - 2 + Math.random() * 6, y: py - 6, t: 1.8, life: 1.8, ch: ['♪', '♫', '♬'][Math.floor(Math.random() * 3)] }); } }
    if (myGuitarUntil > Date.now() && player.moving) { myGuitarUntil = 0; fx.bubbles[me] = null; if (songStop) songStop(); }
    fx.puffs = fx.puffs.filter((h) => (h.t -= dt) > 0);
    fx.hearts = fx.hearts.filter((h) => (h.t -= dt) > 0);
    fx.notes = fx.notes.filter((h) => (h.t -= dt) > 0);
    if (anim && performance.now() > anim.until) anim = null;
    updatePet(dt);
    updateFront(dt);
  }

  // =====================================================================
  // 정면 보기 (거리): 두 손가락으로 위로 쓸거나 🏙️ → 가게 앞모습 / 🔄 → 길 건너편으로 돌아보기
  // =====================================================================
  const fv = { t: 0, target: 0, side: 'W', pan: 0, zoom: 0.8, flip: 0, flipping: false, strips: {}, hits: [], sy: 1, anchor: 0, kx: 1, gesture: false };
  const frontOk = () => scene && scene.key === 'street' && window.TOWN_FRONT;
  const strip = (side) => fv.strips[side] || (fv.strips[side] = TOWN_FRONT.build(side));
  function tiltTo(t) {
    if (t > 0 && !frontOk()) { if (!fv.warned) { toast('정면 보기는 거리에서 돼요 🏙️ (집·가게 안은 내려다보기만)'); fv.warned = true; } t = 0; }
    if (t > 0 && fv.t <= 0.001) { fv.side = player.x / T < 10 ? 'W' : 'E'; fv.pan = 0; }
    fv.t = Math.max(-1, Math.min(1, t)); fv.target = fv.t; fv.gesture = true; updateViewBtn();
  }
  function setTilt(t) {
    fv.gesture = false; fv.warned = false;
    if (t > 0 && !frontOk()) { toast('정면 보기는 거리에서 돼요 🏙️'); t = 0; }
    if (t > 0 && fv.t <= 0.001) { fv.side = player.x / T < 10 ? 'W' : 'E'; fv.pan = 0; }
    fv.target = t; updateViewBtn();
    if (t > 0 && !fv.tipped) { fv.tipped = true; setTimeout(() => toast('옆으로 쓸면 거리를 따라 이동 · 🔄 길 건너편 보기 · 두 손가락 아래로 쓸면 돌아와요'), 700); }
  }
  function turnAround() { if (fv.t < 0.6 || fv.flipping) return; fv.flipping = true; fv.flip = 0; beep(520, 0.05); }
  function updateViewBtn() {
    const vb = document.getElementById('viewBtn'), tb = document.getElementById('turnBtn');
    if (vb) { vb.innerHTML = TOWN_ICONS.img(fv.target > 0.5 ? 'target' : 'city'); vb.setAttribute('aria-label', fv.target > 0.5 ? '위에서 보기로 돌아가기' : '정면에서 보기'); }
    if (tb) tb.hidden = !(fv.target > 0.5);
  }
  function updateFront(dt) {
    if (!fv.gesture && fv.t !== fv.target) { fv.t += (fv.target - fv.t) * Math.min(1, dt * 5); if (Math.abs(fv.t - fv.target) < 0.004) fv.t = fv.target; }
    if (fv.t > 0 && !frontOk()) { fv.t = 0; fv.target = 0; updateViewBtn(); }
    if (fv.flipping) {
      const was = fv.flip; fv.flip += dt * 1.8;
      if (was < 0.5 && fv.flip >= 0.5) { fv.side = fv.side === 'W' ? 'E' : 'W'; fv.pan = -fv.pan; }
      if (fv.flip >= 1) { fv.flipping = false; fv.flip = 0; toast(fv.side === 'W' ? '서쪽 줄: 올리브샵 · FRESH MART · 복사꽃 …' : '동쪽 줄: 달빛주막 · 별빛 오피스텔 …'); }
    }
  }
  // 사람·탈것을 정면 그림 위치로: 거리 y → 가로, 가게에서 떨어진 정도 → 아래쪽·크게
  function frontPos(side, gx, gy) {
    const d = side === 'W' ? gx - 5 : 14.5 - gx;
    return { x: TOWN_FRONT.xOf(side, gy), y: TOWN_FRONT.G + 5 + Math.max(0, d) * 3.4, k: 1.05 + Math.max(0, d) * 0.035, d };
  }
  const FRONT_FACE = { W: { up: 'right', down: 'left', left: 'up', right: 'down' }, E: { up: 'left', down: 'right', left: 'down', right: 'up' } };
  function drawFront(t, time) {
    const st = strip(fv.side), Wc = cv.width, Hc = cv.height;
    const k = Hc / 262 * fv.zoom;                          // 정면 그림 1px → 화면
    const ky = k * (0.35 + 0.65 * t), fold = Hc * (1 - t); // 아래에서 올라오는 접힘선
    const flipK = fv.flipping ? Math.max(0.04, Math.abs(Math.cos(fv.flip * Math.PI))) : 1;
    fv.kx = k * flipK;
    const visW = Wc / k, me0 = frontPos(fv.side, player.x / T, player.y / T);
    let cx = me0.x + fv.pan; const lo = visW / 2, hi = st.w - visW / 2;
    if (lo < hi) { const c2 = Math.max(lo, Math.min(hi, cx)); fv.pan += c2 - cx; cx = c2; } else cx = st.w / 2;
    const toX = (x) => Wc / 2 + (x - cx) * fv.kx, toY = (y) => Hc + (y - st.h) * ky;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, Math.max(0, fold - 40 * t), Wc, Hc); ctx.clip();
    ctx.setTransform(fv.kx, 0, 0, ky, Wc / 2 - cx * fv.kx, Hc - st.h * ky);
    ctx.imageSmoothingEnabled = false;
    // 하늘
    const sk = sky(), sg = ctx.createLinearGradient(0, -400, 0, st.G);
    sg.addColorStop(0, sk.dark > 0.5 ? '#141a3e' : sk.warm > 0.3 ? '#f4a36b' : '#8fd0f2'); sg.addColorStop(1, sk.dark > 0.5 ? '#2a2f5e' : sk.warm > 0.3 ? '#ffd9a0' : '#d8f0fb');
    ctx.fillStyle = sg; ctx.fillRect(cx - visW, -600, visW * 2, st.G + 600);
    if (sk.dark > 0.5) for (let i = 0; i < 40; i++) { const sx2 = (i * 97.3) % st.w, sy2 = (i * 53.1) % 120; ctx.fillStyle = `rgba(255,255,240,${0.4 + 0.4 * Math.sin(time * 2 + i)})`; ctx.fillRect(sx2, sy2 - 60, 0.8, 0.8); }
    ctx.drawImage(st.base, 0, 0, st.w, st.h);
    const visX0 = cx - visW, visX1 = cx + visW;
    if (sk.dark > 0) { // 밤: 건물을 어둡게 → 간판·창문 불빛 → 번짐
      ctx.fillStyle = `rgba(16,20,56,${0.6 * sk.dark})`; ctx.fillRect(visX0, -600, visW * 2, st.h + 600);
      ctx.globalAlpha = sk.dark; ctx.drawImage(st.emit, 0, 0, st.w, st.h); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'lighter';
      for (const [gx2, gy2, rr, c] of st.glows) { if (gx2 < visX0 - rr || gx2 > visX1 + rr) continue; const gr = ctx.createRadialGradient(gx2, gy2, 0, gx2, gy2, rr); gr.addColorStop(0, `rgba(${c},${0.3 * sk.dark})`); gr.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = gr; ctx.fillRect(gx2 - rr, gy2 - rr, rr * 2, rr * 2); }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1 - sk.dark; ctx.drawImage(st.fore, 0, 0, st.w, st.h); ctx.globalAlpha = sk.dark; ctx.drawImage(st.foreDark, 0, 0, st.w, st.h); ctx.drawImage(st.foreEmit, 0, 0, st.w, st.h); ctx.globalAlpha = 1;
    } else ctx.drawImage(st.fore, 0, 0, st.w, st.h);
    if (sk.warm > 0) { ctx.fillStyle = `rgba(255,140,60,${0.12 * sk.warm})`; ctx.fillRect(visX0, -600, visW * 2, st.h + 600); }
    // 움직이는 것들: 세워 둔 탈것 · 고양이 · 사람
    const items = [];
    for (const pr of Object.values(scene.rides || {})) {
      if (player.ride === pr.ride || (other.visible && other.ride === pr.ride)) continue;
      const fp = frontPos(fv.side, pr.x + 0.5, pr.y + 0.5); if (Math.abs(fp.d) > 2.5 && fp.d >= 0 === false) continue;
      items.push({ d: fp.d, draw: () => { ctx.save(); ctx.translate(fp.x, fp.y); ctx.scale(fp.k, fp.k); if (pr.ride === 'm') { ell(ctx, 0, 0.5, 11, 2.2, 'rgba(0,0,0,.18)'); drawMoto(ctx, 0, 0, 1); ell(ctx, 7, -15, 3.2, 2.6, '#ffd21f'); } else drawBikeSide(ctx, 0, 0, 1, pr.color); ctx.restore(); }, hit: { prop: pr, x: fp.x, y: fp.y, w: 26 * fp.k, h: 16 * fp.k } });
    }
    if (scene.cat) { const c = scene.cat, fp = frontPos(fv.side, c.x + 0.5, c.y + 0.5); if (fp.d >= -0.5 && fp.d < 3) items.push({ d: fp.d, draw: () => { ctx.save(); ctx.translate(fp.x, fp.y); ctx.scale(fp.k * 1.3, fp.k * 1.3); const aw = c.meow > performance.now(); ell(ctx, 0, 0, 5, 1.4, 'rgba(0,0,0,.15)'); ell(ctx, 1, -2.5, 4.5, 2.8, '#f0a24a'); circle(ctx, -3.5, -4.5, 2.4, '#f0a24a'); poly(ctx, [[-5.5, -6], [-5, -8.5], [-3.8, -6.4]], '#f0a24a'); poly(ctx, [[-3, -6.6], [-2.2, -8.6], [-1.5, -6.2]], '#f0a24a'); R2(ctx, -4.8, -5, 0.8, aw ? 0.8 : 0.3, '#3a2a22'); R2(ctx, -3, -5, 0.8, aw ? 0.8 : 0.3, '#3a2a22'); ctx.strokeStyle = '#d9822b'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(5, -2); ctx.quadraticCurveTo(8, -3 + Math.sin(time * 2) * 1.5, 7, aw ? -9 : -6); ctx.stroke(); ctx.restore(); }, hit: { cat: c, x: fp.x, y: fp.y, w: 14, h: 10 } }); }
    const ppl = [];
    const fake = (c) => ({ ...c, face: c.ride || c.pillion ? FRONT_FACE[fv.side][c.face] : FRONT_FACE[fv.side][c.face] });
    ppl.push({ c: { who: me, x: player.x, y: player.y, face: player.face, moving: player.moving, step: player.step, ride: player.ride, pillion: player.pillion, smoking: player.smoke > 0 }, tag: [names[me], '#ff6b81'], bub: fx.bubbles[me], kind: 'me' });
    if (other.visible) { let ox = other.x, oy = other.y, f0 = other.face, mv = other.walking; if (other.pillion && player.ride === 'm') { [ox, oy] = behind(player); f0 = player.face; mv = player.moving; } ppl.push({ c: { who: partner, x: ox, y: oy, face: f0, moving: mv, step: other.step, ride: other.ride, pillion: other.pillion && player.ride === 'm' }, tag: [names[partner], '#6f86c9'], bub: fx.bubbles[partner], kind: 'partner' }); }
    if (buddyHere()) ppl.push({ c: { who: partner, x: buddy.x, y: buddy.y, face: buddy.face, moving: buddy.walking, step: buddy.step, pillion: buddy.pillion }, tag: [names[partner], '#6f86c9'], bub: buddy.bubble, kind: 'buddy' });
    for (const n of scene.npcs || []) if (!n.sit) ppl.push({ c: { set: n.set || NPCSPR[n.spr], x: n.x, y: n.y, face: n.face, moving: n.walking, step: n.step || 0, smoking: n.smoke }, tag: n.name ? [n.name, '#2f8a4a'] : null, bub: n.bubble, kind: 'npc', npc: n });
    for (const p of ppl) {
      const fp = frontPos(fv.side, p.c.x / T, p.c.y / T);
      if (fp.d < -0.6) continue; // 가게 안쪽(벽 너머)은 안 보임
      items.push({ d: fp.d + 0.01, person: p, fp, draw: () => { ctx.save(); ctx.translate(fp.x, fp.y); ctx.scale(fp.k, fp.k); if (!p.c.ride && !p.c.pillion) ell(ctx, 0, 0, 6, 2, 'rgba(0,0,0,.22)'); p.box = drawAt(ctx, fake(p.c), 0, 0); ctx.restore(); } });
    }
    items.sort((a, b2) => a.d - b2.d).forEach((it) => it.draw());
    ctx.restore();
    // 접힘선 위 아지랑이 (위 풍경과 자연스럽게 이어짐)
    if (t < 0.999) { const hz = ctx.createLinearGradient(0, fold - 40 * t, 0, fold + 30); hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(0.5, `rgba(235,245,255,${0.55 * (1 - t)})`); hz.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = hz; ctx.fillRect(0, fold - 40 * t, Wc, 70); }
    // 터치 판정 · 이름표 · 말풍선 (화면 좌표)
    fv.hits = [];
    for (const it of items) {
      if (it.hit) { const h = it.hit; fv.hits.push({ box: [toX(h.x - h.w / 2), toY(h.y - h.h), toX(h.x + h.w / 2), toY(h.y + 2)], ...h }); }
      if (it.person && it.person.box && t > 0.6) {
        const p = it.person, b0 = p.box, X0 = toX(it.fp.x + b0[0] * it.fp.k), X1 = toX(it.fp.x + b0[2] * it.fp.k), Y0 = toY(it.fp.y + b0[1] * it.fp.k), Y1 = toY(it.fp.y + b0[3] * it.fp.k);
        fv.hits.push({ box: [X0, Y0, X1, Y1], person: p });
        const hx = (X0 + X1) / 2;
        if (p.tag) nameTag(p.tag[0], hx, Y0 - 2, p.tag[1]);
        if (p.bub && p.bub.until > Date.now()) speech(p.bub.text, hx, Y0 - 16 * dprNow());
      }
    }
    if (t > 0.6) {
      for (const reg of st.regions) fv.hits.push({ box: [toX(reg.x0), toY(st.G - 150), toX(reg.x1), toY(st.G)], region: reg });
      if (scene.catBub && scene.catBub.until > Date.now() && scene.cat) { const fp = frontPos(fv.side, scene.cat.x + 0.5, scene.cat.y + 0.5); speech(scene.catBub.text, toX(fp.x), toY(fp.y - 14)); }
      if (fv.side === 'E') { const ex = toX(TOWN_FRONT.xOf('E', 31.5)), ey = toY(st.G - 58) - Math.abs(Math.sin(time * 3)) * 6 * dprNow(); nameTag('🏠 우리집 입구', ex, ey, '#e8902a'); }
    }
    fv.toX = toX; fv.toY = toY; fv.cx = cx; fv.k = k;
  }
  function frontTap(clientX, clientY) {
    closeSay();
    const r = cv.getBoundingClientRect(), X = (clientX - r.left) * (cv.width / r.width), Yc = (clientY - r.top) * (cv.height / r.height);
    const inBox = (h) => X >= h.box[0] && X <= h.box[2] && Yc >= h.box[1] && Yc <= h.box[3];
    const pick = (f) => fv.hits.filter(f).reverse().find(inBox);
    const ph = pick((h) => h.person);
    if (ph) { const p = ph.person; if (p.kind === 'partner') return tapPartner(); if (p.kind === 'buddy') return tapBuddy(); if (p.kind === 'npc' && p.npc.lines) return talkNpc(p.npc); if (p.kind === 'me') return openEmotes(); }
    const pr = pick((h) => h.prop || h.cat);
    if (pr) { const o = scene.objects.find((ob) => ob.id === (pr.prop || pr.cat).id); if (o) return useObject(o); }
    const st = strip(fv.side), sx = fv.cx + (X - cv.width / 2) / fv.kx, sy2 = st.h + (Yc - cv.height) / (fv.k * 1);
    const reg = pick((h) => h.region);
    if (reg && sy2 < st.G - 4) { // 가게를 누르면 그 가게로 걸어가서 들어감
      const g = reg.region, o = scene.objects.find((ob) => ob.interact && ob.y === g.y0 && (fv.side === 'W' ? ob.x === 0 : ob.x === 15));
      if (g.id === 'starlight') return useObject(scene.entrance.obj);
      if (o) return useObject(o);
    }
    // 인도·도로를 누르면 그쪽으로 걷기
    const gy = fv.side === 'W' ? TOWN_FRONT.H - sx / TOWN_FRONT.CW : sx / TOWN_FRONT.CW;
    const d = Math.max(0, (sy2 - TOWN_FRONT.G - 5) / 3.4), gx = fv.side === 'W' ? 5 + d : 14.5 - d;
    if (player.pillion) return toast('뒤에 타고 있어요! 내리려면 🛑 내리기');
    const tgt = nearestWalkable(Math.max(0, Math.min(scene.w - 1, Math.floor(gx))), Math.max(0, Math.min(scene.h - 1, Math.floor(gy))));
    if (tgt) { tapMark = { x: tgt[0], y: tgt[1], t: 0.6 }; walkTo(tgt[0], tgt[1]); }
  }

  // ---------- 사람 그리기 ----------
  function charFrame(set, face, moving, step) { const f = set[face]; if (!moving) return f[0]; return [f[1], f[0], f[2], f[0]][Math.floor(step / 0.14) % 4]; }
  function drawPerson(g, c) {
    let [px, py] = iso(c.x / T, c.y / T, 0);
    px += c.dx || 0; py += c.dy || 0;
    return drawAt(g, c, px, py);
  }
  // 손에 든 병·음식 (마실 땐 입가로 올렸다 내렸다)
  const holdImgs = {};
  function holdImg(id) { if (!holdImgs[id]) { const im = new Image(); im.src = TOWN_ICONS.foodSrc(id); holdImgs[id] = im; } return holdImgs[id]; }
  const holdUp = (c) => c.hold && c.hold.sip && Math.floor(performance.now() / 650) % 3 === 0;
  function drawHold(g, c, px, py) {
    const im = holdImg(c.hold.id); if (!im.complete || !im.naturalWidth) return;
    const side = c.face === 'left' ? -1 : 1, up = holdUp(c);
    const hx = px + side * (up ? 2 : 5) - 4, hy = py - (up ? 19 : 13);
    g.drawImage(im, hx, hy, 9, 9);
  }
  function drawAt(g, c, px, py) {
    const set = c.set || sprOf(c.who);
    if (c.pose === 'lie') { // 눈 감고 새근새근
      const hx = Math.round(px - 9), hy = Math.round(py - 30);
      g.drawImage(set.down[0], 0, 0, 18, 13, hx, hy, 18, 13);
      for (const ex of [5, 11]) { R(g, hx + ex, hy + 8, 2, 2, '#ffe2cf'); R(g, hx + ex, hy + 9, 2, 1, '#3a2a2e'); } // 감은 눈
      R(g, hx + 7, hy + 11, 4, 1, '#ffe2cf'); R(g, hx + 8, hy + 11, 2, 1, '#e06f7d');
      return [px - 9, py - 30, px + 9, py - 17];
    }
    if (c.ride || c.pillion) { // 자전거·오토바이 타기 (오토바이는 노란 헬멧)
      const dir = c.face === 'right' || c.face === 'up' ? 1 : -1, moto = c.ride === 'm' || c.pillion;
      const bounce = c.moving && Math.floor(c.step / 0.09) % 2 ? -0.6 : 0;
      if (c.ride && !c.noVehicle) { ell(g, px, py + 0.5, 10, 2.6, 'rgba(0,0,0,.2)'); if (c.ride === 'm') drawMoto(g, px, py + bounce, dir); else drawBikeSide(g, px, py + bounce, dir, c.ride === 'b1' ? '#7fd3c6' : '#f2c230'); }
      const sx = Math.round(px - 9 - (c.noVehicle ? 0 : c.ride === 'm' ? dir * 2.5 : c.ride ? dir * 1 : 0)), sy = Math.round(py - (moto ? 26 : 27) + bounce);
      g.drawImage((c.noVehicle ? set[c.face] : set[dir > 0 ? 'right' : 'left'])[0], 0, 0, 18, 18, sx, sy, 18, 18); // 3D: 탈것은 3D 모델이 따로, 사람은 보는 방향 그대로
      if (c.ride === 'm' || c.pillion) { const hx = sx + 9; ell(g, hx, sy + 4.2, 7, 4.9, '#ffd21f'); R2(g, hx - 7, sy + 6.6, 14, 1.3, '#e0b400'); if (c.face !== 'up') R2(g, c.noVehicle && c.face === 'down' ? hx - 4 : hx + (dir > 0 ? 1 : -6), sy + 4.6, c.noVehicle && c.face === 'down' ? 8 : 5, 1.6, 'rgba(40,50,70,.7)'); ell(g, hx - 2.6 * dir, sy + 2, 1.6, 0.9, 'rgba(255,255,255,.65)'); }
      if (c.ride && c.moving && c.ride !== 'm') { const k = Math.floor(c.step / 0.12) % 2; R2(g, px - 1 + k, py - 6, 2, 1, '#2b2b30'); }
      if (c.ride === 'm' && c.moving && !c.noVehicle && Math.random() < 0.3) fx.puffs.push({ gx: c.x / T, gy: c.y / T, t: 0.6, life: 0.6, dx: -dir * 10 });
      return [sx, sy - 2, sx + 18, py + 2];
    }
    const img = charFrame(set, c.face, c.moving, c.step);
    if (c.pose === 'sit' || c.sit) {
      g.drawImage(img, 0, 0, 18, 20, Math.round(px - 9), Math.round(py - 22), 18, 20);
      if (c.smoking) drawCig(g, c, px, py - 7);
      if (c.hold) drawHold(g, c, px, py + 2);
      return [px - 9, py - 22, px + 9, py - 2];
    }
    ell(g, px, py, 6, 2.5, 'rgba(0,0,0,.2)');
    const hop = c.hop || 0, bob = c.moving && Math.floor(c.step / 0.14) % 2 === 0 ? -1 : 0;
    g.drawImage(img, Math.round(px - 9), Math.round(py - 24 + bob - hop));
    if (c.arms) { // 안아주기: 상대 등 쪽으로 팔
      const dir = c.arms; R(g, px + dir * 4, py - 13 - hop, 6, 2, '#ffe2cf'); R(g, px + dir * 4, py - 13 - hop, 6, 1, '#3a2a2e');
    }
    if (c.smoking) drawCig(g, c, px, py - 11 - hop);
    if (c.hold) drawHold(g, c, px, py - hop);
    if (c.guitar) { // 기타를 안고 치는 모습
      const k = Math.floor(performance.now() / 160) % 2;
      circle(g, px + 3, py - 7 - hop, 4, '#d9822b'); circle(g, px + 1, py - 10 - hop, 3, '#e8963a'); circle(g, px + 2, py - 8 - hop, 1.3, '#3a2a1a');
      g.strokeStyle = '#5a3a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py - 11 - hop); g.lineTo(px - 8, py - 17 - hop); g.stroke();
      R(g, px - 10, py - 19 - hop, 3, 3, '#3a2a1a'); R(g, px + 1 + k, py - 10 - hop, 2, 2, '#ffe2cf'); // 치는 손
    }
    return [px - 9, py - 25 - hop, px + 9, py + 2];
  }
  function drawCig(g, c, px, py) { const left = c.face === 'left' || c.face === 'up'; const sx = left ? px - 6 : px + 3; R(g, sx, py, 3, 1, '#f4f4f0'); R(g, left ? sx : sx + 3, py, 1, 1, '#ff6b3a'); }
  // 감정 효과: 머리 위 기호 · 얼굴색 · 비구름 · 김 · 하트 …
  function drawEmote(g, c, b, time) {
    const t = (performance.now() - c.emote.start) / 1000, cx = (b[0] + b[2]) / 2, hy = b[1];
    const face = (col) => { g.fillStyle = col; g.fillRect(cx - 6, hy + 6, 12, 7); };
    switch (c.emote.e) {
      case 'happy': for (let i = 0; i < 4; i++) { const a = time * 3 + i * 1.6; const sx = cx + Math.cos(a) * 11, sy = hy + 4 + Math.sin(a) * 5; R(g, sx, sy - 1, 1, 3, '#ffd23a'); R(g, sx - 1, sy, 3, 1, '#ffd23a'); } break;
      case 'angry': {
        face('rgba(255,60,60,.32)');
        const mx = cx + 7, my = hy - 2; g.fillStyle = '#e8343a'; [[0, 0], [2, 0], [0, 2], [2, 2]].forEach(([a, d]) => { g.fillRect(mx + a - 1, my + d - 1, 2, 1); g.fillRect(mx + a - 1, my + d - 1, 1, 2); }); // 💢
        for (let i = 0; i < 2; i++) { const k = (time * 1.4 + i * 0.5) % 1; circle(g, cx + (i ? 6 : -6), hy - 2 - k * 8, 1.2 + k * 1.8, `rgba(235,235,240,${0.8 * (1 - k)})`); }
        break;
      }
      case 'sad': {
        face('rgba(80,120,220,.28)');
        const cy = hy - 10; circle(g, cx - 4, cy, 4, '#7d8796'); circle(g, cx + 1, cy - 2, 5, '#8a94a3'); circle(g, cx + 6, cy, 3.5, '#7d8796'); R(g, cx - 8, cy, 17, 3, '#7d8796');
        for (let i = 0; i < 4; i++) { const k = (time * 2 + i * 0.27) % 1; R(g, cx - 6 + i * 4, cy + 3 + k * 9, 0.6, 2, '#6aa7ff'); }
        break;
      }
      case 'shy': { R(g, cx - 6, hy + 10, 3, 1.5, '#ff7a96'); R(g, cx + 3, hy + 10, 3, 1.5, '#ff7a96'); const k = (time % 1.5) / 1.5; pixHeart(g, cx + 9, hy - k * 8, 1 - k); break; }
      case 'love': for (let i = 0; i < 3; i++) { const k = (time * 0.7 + i / 3) % 1; pixHeart(g, cx - 8 + i * 8, hy - 2 - k * 14, 1 - k); } break;
      case 'surprise': { const y0 = hy - 12; R(g, cx - 1, y0, 3, 7, '#3a2a2e'); R(g, cx - 1, y0 + 8, 3, 2, '#3a2a2e'); R(g, cx, y0 + 1, 1, 5, '#ffd23a'); R(g, cx, y0 + 8.5, 1, 1, '#ffd23a'); break; }
      case 'sulk': { g.strokeStyle = '#8a6ad6'; g.lineWidth = 0.8; g.beginPath(); for (let a = 0; a < 12; a += 0.3) { const r = a * 0.45; g.lineTo(cx + 8 + Math.cos(a + time * 4) * r, hy - 3 + Math.sin(a + time * 4) * r * 0.6); } g.stroke(); break; }
      case 'sleepy': { g.fillStyle = '#7a8cff'; g.font = '6px sans-serif'; const k = (time * 0.8) % 1; g.fillText('z', cx + 6, hy - k * 6); g.fillText('Z', cx + 9, hy - 5 - ((k + 0.5) % 1) * 6); break; }
    }
  }
  // 픽셀 하트 말풍선
  const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  function heartBubble(g, px, py) {
    const x = Math.round(px - 6), y = Math.round(py);
    R(g, x, y, 13, 10, '#3a2a2e'); R(g, x + 1, y - 1, 11, 12, '#3a2a2e'); R(g, x + 1, y, 11, 10, '#ffffff'); R(g, x + 5, y + 10, 3, 2, '#3a2a2e'); R(g, x + 6, y + 10, 1, 1, '#ffffff');
    HEART.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') R(g, x + 3 + i, y + 2 + j, 1, 1, j === 0 && i % 3 === 1 ? '#ffb3c4' : '#ff4f72'); }));
  }

  // 지금 그릴 사람들 (나 · 상대 · 대신 있는 상대 · NPC) + 안기·뽀뽀·감정 몸짓 (2D·3D 같이 씀)
  function peopleNow() {
    OX = scene.ox; OY = scene.oy;
    const animOn = anim && performance.now() < anim.until;
    const phase = animOn ? (performance.now() - anim.start) / 1000 : 0;
    const people = [];
    const meC = { who: me, x: player.x, y: player.y, face: player.face, moving: player.moving, step: player.step, pose: player.pose, smoking: player.smoke > 0, guitar: myGuitarUntil > Date.now(), me: true, ride: player.ride, pillion: player.pillion, hold: player.hold && player.hold.until > Date.now() ? player.hold : null };
    people.push(meC);
    let otC = null;
    if (other.visible) { otC = { who: partner, x: other.x, y: other.y, face: other.face, moving: other.walking, step: other.step, pose: other.pose, smoking: other.smokeUntil > Date.now(), guitar: other.guitarUntil > Date.now(), partner: true, ride: other.ride, pillion: other.pillion && player.ride === 'm', hold: other.hold && other.hold.until > Date.now() ? other.hold : null }; if (otC.pillion) { [otC.x, otC.y] = behind(player); otC.face = player.face; otC.moving = player.moving; } people.push(otC); }
    let bdC = null;
    if (buddyHere()) { bdC = { who: partner, x: buddy.x, y: buddy.y, face: buddy.face, moving: buddy.walking, step: buddy.step, pose: buddy.pose || '', guitar: false, buddy: true, pillion: buddy.pillion, hold: buddy.item && buddy.item.until > Date.now() ? buddy.item : null }; people.push(bdC); }
    const mate = anim && anim.with === 'buddy' ? bdC : otC;
    if (animOn && mate && !meC.pose && !mate.pose) { // 마주 보고 다가가 안기 · 뽀뽀 (마중은 안기→뽀뽀→안고 한 바퀴), 끝나면 깡총깡총
      let type = anim.type, hopAt = 2;
      if (type === 'greet') { hopAt = 4.6; type = phase < 1.5 ? 'hug' : phase < 3 ? 'kiss' : 'spin'; }
      const [ax, ay] = iso(meC.x / T, meC.y / T), [bx, by] = iso(mate.x / T, mate.y / T);
      const dir = ax <= bx ? 1 : -1;
      meC.face = dir > 0 ? 'right' : 'left'; mate.face = dir > 0 ? 'left' : 'right';
      const gap = Math.abs(bx - ax), close = Math.max(0, (gap - (type === 'kiss' || type === 'bite' ? 9 : 11)) / 2);
      const k = Math.min(1, phase / 0.4), midY = (ay + by) / 2, midX = (ax + bx) / 2;
      if (phase < hopAt) {
        meC.dx = dir * close * k; mate.dx = -dir * close * k;
        meC.dy = (midY - ay) * k; mate.dy = (midY - by) * k;
        if (type === 'hug') { meC.arms = dir; mate.arms = -dir; }
        if (type === 'kiss' && (anim.type !== 'kiss' || phase > 0.5)) { meC.dy -= 1; mate.dy -= 1; }
        if (type === 'bite' && phase > 0.5) { // 깨문 쪽이 살짝 앞으로, 물린 쪽은 파르르
          const bitten = anim.mine === false ? meC : mate, biter = bitten === meC ? mate : meC;
          if (phase < 0.9) biter.dx += (bitten === mate ? dir : -dir) * 1.5;
          if (phase > 0.9 && phase < 1.6) bitten.dx += Math.sin(phase * 70) * 1.2;
          bitten.biteMark = true;
        }
        if (type === 'spin') { // 안고 한 바퀴 빙글
          const a = ((phase - 3) / 1.6) * Math.PI * 2;
          meC.dx = midX + Math.cos(a + Math.PI) * 5.5 - ax; meC.dy = midY + Math.sin(a + Math.PI) * 2.5 - ay;
          mate.dx = midX + Math.cos(a) * 5.5 - bx; mate.dy = midY + Math.sin(a) * 2.5 - by;
          const mf = Math.cos(a + Math.PI) < 0 ? 'right' : 'left';
          meC.face = mf; mate.face = mf === 'right' ? 'left' : 'right';
          meC.arms = mf === 'right' ? 1 : -1; mate.arms = -meC.arms;
          meC.hop = mate.hop = 2;
        }
      } else { meC.hop = Math.abs(Math.sin((phase - hopAt) * 9)) * 6; mate.hop = Math.abs(Math.sin((phase - hopAt) * 9 + 0.5)) * 6; }
    } else if (animOn && !mate) meC.hop = phase > 2 ? Math.abs(Math.sin((phase - 2) * 9)) * 6 : 0;
    for (const [c, src] of [[meC, player], [otC, other]]) if (c && src.emote && src.emote.until > performance.now()) c.emote = src.emote;
    for (const c of [meC, otC]) if (c && c.emote) { // 감정에 따라 몸짓
      const t = (performance.now() - c.emote.start) / 1000;
      if (c.emote.e === 'happy') c.hop = Math.abs(Math.sin(t * 9)) * 6;
      if (c.emote.e === 'angry') { c.dx = (c.dx || 0) + (Math.floor(t * 18) % 2 ? 1 : -1); c.hop = t < 1.2 ? Math.abs(Math.sin(t * 14)) * 2 : 0; }
      if (c.emote.e === 'sad') c.dy = (c.dy || 0) + 1;
      if (c.emote.e === 'surprise') c.hop = t < 0.4 ? Math.sin(t / 0.4 * Math.PI) * 7 : 0;
      if (c.emote.e === 'sleepy') c.dx = (c.dx || 0) + Math.sin(t * 2) * 1.2;
      if (c.emote.e === 'love') c.hop = Math.abs(Math.sin(t * 5)) * 3;
    }
    for (const n of scene.npcs || []) people.push({ set: n.set || NPCSPR[n.spr], x: n.x, y: n.y, face: n.face, moving: n.walking, step: n.step || 0, sit: n.sit, smoking: n.smoke, npc: n });
    return { people, animOn, phase, meC, otC, bdC };
  }
  function draw(time) {
    if (window.T3D && window.T3D.ready) return; // 3D 화면이 그림
    const [bx, by] = followCam();
    const tx = lim(bx + camOff.x, scene.pw, view.w), ty = lim(by + camOff.y, scene.ph, view.h), dtd = Math.min(0.05, Math.max(0, time - (draw.lt || time))); draw.lt = time;
    const snap = press || pinch || draw.scene !== scene || Math.hypot(tx - (draw.cx ?? tx), ty - (draw.cy ?? ty)) > 400;
    const f = 1; // 예전처럼 캐릭터에 바로 붙어서 따라감
    draw.cx = (draw.cx ?? tx) + (tx - (draw.cx ?? tx)) * f; draw.cy = (draw.cy ?? ty) + (ty - (draw.cy ?? ty)) * f; draw.scene = scene;
    cam.x = Math.round(draw.cx); cam.y = Math.round(draw.cy);
    updateCamBtn();
    const res = scene.res || 2;
    if (buf.width !== view.w * res) resize();
    bctx.setTransform(res, 0, 0, res, 0, 0); bctx.imageSmoothingEnabled = false;
    bctx.fillStyle = backdrop(); bctx.fillRect(0, 0, view.w, view.h);
    bctx.drawImage(scene.canvas, -cam.x, -cam.y, scene.pw, scene.ph);
    bctx.save(); bctx.translate(-cam.x, -cam.y);
    if (tapMark) { bctx.globalAlpha = tapMark.t / 0.6; top(bctx, tapMark.x + 0.1, tapMark.y + 0.1, 0.5, 0.8, 0.8, 'rgba(255,107,129,.5)'); bctx.globalAlpha = 1; }
    if (editing) { bctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 8); top(bctx, editing.x, editing.y, 0.4, editing.w, editing.h, '#ff6b81'); bctx.globalAlpha = 1; }
    if (scene.drawExtra) scene.drawExtra(bctx);
    // 깊이 순서로: 가구 · 장식 · 사람
    hits = [];
    const list = [];
    for (const f of scene.dyn || []) list.push({ key: f.x + (f.w || 1) / 2 + f.y + (f.h || 1) / 2 - 0.01, f });
    const { people, animOn, phase } = peopleNow();
    for (const c of people) list.push({ key: c.x / T + c.y / T + (c.pose === 'lie' ? 3.2 : 0.05), c });
    if (petE.show && townSt.pet) list.push({ key: petE.x / T + petE.y / T + 0.04, pet: true });
    const bed = scene.key === 'home' && scene.furniture.find((f) => f.kind === 'bed');
    if (bed && (player.pose === 'lie' || (other.visible && other.pose === 'lie') || (buddyHere() && buddy.pose === 'lie'))) list.push({ key: bed.x + bed.y + 6.5, blanket: bed });
    list.sort((a, b) => a.key - b.key);
    const tops = [];
    for (const it of list) {
      if (it.f) {
        if (it.f.kind === 'tower') {
          const bb = bbox(it.f.x, it.f.y, 0, it.f.w, it.f.h, 60), [ppx, ppy] = iso(player.x / T, player.y / T, 12);
          const behind = player.x / T + player.y / T < it.key && ppx > bb[0] && ppx < bb[2] && ppy > bb[1] && ppy < bb[3];
          if (behind) bctx.globalAlpha = 0.35;
          drawTower(bctx, it.f.b); bctx.globalAlpha = 1;
          continue; } // 타워는 바닥 칸으로만 판정 (화면을 넓게 가려서)
        if (it.f.ride && (player.ride === it.f.ride || (other.visible && other.ride === it.f.ride))) continue; // 타고 나간 자전거·오토바이
        drawFurniture(bctx, it.f, time);
        const obj = scene.objects.find((o) => o.furn === it.f || (o.id && o.id === it.f.id));
        if (obj) hits.push({ box: bbox(it.f.x, it.f.y, 0, it.f.w, it.f.h, obj.hitH || 12), obj });
      } else if (it.pet) {
        const [px, py] = iso(petE.x / T, petE.y / T);
        const b = drawPet(bctx, px, py, townSt.pet, time, petE.react);
        const gg = petGrow(townSt.pet); if (gg != null) { const gx = Math.round((b[0] + b[2]) / 2) - 8; R(bctx, gx - 1, b[1] - 6, 18, 4, 'rgba(255,255,255,.9)'); R(bctx, gx, b[1] - 5, 16, 2, '#f3e6ee'); R(bctx, gx, b[1] - 5, Math.max(1, Math.round(16 * gg)), 2, '#ff8fab'); } // 알 위 성장 게이지
        hits.push({ box: [b[0] - 3, b[1] - 3, b[2] + 3, b[3] + 2], pet: true });
        tops.push({ c: { petBub: true }, b });
      } else if (it.blanket) {
        const sl = [];
        const add = (who) => sl.push(who === 'girl' ? 0.75 : 2.05);
        if (player.pose === 'lie') add(me);
        if ((other.visible && other.pose === 'lie') || (buddyHere() && buddy.pose === 'lie')) add(partner);
        drawBlanket(bctx, { ...it.blanket, sleepers: sl });
      }
      else {
        const b = drawPerson(bctx, it.c);
        if (it.c.emote) drawEmote(bctx, it.c, b, time);
        if (it.c.biteMark) { const mx = (b[0] + b[2]) / 2 + 3, my = b[1] + 14; for (const k of [0, 3]) { R(bctx, mx + k, my, 2, 1, '#ffffff'); R(bctx, mx + k, my + 1, 1, 1, '#e06f7d'); } }
        if (it.c.partner) hits.push({ box: b, partner: true });
        if (it.c.buddy) hits.push({ box: b, buddy: true });
        if (it.c.npc && it.c.npc.lines) hits.push({ box: b, npc: it.c.npc });
        tops.push({ c: it.c, b });
      }
    }
    // 가게·문 같은 큰 물체 (아래 깔린 판정용)
    for (const o of scene.objects) if (o.interact && !o.furn && !OUTSIDE.has(scene.key) && !hits.some((h) => h.obj === o)) hits.unshift({ box: bbox(o.x, o.y, 0, o.w || 1, o.h || 1, o.hitH || 10), obj: o });
    // 효과
    fx.puffs.forEach((p) => { const [px, py] = iso(p.gx, p.gy, 0); const k = 1 - p.t / p.life; circle(bctx, px + p.dx + Math.sin(k * 5) * 3, py - 14 - k * 16, 1.5 + k * 3, `rgba(235,235,240,${0.7 * (p.t / p.life)})`); });
    fx.notes.forEach((h) => { const k = 1 - h.t / h.life; bctx.fillStyle = `rgba(90,60,140,${Math.min(1, h.t * 1.5)})`; bctx.font = '9px sans-serif'; bctx.fillText(h.ch, h.x + Math.sin(k * 5) * 4, h.y - k * 16); });
    fx.hearts.forEach((h) => { const k = 1 - h.t / h.life; pixHeart(bctx, h.x + Math.sin(k * 6 + h.s) * 3, h.y - k * 18, Math.min(1, h.t * 1.5)); });
    const entr = scene.entrance ? drawEntrance(bctx, time) : null;
    for (const { c, b } of tops) if (c.pose === 'lie') { bctx.fillStyle = '#7a8cff'; bctx.font = '7px sans-serif'; const k = (time * 0.8) % 1; bctx.fillText('z', b[2] - 2, b[1] - k * 6); bctx.fillText('Z', b[2] + 2, b[1] - 6 - ((k + 0.5) % 1) * 6); }
    if (animOn && phase >= 1.2) for (const { c, b } of tops) if (c.me || c.partner || c.buddy) heartBubble(bctx, (b[0] + b[2]) / 2, b[1] - 24);
    // 손잡기: 서로 손을 뻗어 맞잡은 손 (선 없이)
    if (buddyHere() && buddy.hold && !animOn && !buddy.pose && !player.pose) {
      const me0 = tops.find((t) => t.c.me), bd0 = tops.find((t) => t.c.buddy);
      if (me0 && bd0) {
        const ax = (me0.b[0] + me0.b[2]) / 2, bx = (bd0.b[0] + bd0.b[2]) / 2, ay = me0.b[3] - 13, by = bd0.b[3] - 13;
        const [lx, ly, rx, ry] = ax < bx ? [ax, ay, bx, by] : [bx, by, ax, ay];
        const mx = Math.round((lx + rx) / 2), my = Math.round((ly + ry) / 2) + 1;
        R(bctx, lx + 4, ly, mx - lx - 3, 2, '#ffe2cf'); R(bctx, mx, ry, rx - mx - 3, 2, '#ffe2cf'); // 팔
        R(bctx, mx - 2, my - 1, 4, 3, '#3a2a2e'); R(bctx, mx - 1, my - 1, 3, 2, '#ffd2bd'); R(bctx, mx - 2, my, 1, 1, '#ffd2bd'); // 맞잡은 손
      }
    }
    // 밤 · 노을
    const sk = sky(), indoor = !OUTSIDE.has(scene.key);
    if (sk.warm > 0) { bctx.fillStyle = `rgba(255,140,60,${0.14 * sk.warm * (indoor ? 0.5 : 1)})`; bctx.fillRect(cam.x, cam.y, view.w, view.h); }
    if (sk.dark > 0) {
      const homeDark = scene.key === 'home' && !townSt.lights; // 집: 불을 끄면 깜깜
      bctx.fillStyle = `rgba(16,20,56,${(scene.key === 'home' ? (homeDark ? 0.74 : 0.22) : indoor ? 0.28 : 0.58) * sk.dark})`; bctx.fillRect(cam.x, cam.y, view.w, view.h);
      bctx.globalCompositeOperation = 'lighter';
      for (const l of homeDark ? (scene.lights || []).filter((l) => l.always) : scene.lights || []) { const [lx, ly] = iso(l.gx, l.gy, l.z || 0); const gr = bctx.createRadialGradient(lx, ly, 0, lx, ly, l.r); gr.addColorStop(0, `rgba(${l.c},${0.32 * l.a * sk.dark})`); gr.addColorStop(1, `rgba(${l.c},0)`); bctx.fillStyle = gr; bctx.fillRect(lx - l.r, ly - l.r, l.r * 2, l.r * 2); }
      bctx.globalCompositeOperation = 'source-over';
      if (scene.key === 'home') { // 무드등 불빛 (불을 꺼도 보임)
        bctx.globalCompositeOperation = 'lighter';
        for (const f of scene.furniture || []) { const md = f.kind === 'moodlamp' && (townSt.lamps || {})[f.id]; if (!md) continue; const [lx, ly] = iso(f.x + 0.5, f.y + 0.5, 12), r = 72; const gr = bctx.createRadialGradient(lx, ly, 0, lx, ly, r); gr.addColorStop(0, `rgba(${LAMP_COL[md][1]},${0.7 * sk.dark})`); gr.addColorStop(1, `rgba(${LAMP_COL[md][1]},0)`); bctx.fillStyle = gr; bctx.fillRect(lx - r, ly - r, r * 2, r * 2); }
        bctx.globalCompositeOperation = 'source-over';
        nightWindows(bctx);
      }
    }
    bctx.restore();

    ctx.imageSmoothingEnabled = false;
    // 시점 기울이기: t < 0 위에서 내려다봄(세로로 늘림) · 0 비스듬히 · t > 0 정면으로 (바닥은 위로 눌리고 가게 앞모습이 아래에서 올라옴)
    const ft = fv.t, Hc = cv.height;
    fv.sy = ft < 0 ? 1 - 0.45 * ft : 1 - 0.5 * Math.max(0, ft); fv.anchor = ft < 0 ? Hc / 2 : 0;
    const Y = (py) => fv.anchor + (py - fv.anchor) * fv.sy;
    if (ft > 0) { ctx.fillStyle = backdrop(); ctx.fillRect(0, 0, cv.width, Hc); }
    if (ft < 0.999) { ctx.globalAlpha = ft > 0 ? Math.max(0, 1 - ft * ft) : 1; ctx.drawImage(buf, 0, Y(0), view.w * view.scale, view.h * view.scale * fv.sy); ctx.globalAlpha = 1; }
    if (ft > 0.001) drawFront(ft, time);
    if (ft > 0.6) return; // 정면에서는 아래 이름표·말풍선을 정면 그림에서 따로 그림
    const s = view.scale;
    for (const l of scene.labels || []) { const px = (l.wx - cam.x) * s, py = Y((l.wy - cam.y) * s); if (px < -200 || py < -60 || px > cv.width + 200 || py > cv.height + 60) continue; drawLabel(l, px, py, s); }
    if (scene.catBub && scene.catBub.until > Date.now()) { const [cx2, cy2] = iso(scene.catBub.gx, scene.catBub.gy, 12); speech(scene.catBub.text, (cx2 - cam.x) * s, Y((cy2 - cam.y) * s)); }
    if (entr) nameTag('🏠 우리집 입구', (entr[0] - cam.x) * s, Y((entr[1] - 3 - cam.y) * s), '#e8902a');
    const now = Date.now();
    for (const { c, b } of tops) {
      const cx = ((b[0] + b[2]) / 2 - cam.x) * s, ty = Y((b[1] - 2 - cam.y) * s);
      if (c.me) nameTag(names[me], cx, ty, '#ff6b81');
      if (c.partner) nameTag(names[partner], cx, ty, '#6f86c9');
      if (c.npc && c.npc.name) nameTag(c.npc.name, cx, ty, '#2f8a4a');
      if (c.buddy) nameTag(names[partner], cx, ty, '#6f86c9');
      const bub = c.me ? fx.bubbles[me] : c.partner ? fx.bubbles[partner] : c.buddy ? buddy.bubble : c.npc ? c.npc.bubble : c.petBub ? petE.bubble : null;
      if (bub && bub.until > now && !(animOn && (c.me || c.partner || c.buddy) && phase > 0.3)) speech(bub.text, cx, ty - (c.npc && !c.npc.name ? 0 : 14 * dprNow()));
    }
  }
  // 오피스텔 입구 표시: 반짝이는 바닥 + 통통 튀는 화살표 (건물 위에 겹쳐 그려서 항상 보임)
  const ARROW = ['.XXXXX.', '.XoooX.', '.XoooX.', 'XXoooXX', 'XoooooX', '.XoooX.', '..XoX..', '...X...'];
  function drawEntrance(g, time) {
    const e = scene.entrance, pul = 0.5 + 0.5 * Math.sin(time * 4);
    g.globalAlpha = 0.3 + 0.4 * pul; top(g, 14.05, 30.35, 0.3, 0.9, 2.3, '#ffd36b'); g.globalAlpha = 1;
    const [ax, ay] = iso(e.gx, e.gy, 0), bob = Math.round(Math.abs(Math.sin(time * 3)) * 4);
    const x = Math.round(ax) - 7, y = Math.round(ay) - 40 - bob;
    ARROW.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') R(g, x + i * 2, y + j * 2, 2, 2, ch === 'X' ? '#5a3410' : '#ffb938'); }));
    hits.push({ box: [ax - 16, y - 14, ax + 16, ay + 4], entrance: true });
    return [ax, y];
  }
  function pixHeart(g, x, y, a) { g.globalAlpha = a; HEART.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') R(g, x - 3 + i, y + j, 1, 1, '#ff4f72'); })); g.globalAlpha = 1; }
  function nightWindows(g) { const sk = sky(); for (const x of [7, 8, 9, 10, 11, 12, 14, 15, 16, 17]) { sRect(g, 0.61, x + 0.12, x + 0.88, 10, 28, `rgba(20,24,70,${0.85 * sk.dark})`); const [sx, sy] = iso(x + 0.5, 0.61, 24 - (x % 3) * 4); R(g, sx, sy, 1, 1, '#fff7c2'); } const [mx, my] = iso(11.5, 0.61, 24); circle(g, mx, my, 2.5, '#fff3b0'); }

  const dprNow = () => cv.width / (cv.clientWidth || 1);
  function drawLabel(l, px, py, s) {
    const d = dprNow(), max = (l.max || 60) * s;
    let fs = (l.small ? 11 : 13) * d;
    ctx.font = `${fs}px "Poor Story", sans-serif`;
    let lines = [l.text];
    const widest = () => Math.max(...lines.map((t) => ctx.measureText(t).width));
    while (widest() > max && fs > 9 * d) { fs -= d; ctx.font = `${fs}px "Poor Story", sans-serif`; }
    if (widest() > max && l.text.includes(' ')) { const parts = l.text.split(' '); const mid = Math.ceil(parts.length / 2); lines = [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')]; }
    const tw = widest(), padX = fs * 0.4, lh = fs * 1.15, h = lh * lines.length + fs * 0.2;
    if (l.bg !== 'transparent') { ctx.fillStyle = l.bg; roundRect(px - tw / 2 - padX, py - h / 2, tw + padX * 2, h, fs * 0.35); ctx.fill(); }
    ctx.fillStyle = l.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (l.glow) { ctx.shadowColor = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 6 * d; }
    lines.forEach((t, i) => ctx.fillText(t, px, py - ((lines.length - 1) * lh) / 2 + i * lh + fs * 0.06));
    ctx.shadowBlur = 0;
  }
  function nameTag(text, px, py, color) {
    const d = dprNow(), fs = 10.5 * d;
    ctx.font = `${fs}px "Poor Story", sans-serif`;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; roundRect(px - tw / 2 - 5 * d, py - fs - 3 * d, tw + 10 * d, fs + 6 * d, 6 * d); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText(text, px, py);
  }
  function speech(text, px, py) {
    text = String(text).startsWith('\u2063') ? String(text).slice(1) : noEmoji(text); // 채팅은 그대로, 나머지 말풍선은 이모지 없이
    if (!text) return;
    const d = dprNow(), fs = 12.5 * d;
    ctx.font = `${fs}px "Poor Story", sans-serif`;
    // 길어도 자르지 않고 여러 줄로 다 보여줌
    const maxW = Math.min(cv.width - 24 * d, 190 * d), lines = [];
    let cur = '';
    for (const ch of String(text)) { if (ch === '\n') { lines.push(cur); cur = ''; continue; } if (cur && ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch.trim(); } else cur += ch; }
    if (cur) lines.push(cur);
    const lh = fs * 1.3, tw = Math.max(...lines.map((l) => ctx.measureText(l).width)), w = tw + 16 * d, h = lh * lines.length + 10 * d;
    const bx = Math.max(4 * d, Math.min(cv.width - w - 4 * d, px - w / 2)), by = Math.max(4 * d, py - h - 6 * d);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4a3036'; ctx.lineWidth = 2 * d;
    roundRect(bx, by, w, h, 8 * d); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px - 5 * d, by + h - 1); ctx.lineTo(px, by + h + 6 * d); ctx.lineTo(px + 5 * d, by + h - 1); ctx.fill();
    ctx.fillStyle = '#4a3036'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, bx + w / 2, by + 5 * d + lh * (i + 0.5) + d));
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

  // ---------- 행동 ----------
  const furnPt = (f, lx, ly) => rotPt({ f, r: f.rot || 0, W0: f.w0 || f.w, D0: f.h0 || f.h }, f.x + lx, f.y + ly);
  const furnFace = (f, face) => { const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[face]; const [dx, dy] = rotVec(f.rot || 0, v[0], v[1]); return dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up'; };
  function sitDown(sofa) {
    const s1 = furnPt(sofa, 0.45, 1), s2 = furnPt(sofa, 0.45, 2.2);
    const taken = other.visible && other.pose === 'sit' && Math.hypot(other.x / T - s1[0], other.y / T - s1[1]) < 0.5;
    const [sx, sy] = taken ? s2 : s1;
    player.x = sx * T; player.y = sy * T; player.face = furnFace(sofa, 'left'); player.pose = 'sit';
    if (withBuddy()) { const [bx, by] = taken ? s1 : s2; buddy.x = bx * T; buddy.y = by * T; buddy.face = player.face; buddy.pose = 'sit'; buddy.bubble = { text: '같이 앉자~ 💕', until: Date.now() + 2000 }; }
    say('폭신한 소파에 앉았어요. 화면을 누르면 일어나요.'); syncSoon();
  }
  const withBuddy = () => buddyHere() && buddy.hold;
  function sitChair(f) {
    const [sx, sy] = furnPt(f, 0.5, 0.55); player.x = sx * T; player.y = sy * T; player.face = 'down'; player.pose = 'sit';
    if (withBuddy()) { buddy.x = player.x + 0.65 * T; buddy.y = player.y; buddy.face = 'down'; buddy.pose = ''; buddy.bubble = { text: '나도 옆에 있을게~', until: Date.now() + 2000 }; }
    syncSoon();
  }
  function smoke(f) { sitChair(f); player.smoke = 8; sendAct({ type: 'smoke' }); say('베란다에서 담배 한 대… 후~'); if (withBuddy()) buddy.bubble = { text: '후~ 같이 바람 쐬자', until: Date.now() + 3000 }; }
  function lieDown(bed) {
    const left = me === 'girl';
    const [lx, ly] = furnPt(bed, left ? 0.75 : 2.05, 0.55);
    player.x = lx * T; player.y = ly * T; player.face = 'down'; player.pose = 'lie';
    if (withBuddy()) { const [bx, by] = furnPt(bed, left ? 2.05 : 0.75, 0.55); buddy.x = bx * T; buddy.y = by * T; buddy.face = 'down'; buddy.pose = 'lie'; buddy.bubble = { text: '같이 코~ 자자 💤', until: Date.now() + 2200 }; }
    say((other.visible && other.pose === 'lie') || withBuddy() ? '같이 이불 덮고 누웠어요 💕' : '침대에 누웠어요. 쿨쿨… 좋은 꿈 꿔요 💤'); syncSoon();
  }
  function standUp() {
    if (!player.pose) return;
    player.smoke = 0;
    const [tx, ty] = ptile();
    const spot = walkable(scene, tx, ty) ? [tx, ty] : nearestWalkable(tx, ty);
    if (spot) { player.x = spot[0] * T + T / 2; player.y = spot[1] * T + T / 2; }
    player.pose = ''; syncSoon();
    if (buddy.pose) { // 같이 누워/앉아 있던 상대도 일어나서 바닥으로 내려옴 (예전엔 침대 위에 선 채로 굳었음)
      const wasLie = buddy.pose === 'lie'; buddy.pose = '';
      const bt = nearestWalkable(Math.floor(buddy.x / T), Math.floor(buddy.y / T));
      if (bt) { buddy.x = bt[0] * T + T / 2; buddy.y = bt[1] * T + T / 2; }
      if (buddy.hold) { buddy.x = player.x + 0.62 * T; buddy.y = player.y; }
      else { const [px, py] = ptile(), nb = [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]].find(([x, y]) => walkable(scene, x, y)); if (nb) buddy.target = [nb[0] * T + T / 2, nb[1] * T + T / 2]; }
      if (wasLie) buddy.bubble = { text: '잘 잤다~ 하암 😪', until: Date.now() + 2400 };
    }
  }
  function buddySays(text) { if (withBuddy()) buddy.bubble = { text, until: Date.now() + 2500 }; }
  function toggleTv() { buddySays(tvOn ? '벌써 끄게? 히히' : '뭐 볼까? 재밌는 거!'); tvOn = !tvOn; tvState = { on: tvOn, at: Date.now() }; say(tvOn ? 'TV를 켰어요! 📺 뭐 볼까?' : 'TV를 껐어요.', tvOn ? [{ label: '오늘의 편지 보기', go: '/?view=letters' }] : []); beep(tvOn ? 660 : 330, 0.08); syncSoon(); }
  // 기타: 들고 치면서 흥얼흥얼 (직접 만든 짧은 곡)
  const SONG = (() => { // [음 높이(반음, 도=0), 길이(박)] — 밝은 C장조 멜로디
    const m = [[7, 1], [9, 1], [11, 1], [12, 2], [11, 1], [9, 1], [7, 2], [4, 1], [5, 1], [7, 2], [9, 1], [7, 1], [5, 1], [4, 1], [2, 2],
      [4, 1], [5, 1], [7, 1], [12, 1.5], [11, 0.5], [9, 1], [7, 1], [9, 1], [11, 1], [12, 3]];
    const chords = [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]]; // C · Am · F · G
    return { m, chords };
  })();
  const hz = (semi) => 261.63 * Math.pow(2, semi / 12);
  let songStop = null;
  function playSong() {
    audio(); if (!ac) return 0;
    if (songStop) songStop();
    const beat = 0.32, t0 = ac.currentTime + 0.05, nodes = [];
    const pluck = (f, at, dur, type, vol) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, at + dur);
      o.connect(g).connect(ac.destination); o.start(at); o.stop(at + dur + 0.05); nodes.push(o);
    };
    let t = 0;
    SONG.m.forEach(([n, len]) => { pluck(hz(n + 12), t0 + t * beat, len * beat * 0.95, 'triangle', 0.09); t += len; });
    const total = t;
    for (let b = 0; b < total; b += 2) { // 두 박마다 코드 스트럼
      const ch = SONG.chords[Math.floor(b / 4) % SONG.chords.length];
      ch.forEach((n, i) => pluck(hz(n - 12), t0 + b * beat + i * 0.025, beat * 1.8, 'sawtooth', 0.018));
    }
    songStop = () => { nodes.forEach((o) => { try { o.stop(); } catch {} }); songStop = null; };
    return total * beat;
  }
  let myGuitarUntil = 0;
  const guitarInHand = () => myGuitarUntil > Date.now() || other.guitarUntil > Date.now();
  function playGuitar(g) {
    const secs = playSong() || 8;
    myGuitarUntil = Date.now() + secs * 1000;
    player.face = 'down';
    fx.bubbles[me] = { text: '🎵 흥얼흥얼~ ♪', until: myGuitarUntil };
    if (withBuddy()) buddy.bubble = { text: '👏 짝짝~ 같이 불러요 🎶', until: myGuitarUntil };
    sendAct({ type: 'guitar', secs });
    syncSoon();
  }
  // ---------- 탈것: 공유 자전거 · 노란 오토바이 (뒤에 한 명 더) ----------
  const RIDE_SPEED = { b0: 1.8, b1: 1.8, m: 2.6 };
  const behind = (r, k = 0.45) => { const v = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] }[r.face] || [0, 1]; return [r.x - v[0] * k * T, r.y - v[1] * k * T]; };
  function mountAsk(prop) {
    if (player.ride || player.pillion) return say('이미 타고 있어요! 🛑 내리기를 먼저 눌러요');
    if (other.visible && other.ride === prop.ride) return say(`${names[partner]}가 타고 있어요!`, prop.ride === 'm' ? [{ label: '뒤에 타기 🛵', fn: hopOn }] : []);
    const moto = prop.ride === 'm';
    say(moto ? '노란 오토바이! 노란 헬멧 쓰고 드라이브 갈까요? 🛵' : '공유 자전거예요. 타고 동네 한 바퀴? 🚲', [{ label: moto ? '헬멧 쓰고 타기 ⛑️' : '자전거 타기 🚲', fn: () => mount(prop) }]);
  }
  function mount(prop) {
    player.ride = prop.ride; player.pose = ''; player.face = 'down';
    if (prop.ride === 'm') { [110, 130, 160, 200].forEach((f, i) => beep(f, 0.18, i * 0.12)); toast('노란 헬멧 착용! 부릉부릉~ 🛵'); }
    else { melody([1568, 0, 1568]); toast('따릉따릉~ 🚲'); }
    if (buddyHere() && prop.ride === 'm') { buddy.pillion = true; buddy.hold = false; buddySays('나도 뒤에 탈래! 꽉 잡을게 💕'); }
    updateRideBtn(); syncSoon();
  }
  function dismount() {
    const was = player.ride, pil = player.pillion;
    player.ride = null; player.pillion = false; buddy.pillion = false; path = [];
    const t = nearestWalkable(Math.floor(player.x / T), Math.floor(player.y / T)) || ptile();
    player.x = t[0] * T + T / 2; player.y = t[1] * T + T / 2;
    if (pil) toast('내렸어요! 재밌었다 💕'); else if (was) toast(was === 'm' ? '오토바이를 제자리에 세워뒀어요 ⛑️' : '자전거를 거치대에 돌려놨어요 🚲');
    updateRideBtn(); syncSoon();
  }
  function hopOn() {
    if (!other.visible || other.ride !== 'm') return toast(`${names[partner]}가 오토바이에 없어요`);
    player.ride = null; player.pillion = true; player.pose = ''; path = [];
    toast(`${names[partner]} 뒤에 탔어요! 꽉 잡아요 💕`); melody([784, 988, 1175]); sendAct({ type: 'hopon' }); updateRideBtn(); syncSoon();
  }
  function updateRideBtn() { const b = document.getElementById('rideBtn'); if (b) { b.hidden = !(player.ride || player.pillion); b.innerHTML = `${TOWN_ICONS.img('stop')} ${player.pillion ? '내리기' : player.ride === 'm' ? '오토바이 내리기' : '자전거 내리기'}`; } }
  function meow(cat) {
    cat.meow = performance.now() + 2600;
    scene.catBub = { gx: cat.x + 0.5, gy: cat.y + 0.5, until: Date.now() + 2300, text: ['야옹~ 🐱', '냐아앙~', '미야옹? 🐾', '골골골… 💤', '냥!'][Math.floor(Math.random() * 5)] };
    if (ac) { const o = ac.createOscillator(), g2 = ac.createGain(), t0 = ac.currentTime; o.type = 'triangle'; o.frequency.setValueAtTime(620, t0); o.frequency.linearRampToValueAtTime(1050, t0 + 0.18); o.frequency.linearRampToValueAtTime(560, t0 + 0.55); g2.gain.setValueAtTime(0.001, t0); g2.gain.linearRampToValueAtTime(0.09, t0 + 0.06); g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6); o.connect(g2).connect(ac.destination); o.start(t0); o.stop(t0 + 0.65); }
    OX = scene.ox; OY = scene.oy; const [px, py] = iso(cat.x + 0.5, cat.y + 0.5); for (let i = 0; i < 3; i++) fx.hearts.push({ x: px - 5 + Math.random() * 10, y: py - 10, t: 1 + Math.random(), life: 2, s: Math.random() * 6 });
    buddySays('고양이 귀여워!! 🥹');
  }
  function tapPartner() {
    const extra = [];
    if (player.ride === 'm' && !other.pillion) extra.push({ label: '뒤에 태우기 🛵', fn: () => { sendAct({ type: 'invite' }); toast('같이 타자고 했어요! 🛵'); } });
    if (other.ride === 'm' && !player.ride && !player.pillion) extra.push({ label: '뒤에 타기 🛵', fn: hopOn });
    say(`${names[partner]}에게 뭘 할까요?`, [...extra, { label: '꼭 안아주기 🤗', fn: () => approachPartner('hug') }, { label: '뽀뽀하기 💋', fn: () => approachPartner('kiss') }, { label: '앙 깨물기 😬', fn: () => approachPartner('bite') }, { label: '감정 표현 😊', fn: () => openEmotes() }]);
  }
  function approachPartner(type) {
    const tx = Math.floor(other.tx / T), ty = Math.floor(other.ty / T);
    const [px, py] = ptile();
    const spots = [[tx - 1, ty], [tx + 1, ty], [tx, ty + 1], [tx, ty - 1]].filter(([x, y]) => walkable(scene, x, y));
    spots.sort((a, b) => Math.abs(a[0] - px) + Math.abs(a[1] - py) - (Math.abs(b[0] - px) + Math.abs(b[1] - py)));
    const doIt = () => { sendAct({ type }); showAct({ type }, true); };
    if (other.pose || !spots.length || Math.abs(px - tx) + Math.abs(py - ty) <= 1) return doIt();
    walkTo(spots[0][0], spots[0][1], doIt);
  }
  function showAct(a, mine) {
    if (a.type === 'guitar') {
      if (!mine) { const secs = playSong() || 8; other.guitarUntil = Date.now() + secs * 1000; fx.bubbles[partner] = { text: '🎵 흥얼흥얼~ ♪', until: other.guitarUntil }; toast(`${names[partner]}가 기타를 쳐요 🎸`); }
      return;
    }
    if (a.type === 'smoke') { if (!mine) other.smokeUntil = Date.now() + 8000; return; }
    if (a.type === 'emote') { if (!mine && EMOTES[a.e]) { other.emote = { e: a.e, start: performance.now(), until: performance.now() + 4200 }; fx.bubbles[partner] = { text: EMOTES[a.e].line, until: Date.now() + 3200 }; emoteSound(a.e); } return; }
    if (a.type === 'pet') { if (!mine) { petE.react = { kind: a.kind, until: performance.now() + 2600 }; toast(`${names[partner]}가 ${{ wipe: '알을 닦아줬어요 🧽', guitar: '기타를 쳐줬어요 🎸', warm: '품어줬어요 🤲', knock: '톡톡 두드렸어요', talk: '말을 걸어줬어요 💬', feed: '밥을 줬어요 🍽️', play: '놀아줬어요 🎈', sleep: '재워줬어요 🌙' }[a.kind] || '펫을 돌봤어요'}`); } return; }
    if (a.type === 'hopon') { if (!mine) { toast(`${names[partner]}가 뒤에 탔어요! 출발~ 🛵💨`); melody([784, 988, 1175]); } return; }
    if (a.type === 'invite') { if (!mine) say(`${names[partner]}가 오토바이 뒤에 타래요! 🛵`, [{ label: '뒤에 타기 🛵', fn: hopOn }, { label: '다음에~', fn: () => {} }]); return; }
    if (a.type === 'eat') { if (!mine) { other.hold = a.id ? { id: a.id, until: Date.now() + (a.step === 'carry' ? 15000 : 7000), sip: a.step !== 'carry' } : null; if (a.step === 'carry') return; fx.bubbles[partner] = { text: a.kind === 'drink' ? `꿀꺽~ ${a.name} 마시는 중` : `냠냠~ ${a.name} 먹는 중`, until: Date.now() + 3200 }; if (!other.visible) toast(`${names[partner]}가 ${a.name}을(를) ${a.kind === 'drink' ? '마셨어요' : '먹었어요'}`); } return; }
    if (a.type === 'meal') { if (!mine) mealFromPartner(a); return; }
    if (a.type === 'cook') { if (!mine) toast(`${names[partner]}가 ${a.title || '요리'}를 만들었어요! 🍳`); return; }
    if (a.type === 'bite') { anim = { type: 'bite', mine, start: performance.now(), until: performance.now() + 3800 }; biteFx('partner', mine); return; }
    anim = { type: a.type, start: performance.now(), until: performance.now() + 3800 };
    setTimeout(() => { // 안긴 뒤 하트 퐁퐁
      OX = scene.ox; OY = scene.oy;
      const [ax, ay] = iso(player.x / T, player.y / T), [bx, by] = other.visible ? iso(other.x / T, other.y / T) : [ax, ay];
      for (let i = 0; i < 7; i++) fx.hearts.push({ x: (ax + bx) / 2 - 8 + Math.random() * 16, y: Math.min(ay, by) - 30 + Math.random() * 6, t: 1.2 + Math.random() * 1.2, life: 2.4, s: Math.random() * 6 });
    }, a.type === 'kiss' ? 700 : 500);
    melody(a.type === 'kiss' ? [1047, 1319, 1568] : [784, 988, 1175, 1568]);
  }

  // ---------- 실시간 ----------
  const other = { visible: false, x: 0, y: 0, tx: 0, ty: 0, face: 'down', walking: false, step: 0, pose: '', scene: '', online: false, smokeUntil: 0, guitarUntil: 0, ride: '', pillion: false };
  let actOut = '', lastActSeen = 0, tvState = { on: false, at: 0 }, chatSince = new Date(Date.now() - 10 * 60e3).toISOString();
  const seenChat = new Set();
  let syncTimer = null, syncing = false;
  function sendAct(a) { actOut = JSON.stringify({ ...a, at: Date.now() }); syncSoon(); }
  function syncSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 60); }
  async function sync() {
    clearTimeout(syncTimer);
    if (document.hidden) return; // 안 보고 있으면 보고하지 않음 (나가면 바로 오프라인)
    if (syncing || !scene) { syncTimer = setTimeout(sync, SYNC_MS); return; }
    syncing = true;
    try {
      const r = await fetch('/api/town/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ me, scene: scene.key, x: player.x, y: player.y, face: player.face, moving: player.moving, pose: player.pose, act: actOut, tv: JSON.stringify({ on: tvState.on, at: tvState.at, o: outfit[me], rd: player.ride || '', pl: player.pillion ? 1 : 0 }), since: chatSince, layoutAt, stateAt }) });
      const d = await r.json();
      if (d.ok) applyRemote(d);
    } catch {}
    syncing = false;
    if (!document.hidden) syncTimer = setTimeout(sync, player && player.ride && player.moving ? 300 : SYNC_MS); // 탈것으로 달릴 땐 더 자주 알려서 상대 화면이 매끄럽게
  }
  function applyRemote(d) {
    if (d.layout !== undefined && d.layoutAt !== layoutAt && !editing) { layoutAt = d.layoutAt; try { layout = JSON.parse(d.layout || '{}'); } catch { layout = {}; } rebuildHome(); renderInv(); }
    else if (d.layoutAt) layoutAt = layoutAt || d.layoutAt;
    checkVoice(d.voiceAt);
    if (d.photosAt && d.photosAt !== photosAt) { photosAt = d.photosAt; photoOp({ op: 'list' }); }
    if (d.state !== undefined && d.stateAt !== stateAt) { try { applyState(JSON.parse(d.state || '{}'), d.stateAt); } catch {} }
    else if (!stateLoaded && d.stateAt === '') { stateLoaded = true; ensurePet(); }
    const p = d.partner;
    other.online = Boolean(p);
    const same = Boolean(p && p.scene === scene.key);
    if (same) { if (!other.visible) { other.x = p.x; other.y = p.y; } other.tx = p.x; other.ty = p.y; other.pose = p.pose || ''; if (!other.walking || other.pose) other.face = p.face; }
    other.visible = same; other.scene = p ? p.scene : '';
    if (other.online && buddy.on) { buddy.on = false; buddy.hold = false; if (anim && anim.with === 'buddy') anim = null; } // 진짜로 접속하면 대신 있던 캐릭터는 사라짐
    if (p && p.act) {
      try {
        const a = JSON.parse(p.act);
        if (a.at > lastActSeen) {
          const first = lastActSeen === 0; lastActSeen = a.at;
          const recent = !first && Date.now() - a.at < 8000;
          if (recent && same) showAct(a, false);
          else if (recent && (a.type === 'hug' || a.type === 'kiss')) toast(`${names[partner]}가 ${a.type === 'hug' ? '안아주려고' : '뽀뽀하려고'} 찾고 있어요 💕`);
        }
      } catch {}
    }
    try { const t = JSON.parse(d.partnerTv || '{}'); if (t.at > tvState.at) { tvState = { on: Boolean(t.on), at: t.at }; tvOn = Boolean(t.on); } if (OUTFIT_IDS[partner].includes(t.o)) outfit[partner] = t.o; other.ride = ['b0', 'b1', 'm'].includes(t.rd) ? t.rd : ''; other.pillion = Boolean(t.pl); } catch {}
    for (const c of d.chats || []) {
      if (seenChat.has(c.id)) continue;
      seenChat.add(c.id); chatLog.push(c);
      if (c.created_at > chatSince) chatSince = c.created_at;
      if (c.avatar !== me && Date.now() - Date.parse(c.created_at) < 30000) { fx.bubbles[partner] = { text: '\u2063' + c.text, until: Date.now() + 6000 }; if (!other.visible) toast(`${names[partner]}: ${c.text}`); if (chatPanel.hidden) chatUnread += 1; }
    }
    renderChat(); updateStatus();
  }
  function updateStatus() {
    const el = document.getElementById('status'); if (!el) return;
    const where = { street: '거리', yunseul: '윤슬역 앞', beach: '윤슬해수욕장', lobby: '1층 로비', hall: '4층 복도', home: '우리 집', jumak: '달빛주막' }[other.scene] || '';
    el.textContent = other.online ? `${names[partner]} 접속 중 · ${where}` : `${names[partner]} 오프라인`;
    el.classList.toggle('on', other.online);
  }
  const chatLog = [];
  let chatUnread = 0;
  const chatPanel = document.getElementById('chatPanel');
  const chatInput = document.getElementById('chatInput');
  document.getElementById('chatBtn').onclick = () => { chatPanel.hidden = !chatPanel.hidden; chatUnread = 0; renderChat(); if (!chatPanel.hidden) chatInput.focus(); };
  document.getElementById('chatForm').onsubmit = async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim(); if (!text) return;
    chatInput.value = ''; fx.bubbles[me] = { text: '\u2063' + text, until: Date.now() + 6000 };
    try { const r = await fetch('/api/town/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ me, text }) }); const d = await r.json(); if (d.chat && !seenChat.has(d.chat.id)) { seenChat.add(d.chat.id); chatLog.push(d.chat); renderChat(); } }
    catch { toast('채팅을 보내지 못했어요'); }
  };
  function renderChat() {
    const badge = document.getElementById('chatBadge'); badge.hidden = !chatUnread; badge.textContent = chatUnread;
    if (chatPanel.hidden) return;
    const list = document.getElementById('chatList');
    list.innerHTML = chatLog.slice(-40).map((c) => `<div class="msg ${c.avatar === me ? 'mine' : ''}"><b>${esc(names[c.avatar])}</b><span>${esc(c.text)}</span></div>`).join('') || '<p class="empty">같이 있을 때 한마디 남겨봐요!</p>';
    list.scrollTop = list.scrollHeight;
  }

  // ---------- UI ----------
  const sayEl = document.getElementById('say');
  function say(text, actions = []) {
    sayEl.innerHTML = `<p>${esc(text)}</p>${actions.length ? `<div class="say-btns">${actions.map((a, i) => `<button type="button" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}`;
    sayEl.hidden = false;
    sayEl.querySelectorAll('button').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const a = actions[b.dataset.i]; if (a.go) leaveTo(a.go); else if (a.fn) { closeSay(); a.fn(); } }));
  }
  function closeSay() { sayEl.hidden = true; }
  sayEl.addEventListener('click', (e) => { if (e.target === sayEl || e.target.tagName === 'P') closeSay(); });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function toast(text) { const el = document.getElementById('toast'); el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function fade(mid) { busy = true; const el = document.getElementById('fade'); el.classList.add('on'); setTimeout(() => { mid(); el.classList.remove('on'); setTimeout(() => (busy = false), 250); }, 280); }
  const todayStr = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  // ---------- 장롱: 옷 갈아입기 ----------
  function openWardrobe() {
    const m = document.getElementById('modal');
    const list = TOWN_SPRITES.OUTFITS[me];
    m.innerHTML = `<div class="card wardrobe-card"><b class="wd-title">장롱 · 옷 갈아입기</b><div class="wd-grid">${list.map((o) => `<button type="button" class="wd-item${o.id === outfit[me] ? ' on' : ''}" data-id="${o.id}"><canvas width="18" height="26"></canvas><span>${esc(o.name)}</span></button>`).join('')}</div><button type="button" class="btn" id="modalClose">닫기</button></div>`;
    m.querySelectorAll('.wd-item').forEach((b) => {
      const g = b.querySelector('canvas').getContext('2d');
      g.drawImage(TOWN_SPRITES.build(me, b.dataset.id).down[0], 0, 0);
      b.onclick = () => { m.hidden = true; changeOutfit(b.dataset.id); };
    });
    m.querySelector('#modalClose').onclick = () => (m.hidden = true);
    m.hidden = false;
  }
  function changeOutfit(id) {
    if (id === outfit[me]) return;
    const o = TOWN_SPRITES.OUTFITS[me].find((x) => x.id === id);
    fade(() => {
      outfit[me] = id;
      try { localStorage.setItem('kk_town_outfit', id); } catch {}
      player.face = 'down';
      OX = scene.ox; OY = scene.oy;
      const [px, py] = iso(player.x / T, player.y / T);
      for (let i = 0; i < 6; i++) fx.hearts.push({ x: px - 8 + Math.random() * 16, y: py - 30 + Math.random() * 6, t: 1 + Math.random(), life: 2, s: Math.random() * 6 });
      toast(`${o.name}(으)로 갈아입었어요 ✨`); melody([784, 988, 1175]);
      buddySays('오~ 잘 어울려! 💕');
      syncSoon();
    });
  }
  // =====================================================================
  // FRESH MART 장보기 · 냉장고 · 요리
  // =====================================================================
  let MART = null, ITEMS = {}, PETQ = [];
  const martReady = fetch('/api/town/mart', { method: 'POST' }).then((r) => r.json()).then((d) => {
    if (!d.ok) return; MART = d.sections; PETQ = d.questions || [];
    for (const sec of MART) for (const it of sec.items) { it.icon = TOWN_ICONS.food(it.id); ITEMS[it.id] = { ...it, section: sec.id }; }
  }).catch(() => {});
  const won = (n) => `${n.toLocaleString('ko-KR')}원`;
  let cart = {};
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => Object.entries(cart).reduce((a, [id, n]) => a + (ITEMS[id]?.price || 0) * n, 0);
  function openMart(secId) {
    if (!MART) { toast('상품을 불러오는 중이에요…'); return; }
    const m = document.getElementById('modal');
    let cur = secId || MART[0].id, shownSec = null;
    const render = () => {
      const sec = MART.find((x) => x.id === cur);
      const keep = shownSec === cur ? [m.querySelector('.mart-list')?.scrollTop || 0, m.querySelector('.mart-tabs')?.scrollLeft || 0] : null; // ＋/－ 눌러도 보던 자리 그대로
      m.innerHTML = `<div class="card mart-card"><div class="mart-head"><b>FRESH MART</b><button type="button" class="x" id="modalClose" aria-label="닫기">✕</button></div>
        <div class="mart-tabs">${MART.map((x) => `<button type="button" data-sec="${x.id}" class="${x.id === cur ? 'on' : ''}" style="--c:${x.color}">${esc(x.name)}</button>`).join('')}</div>
        <div class="mart-list">${sec.items.map((it) => `<div class="mart-item"><i>${it.icon}</i><span><b>${esc(it.name)}</b><small>${won(it.price)}</small></span><div class="qty"><button type="button" data-m="${it.id}">−</button><em>${cart[it.id] || 0}</em><button type="button" data-p="${it.id}">＋</button></div></div>`).join('')}</div>
        <div class="mart-bar"><span>🛒 ${cartCount()}개 · <b>${won(cartTotal())}</b></span><button type="button" class="btn" id="goPay" ${cartCount() ? '' : 'disabled'}>계산대로 가기</button></div></div>`;
      m.querySelectorAll('[data-sec]').forEach((b) => (b.onclick = () => { cur = b.dataset.sec; render(); }));
      if (keep) { m.querySelector('.mart-list').scrollTop = keep[0]; m.querySelector('.mart-tabs').scrollLeft = keep[1]; }
      else requestAnimationFrame(() => { const tabs = m.querySelector('.mart-tabs'), on = tabs && tabs.querySelector('.on'); if (on) { const a = on.getBoundingClientRect(), t = tabs.getBoundingClientRect(); tabs.scrollLeft += a.left - t.left - (t.width - a.width) / 2; } }); // 창이 보인 뒤에 위치 계산 // 코너를 바꿀 때만 그 탭으로
      shownSec = cur;
      m.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { cart[b.dataset.p] = (cart[b.dataset.p] || 0) + 1; beep(900, 0.03); render(); }));
      m.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { const id = b.dataset.m; if (cart[id]) { cart[id] -= 1; if (!cart[id]) delete cart[id]; } render(); }));
      m.querySelector('#modalClose').onclick = () => { m.hidden = true; if (cartCount()) toast(`장바구니 ${cartCount()}개 · 계산대에서 결제해요`); };
      m.querySelector('#goPay').onclick = () => { m.hidden = true; const o = scene.objects.find((ob) => ob.interact === openCheckout); if (o) useObject(o); };
    };
    render(); m.hidden = false;
  }
  const myPoints = () => (townSt.points && Number.isFinite(townSt.points.girl) ? townSt.points.girl : 1000000);
  function openCheckout() {
    const m = document.getElementById('modal');
    if (!cartCount()) { say('점원: 장바구니가 비어 있어요! 진열대를 눌러 담아 오세요 🛒'); return; }
    const rows = Object.entries(cart).map(([id, n]) => `<li><i>${ITEMS[id].icon}</i>${esc(ITEMS[id].name)} × ${n}<b>${won(ITEMS[id].price * n)}</b></li>`).join('');
    const finish = async (msg) => {
      const d = await stateOp({ op: 'buy', items: cart });
      if (!d) return;
      const n = cartCount(); cart = {};
      if (me === 'girl') msg = `FRESH MART 포인트로 결제 완료되었습니다! 💚\n남은 포인트 ${myPoints().toLocaleString('ko-KR')}P`;
      m.innerHTML = `<div class="card pay-card"><div class="pay-ok">✅</div><p class="pay-msg">${esc(msg)}</p><p class="pay-sub">${n}개 상품은 집 냉장고에 넣어둘게요 🧊</p><button type="button" class="btn" id="modalClose">확인</button></div>`;
      m.querySelector('#modalClose').onclick = () => (m.hidden = true);
      melody([784, 988, 1175, 1568]); buddySays('우와 장 많이 봤다! 맛있는 거 해먹자 😋');
    };
    const step1 = () => {
      const ptLine = me === 'girl' ? `<p class="pay-points">💳 내 FRESH MART 포인트 <b>${myPoints().toLocaleString('ko-KR')}P</b>${myPoints() < cartTotal() ? '<br><span class="warn">포인트가 모자라요! 조금 빼 주세요</span>' : `<br><small>결제하면 ${(myPoints() - cartTotal()).toLocaleString('ko-KR')}P 남아요</small>`}</p>` : '';
      m.innerHTML = `<div class="card pay-card"><b class="wd-title">계산대</b><ul class="pay-list">${rows}</ul><p class="pay-total">합계 <b>${won(cartTotal())}</b></p>${ptLine}<button type="button" class="btn" id="payGo" ${me === 'girl' && myPoints() < cartTotal() ? 'disabled' : ''}>${me === 'girl' ? '포인트로 결제하기' : '결제하기'}</button><button type="button" class="btn ghost" id="modalClose">더 담기</button></div>`;
      m.querySelector('#modalClose').onclick = () => (m.hidden = true);
      m.querySelector('#payGo').onclick = () => (me === 'boy' ? askWifePhone() : finish(''));
    };
    const askWifePhone = () => { // 준호 전용: 와이프 번호 뒷자리로 포인트 결제
      m.innerHTML = `<div class="card pay-card"><b class="wd-title">점원</b><p class="pay-msg">혹시 와이프 번호 뒷자리가 어떻게 되세요?</p><div class="kp-slots pay-slots">${'<i></i>'.repeat(4)}</div><div class="kp-grid pay-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((k) => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div></div>`;
      let code = '';
      const slots = [...m.querySelectorAll('.pay-slots i')];
      const show = () => slots.forEach((el, i) => { el.textContent = code[i] ? '●' : ''; el.classList.toggle('on', i < code.length); });
      m.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
        const k = b.dataset.k; beep(700, 0.03);
        if (k === '⌫') code = code.slice(0, -1); else if (k === '✓') { if (code.length === 4) { m.querySelector('.pay-msg').textContent = '조회 중이에요…'; setTimeout(() => finish('10,000,000 포인트 있으셔서 결제 완료 되었습니다.'), 900); } return; } else if (code.length < 4) code += k;
        show();
      }));
    };
    step1(); m.hidden = false;
  }
  function leaveMart() {
    if (cartCount()) { say('계산 안 한 물건이 있어요. 두고 나갈까요?', [{ label: '계산하러 가기', fn: () => useObject(scene.objects.find((o) => o.interact === openCheckout)) }, { label: '두고 나가기', fn: () => { cart = {}; goScene('street', [5, 6, 'right']); } }]); return; }
    goScene('street', [5, 6, 'right']);
  }
  setTimeout(() => photoOp({ op: 'list' }), 1500);
  async function openFridge() {
    const m = document.getElementById('modal');
    if (!MART) { m.innerHTML = '<div class="card"><p class="empty">냉장고 여는 중…</p></div>'; m.hidden = false; await martReady; } // 상품 목록을 받아야 다 보임
    const have = Object.entries(townSt.fridge || {}).filter(([id, n]) => n > 0 && ITEMS[id]);
    const total = have.reduce((a, [, n]) => a + n, 0);
    // 계단식 진열: 맨 위 상자 칸(유제품·가공·냉동) → 접시 칸(고기·생선) → 접시 칸(채소·과일) → 맨 앞 병 칸(음료·술)
    const FROZEN = new Set(['icecream', 'dumpling']);
    const TIER = { dairy: 0, pantry: 0, snack: 0, season: 0, meat: 1, fish: 1, veg: 2, fruit: 2, drink: 3, liquor: 3 };
    const tierOf = (id) => (FROZEN.has(id) ? 0 : TIER[ITEMS[id].section] ?? 0);
    const BOX = ['#ff8f8f', '#8fd0ff', '#ffd36b', '#a8e39a', '#ffb3d9', '#c7a8ff'];
    const hue = (id) => BOX[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % BOX.length];
    const short = (n) => (n.length > 5 ? n.slice(0, 5) : n);
    const item = (id, n, t) => {
      const cls = t === 0 ? 'box' : t === 3 ? 'bottle' : 'plate';
      return `<button type="button" class="fz2-it ${cls}${FROZEN.has(id) ? ' frost' : ''}" data-id="${id}" style="--c:${hue(id)}" aria-label="${esc(ITEMS[id].name)} ${n}개">
        <span class="fz2-obj">${t === 0 ? '<i class="bx-top"></i>' : ''}${TOWN_ICONS.food(id)}</span>${n > 1 ? `<b>${n > 99 ? '99+' : n}</b>` : ''}<small>${esc(short(ITEMS[id].name))}</small></button>`;
    };
    const NAMES = ['상자 칸', '고기·생선', '채소·과일', '음료·술'];
    const tiers = [0, 1, 2, 3].map((t) => { const list = have.filter(([id]) => tierOf(id) === t); return `<div class="fz2-tier t${t}"><span class="fz2-name">${NAMES[t]}</span><div class="fz2-row">${list.map(([id, n]) => item(id, n, t)).join('') || '<em class="fz2-empty">비었어요</em>'}</div></div>`; }).join('');
    m.innerHTML = `<div class="card fridge-card"><b class="wd-title">🧊 우리 집 냉장고${total ? ` <small>${total}개</small>` : ''}</b>
      <div class="fz2"><div class="fz2-in"><i class="fz2-light"></i>${tiers}</div></div>
      ${total ? '<p class="fz-tip">재료를 누르면 크게 보여요</p>' : '<p class="empty">텅 비었어요… FRESH MART에서 장 봐 와요! 🛒</p>'}
      <div class="say-btns"><button type="button" class="btn" id="frCook">🍳 요리하기</button><button type="button" class="btn ghost" id="frPhotos">📌 사진 보드${photos.length ? ` ${photos.length}` : ''}</button><button type="button" class="btn ghost" id="frRecipe">📒 레시피 노트</button></div><button type="button" class="btn ghost" id="modalClose">닫기</button></div>`;
    m.querySelectorAll('.fz2-it').forEach((b) => (b.onclick = () => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); beep(880, 0.03); setTimeout(() => showFridgeItem(b.dataset.id), 180); }));
    m.querySelector('#frPhotos').onclick = () => openPhotoBoard();
    m.querySelector('#modalClose').onclick = () => (m.hidden = true);
    m.querySelector('#frRecipe').onclick = () => openCook();
    m.querySelector('#frCook').onclick = () => { m.hidden = true; goCook(); };
    m.hidden = false; buddySays('나 아이스크림!');
  }
  // 블루투스 스피커: 켜기·끄기 · 다음 곡 · 장르 랜덤 · 제목 골라 듣기
  function openSpeaker() {
    const m = document.getElementById('modal');
    const render = () => {
      const cur = TOWN_MUSIC.current, mode = TOWN_MUSIC.mode;
      const sec = (g, title) => `<div class="sp-sec"><em>${title}</em>${TOWN_MUSIC.songs.filter((x) => x.genre === g).map((x) => `<button type="button" data-song="${x.id}" class="${cur && cur.id === x.id ? 'on' : ''}">${cur && cur.id === x.id ? '▶ ' : ''}${esc(x.title)}</button>`).join('')}</div>`;
      m.innerHTML = `<div class="card speaker-card"><b class="wd-title">🔊 블루투스 스피커</b>
        <div class="sp-now">${cur ? `<small>${cur.genre === 'lofi' ? '로파이 재즈' : '통통 귀여운 노래'} · ${mode === 'all' ? '전체 랜덤' : mode === 'lofi' ? '로파이만 랜덤' : '통통만 랜덤'}</small><b>${esc(cur.title)}</b><div class="sp-bar"><i style="width:${Math.round(TOWN_MUSIC.progress * 100)}%"></i></div>` : '<small>꺼져 있어요</small><b>스피커를 켜면 노래가 랜덤으로 나와요</b>'}</div>
        <div class="sp-ctl">${cur ? '<button type="button" class="btn ghost" data-act="stop">끄기</button><button type="button" class="btn" data-act="next">다음 곡 ⏭</button>' : '<button type="button" class="btn" data-act="on">켜기 ▶</button>'}</div>
        <div class="sp-modes">${[['all', '전체 랜덤'], ['lofi', '로파이 재즈'], ['cute', '통통 귀여운']].map(([k, l]) => `<button type="button" data-mode="${k}" class="${cur && mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="sp-list">${sec('lofi', '☕ 로파이 재즈')}${sec('cute', '🎈 통통 귀여운 노래')}</div>
        <button type="button" class="btn ghost" id="modalClose">닫기</button></div>`;
      m.querySelector('#modalClose').onclick = () => (m.hidden = true);
      m.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { const a = b.dataset.act; if (a === 'stop') { TOWN_MUSIC.stop(); toast('스피커를 껐어요'); } else if (a === 'next') TOWN_MUSIC.next(); else TOWN_MUSIC.shuffle(TOWN_MUSIC.mode || 'all'); beep(880, 0.04); render(); }));
      m.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { TOWN_MUSIC.shuffle(b.dataset.mode); render(); }));
      m.querySelectorAll('[data-song]').forEach((b) => (b.onclick = () => { TOWN_MUSIC.playSong(b.dataset.song); render(); }));
    };
    render(); m.hidden = false; buddySays(TOWN_MUSIC.current ? '이 노래 좋다~ 🎶' : '노래 틀까?');
  }

  // 냉장고에서 고른 상품: 크게 보여주고 마시기·먹기
  const EAT_LINE = { soju: '캬~ 소주 한 잔! 🍶', soju2: '캬~ 처음처럼!', jinro: '두꺼비 한 잔~', saero: '깔끔하다~', beer: '크~ 시원하다! 🍺', wine: '음~ 향 좋다 🍷', whitewine: '상큼해~ 🥂', champagne: '짠! 축하해~ 🍾', makgeolli: '막걸리엔 전이지~', highball: '하이볼 최고!', icecream: '차가워~ 머리 띵!', cake: '달달해 💕', choco: '초코는 사랑이야', coke: '톡 쏜다!', coffee: '잠 깬다~ ☕' };
  function eatKind(id) { const sec = ITEMS[id].section; return sec === 'liquor' || sec === 'drink' || ['milk', 'yogurt', 'juice'].includes(id) ? 'drink' : ['fruit', 'snack'].includes(sec) || ['cheese', 'bread', 'croissant', 'tofu', 'yogurt', 'kimchi', 'dumpling', 'ham'].includes(id) ? 'eat' : 'raw'; }
  function showFridgeItem(id) {
    const it = ITEMS[id], n = townSt.fridge[id] || 0; if (!it || !n) return;
    const kind = eatKind(id), verb = kind === 'drink' ? '마시기' : kind === 'eat' ? '먹기' : '그냥 먹어보기';
    const sec = (MART || []).find((x) => x.id === it.section);
    const box = document.createElement('div'); box.className = 'fz-pick';
    box.innerHTML = `<div class="fz-pick-card"><div class="fz-pick-img">${TOWN_ICONS.food(id, 'ti big')}</div><b>${esc(it.name)}</b><small>${esc(sec ? sec.name : '')} · ${n}개 남음</small>
      <div class="say-btns"><button type="button" class="btn" data-eat>${kind === 'drink' ? '🍶' : '🍽️'} ${verb}</button>${kind === 'raw' ? '<button type="button" class="btn ghost" data-cook>🍳 요리하러 가기</button>' : ''}</div><button type="button" class="btn ghost" data-back>냉장고로</button></div>`;
    const m = document.getElementById('modal'); m.querySelector('.fridge-card')?.appendChild(box);
    box.querySelector('[data-back]').onclick = () => box.remove();
    box.querySelector('[data-cook]')?.addEventListener('click', () => { m.hidden = true; goCook(); });
    box.querySelector('[data-eat]').onclick = async () => {
      const d = await stateOp({ op: 'use', items: { [id]: 1 } });
      if (!d) return;
      m.hidden = true;
      const line = EAT_LINE[id] || (kind === 'drink' ? `꿀꺽꿀꺽~ ${it.name} 맛있다!` : kind === 'eat' ? `냠냠~ ${it.name} 맛있어!` : `생 ${it.name}…? 그래도 냠!`);
      player.hold = { id, until: Date.now() + 60000 }; // 병·음식을 들고
      toast(`${it.name}을(를) 들고 식탁으로 가요`);
      sendAct({ type: 'eat', name: it.name, kind, id, step: 'carry' });
      atTable(() => enjoy(id, it, kind, line));
    };
  }
  // 식탁 의자로 걸어가 앉기 (집이 아니거나 의자가 없으면 그 자리에서)
  function atTable(then) {
    const chairs = scene.key === 'home' ? (scene.furniture || []).filter((f) => f.kind === 'clearchair' || f.kind === 'chair') : [];
    const table = (scene.furniture || []).find((f) => f.kind === 'table');
    if (!chairs.length) return then(null);
    const [px, py] = ptile();
    const cand = [];
    for (const c of chairs) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const tx = c.x + dx, ty = c.y + dy; if (walkable(scene, tx, ty)) cand.push([c, tx, ty, Math.abs(tx - px) + Math.abs(ty - py) + (c.kind === 'chair' ? 30 : 0)]); }
    cand.sort((a, b) => a[3] - b[3]);
    const pick = cand[0]; if (!pick) return then(null);
    if (!walkTo(pick[1], pick[2], () => {
      sitChair(pick[0]);
      if (table) { const dx = table.x + table.w / 2 - (pick[0].x + 0.5), dy = table.y + table.h / 2 - (pick[0].y + 0.5); player.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
      then(pick[0]);
    })) then(null);
  }
  function enjoy(id, it, kind, line) {
      player.hold = { id, until: Date.now() + 7000, sip: true };
      fx.bubbles[me] = { text: line, until: Date.now() + 3200 };
      player.emote = { e: ITEMS[id].section === 'liquor' ? 'shy' : 'happy', start: performance.now(), until: performance.now() + 2600 };
      OX = scene.ox; OY = scene.oy; const [px, py] = iso(player.x / T, player.y / T); for (let i = 0; i < 4; i++) fx.hearts.push({ x: px - 8 + Math.random() * 16, y: py - 30, t: 1 + Math.random(), life: 2, s: Math.random() * 6 });
      melody(kind === 'drink' ? [523, 659, 784] : [659, 784, 988]);
      sendAct({ type: 'eat', name: it.name, kind, id });
      buddySays(ITEMS[id].section === 'liquor' ? '나도 한 잔 줘~ 짠! 🥂' : '나도 한 입만~');
      toast(`${it.name} 1개를 ${kind === 'drink' ? '마셨어요' : '먹었어요'} (${(townSt.fridge[id] || 0)}개 남음)`);
  }

  // ---------- 냉장고 코르크보드: 사진 붙이기 (둘이 같이 봄) ----------
  let photos = [], photosAt = '', photoImgs = {};
  async function photoOp(body) {
    try { const r = await fetch('/api/town/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ me, ...body }) }); const d = await r.json(); if (!d.ok) { toast(d.error || '잠시 후 다시 해주세요'); return null; } photos = d.photos || []; photosAt = d.photosAt || photosAt; loadPhotoImgs(); return d; }
    catch { toast('연결이 잠깐 끊겼어요'); return null; }
  }
  function loadPhotoImgs() { for (const p of photos) if (!photoImgs[p.id]) { const im = new Image(); im.src = p.img; photoImgs[p.id] = im; } }
  function shrinkPhoto(file) { // 긴 변 480px JPEG 로 줄여서 올림
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, 480 / Math.max(im.width, im.height)), c = newCanvas(Math.round(im.width * k), Math.round(im.height * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); let q = 0.8, out = c.toDataURL('image/jpeg', q); while (out.length > 380 * 1024 && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); } res(out); };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 열지 못했어요')); };
      im.src = url;
    });
  }
  async function openPhotoBoard() {
    const m = document.getElementById('modal');
    m.innerHTML = '<div class="card"><p class="empty">코르크보드 가져오는 중… 📌</p></div>'; m.hidden = false;
    await photoOp({ op: 'list' });
    const render = () => {
      m.innerHTML = `<div class="card cork-card"><b class="wd-title">📌 냉장고 사진 보드 <small>${photos.length}/16</small></b>
        <div class="cork">${photos.map((p) => `<button type="button" class="polaroid" data-p="${esc(p.id)}" style="--r:${p.rot}deg;--pin:${p.pin}"><img src="${p.img}" alt=""><small>${esc(p.memo || '')}</small></button>`).join('') || '<p class="cork-empty">아직 붙인 사진이 없어요.<br>우리 사진을 붙여볼까요? 💕</p>'}</div>
        <label class="btn" ${photos.length >= 16 ? 'hidden' : ''}>📷 사진 붙이기<input type="file" accept="image/*" id="phFile" hidden></label>
        <button type="button" class="btn ghost" id="modalClose">닫기</button></div>`;
      m.querySelector('#modalClose').onclick = () => (m.hidden = true);
      const fi = m.querySelector('#phFile');
      if (fi) fi.onchange = async () => {
        const f = fi.files[0]; if (!f) return;
        try {
          const img = await shrinkPhoto(f);
          const memo = (prompt('사진에 짧은 메모를 적을까요? (안 적어도 돼요)', '') || '').slice(0, 30);
          toast('사진 붙이는 중… 📌');
          if (await photoOp({ op: 'add', img, memo })) { melody([784, 988, 1175]); buddySays('우리 사진이다! 예쁘다 💕'); }
        } catch (e) { toast(e.message); }
        render();
      };
      m.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => {
        const p = photos.find((x) => x.id === b.dataset.p); if (!p) return;
        m.innerHTML = `<div class="card cork-view"><img src="${p.img}" alt="">${p.memo ? `<p>${esc(p.memo)}</p>` : ''}<small>${p.by === 'boy' ? names.boy : names.girl}가 붙임 · ${new Date(p.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</small><div class="say-btns"><button type="button" class="btn ghost" id="phDel">떼기</button><button type="button" class="btn" id="phBack">보드로</button></div></div>`;
        m.querySelector('#phBack').onclick = render;
        m.querySelector('#phDel').onclick = async () => { if (!confirm('이 사진을 뗄까요?')) return; await photoOp({ op: 'remove', id: p.id }); render(); };
      }));
    };
    render();
  }
  // 레시피 재료 글 → 마트 상품 찾기 (긴 이름부터, 겹치지 않게)
  function matchIngredients(text) {
    const alias = [];
    for (const it of Object.values(ITEMS)) for (const a of [it.name, ...(it.alias || [])]) alias.push([a, it.id]);
    alias.sort((a, b) => b[0].length - a[0].length);
    const need = new Map(), other = [];
    for (let line of String(text || '').split(/[\n,·•]+/)) {
      line = line.replace(/^[\s\-*\d.)]+/, '').trim(); if (!line) continue;
      let rest = line, hit = false;
      for (const [a, id] of alias) { if (rest.includes(a)) { hit = true; if (!need.has(id)) need.set(id, line); rest = rest.split(a).join('　'); } }
      if (!hit) other.push(line);
    }
    return { need: [...need.entries()].map(([id, line]) => ({ id, line })), other };
  }
  function goCook(recipeId) {
    if (scene.key !== 'home') { toast('요리는 집 주방 인덕션에서 해요!'); return; }
    const o = scene.objects.find((ob) => ob.furn && ob.furn.kind === 'induction');
    if (o) useObject({ ...o, interact: () => openCook(recipeId) }); else openCook(recipeId);
  }
  // ---------- 레시피 노트 (스프링 노트: 사진 · 요리 · 숙련 · 재료 · 별점) ----------
  const SAUCE_RE = /소금|후추|간장|설탕|가루|기름|오일|맛술|올리고당|식초|물엿|소스|버터|마요|케첩|참깨|고추장|된장|굴소스|미림|육수|다시다/;
  const isSauce = (id) => ITEMS[id].section === 'season' || SAUCE_RE.test(ITEMS[id].name);
  const cookedOf = (id) => (townSt.cooked || {})[id] || { n: 0, best: 0 };
  const lvOf = (n) => (n ? Math.min(5, 1 + Math.floor(n / 2)) : 0);
  let recipePage = 0;
  async function openCook(recipeId) {
    const m = document.getElementById('modal');
    m.innerHTML = '<div class="card"><p class="empty">레시피 노트를 펼치는 중… 📖</p></div>'; m.hidden = false;
    let list = [];
    try { const d = await (await fetch('/api/recipes', { cache: 'no-store' })).json(); list = d.recipes || []; } catch {}
    if (recipeId) return openRecipeCook(recipeId);
    await martReady;
    const per = 3, pages = Math.max(1, Math.ceil(list.length / per));
    const render = () => {
      recipePage = Math.max(0, Math.min(pages - 1, recipePage));
      const rows = list.slice(recipePage * per, recipePage * per + per).map((r, i) => {
        const ck = cookedOf(r.id), lv = lvOf(ck.n), { need } = matchIngredients(r.ingredients);
        const ing = need.filter((n) => !isSauce(n.id)).concat(need.filter((n) => isSauce(n.id))).slice(0, 5);
        const photo = `<span class="rn-photo">${r.image_thumb || r.image_url ? `<img src="${esc(r.image_thumb || r.image_url)}" alt="">` : '<i class="rn-noimg">🍽️</i>'}<i class="tp a"></i><i class="tp b"></i>${ck.n ? '' : '<em>새 레시피!</em>'}</span>`;
        const info = `<span class="rn-info">
          <span class="rn-f"><u>요리</u><b>${esc(r.title)}</b></span>
          <span class="rn-f"><u>숙련</u><span class="rn-lv"><i style="width:${lv * 20}%"></i><em>Lv. ${lv}/5</em></span></span>
          <span class="rn-f"><u>재료</u><span class="rn-ing">${ing.map((n) => `<i class="${(townSt.fridge[n.id] || 0) > 0 ? '' : 'no'}">${TOWN_ICONS.food(n.id)}</i>`).join('') || '<small>눌러서 보기</small>'}</span></span>
          <span class="rn-f"><u>별점</u><span class="rn-star">${'<i class="on"></i>'.repeat(ck.best)}${'<i></i>'.repeat(3 - ck.best)}</span></span></span>`;
        return `<button type="button" class="rn-row${i % 2 ? ' flip' : ''}" data-id="${esc(r.id)}">${i % 2 ? info + photo : photo + info}</button>`;
      }).join('<i class="rn-sep"></i>');
      m.innerHTML = `<div class="card rn-book"><div class="rn-sign"><span>레시피 노트</span></div><button type="button" class="rn-x" id="modalClose" aria-label="닫기"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M5 5L15 15M15 5L5 15" stroke="#6b4430" stroke-width="6" stroke-linecap="round"/><path d="M5 5L15 15M15 5L5 15" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button>
        <div class="rn-rings"><i></i><i></i><i></i></div>
        <div class="rn-page">${rows || '<p class="empty">레시피 노트가 비었어요. 앱의 레시피에서 먼저 만들어 주세요!</p>'}</div>
        <div class="rn-nav"><button type="button" id="rnPrev" class="rn-arrow l"${recipePage ? '' : ' disabled'} aria-label="이전"></button><span>${String(recipePage + 1).padStart(2, '0')} / ${String(pages).padStart(2, '0')}</span><button type="button" id="rnNext" class="rn-arrow"${recipePage < pages - 1 ? '' : ' disabled'} aria-label="다음"></button></div>
        <button type="button" class="btn ghost rn-app" id="rnApp">앱에서 레시피 추가하기</button></div>`;
      m.querySelector('#modalClose').onclick = () => (m.hidden = true);
      m.querySelector('#rnPrev').onclick = () => { recipePage--; beep(660, 0.03); render(); };
      m.querySelector('#rnNext').onclick = () => { recipePage++; beep(760, 0.03); render(); };
      m.querySelector('#rnApp').onclick = () => leaveTo('/?view=recipes');
      m.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => openRecipeCook(b.dataset.id)));
    };
    render();
  }
  // 요리 시작 카드: 나무 간판 제목 · 큰 요리 사진 · 요리 시작 · 아래 재료/양념 탭
  async function openRecipeCook(id) {
    const m = document.getElementById('modal');
    m.innerHTML = '<div class="card"><p class="empty">레시피 노트를 펼치는 중… 📖</p></div>'; m.hidden = false; // 창부터 띄움
    await martReady;
    let r = null;
    try { const d = await (await fetch(`/api/recipes/${encodeURIComponent(id)}`, { cache: 'no-store' })).json(); r = d.recipe; } catch {}
    if (!r) { m.hidden = true; toast('레시피를 못 찾았어요'); return; }
    const { need, other } = matchIngredients(r.ingredients);
    const has = (iid) => (townSt.fridge[iid] || 0) > 0;
    const ready = need.length > 0 && need.every((n) => has(n.id)), ck = cookedOf(r.id);
    const mains = need.filter((n) => !isSauce(n.id)), sauces = need.filter((n) => isSauce(n.id));
    const tile = (n) => `<span class="rc-tile${has(n.id) ? '' : ' no'}"><i>${TOWN_ICONS.food(n.id)}</i><small>${esc(ITEMS[n.id].name)}</small>${has(n.id) ? '' : '<b>없음</b>'}</span>`;
    const etc = (o) => `<span class="rc-tile etc"><i class="rc-home"></i><small>${esc(o.replace(/\s*[\d½¼/.~]+.*$/, '').slice(0, 6) || o.slice(0, 6))}</small></span>`;
    const tray = (tab) => (tab === 'ing' ? mains.map(tile).join('') || '<em class="rc-none">마트 재료가 없어요</em>' : sauces.map(tile).join('') + other.map(etc).join('') || '<em class="rc-none">양념이 없어요</em>');
    const lack = need.filter((n) => !has(n.id)).length;
    const atHome = scene.key === 'home';
    m.innerHTML = `<div class="card rc-card"><div class="rc-sign"><b>${esc(r.title)}</b></div><button type="button" class="rn-x" id="modalClose" aria-label="닫기"><svg viewBox="0 0 20 20" width="18" height="18"><path d="M5 5L15 15M15 5L5 15" stroke="#6b4430" stroke-width="6" stroke-linecap="round"/><path d="M5 5L15 15M15 5L5 15" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg></button>
      <div class="rc-stage">${ck.n ? `<em class="rc-badge done">${ck.n}번 만들었어요 · Lv.${lvOf(ck.n)}</em>` : '<em class="rc-badge">새 레시피!</em>'}
        <div class="rc-dish">${r.image_thumb || r.image_url ? `<img src="${esc(r.image_url || r.image_thumb)}" alt="">` : '<i>🍲</i>'}</div>
        <i class="rc-heart h1"></i><i class="rc-heart h2"></i><i class="rc-spark s1"></i><i class="rc-spark s2"></i></div>
      <div class="rc-go">${ready && atHome ? '<button type="button" class="rc-start" id="cookGo">요리 시작</button>' : ready ? '<p class="cook-need">재료는 다 있어요! 요리는 집 주방 인덕션에서 해요 🏠</p>' : need.length ? `<p class="cook-need">재료가 ${lack}개 모자라요. FRESH MART에서 사 와요 🛒</p>` : '<p class="cook-need">마트 재료를 못 찾았어요. 레시피 재료를 줄마다 적어주세요!</p>'}</div>
      <div class="rc-tabs"><button type="button" class="on" data-tab="ing">재료 ${mains.length}</button><button type="button" data-tab="sauce">양념 ${sauces.length + other.length}</button></div>
      <div class="rc-tray" id="rcTray">${tray('ing')}</div>
      <button type="button" class="btn ghost" id="rcBack">📒 레시피 노트</button></div>`;
    m.querySelector('#modalClose').onclick = () => (m.hidden = true);
    m.querySelector('#rcBack').onclick = () => openCook();
    m.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { m.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b)); m.querySelector('#rcTray').innerHTML = tray(b.dataset.tab); beep(720, 0.02); }));
    const go = m.querySelector('#cookGo');
    if (go) go.onclick = () => cookGame(r, need);
  }
  // 완성한 요리: 혼자 먹기 · 같이 먹기 · 상대 주기. 상대가 오프라인이면(집에 있는 상대) 언제나 식탁에 같이 앉음
  const heartsAt = (c, n) => { OX = scene.ox; OY = scene.oy; const [px, py] = iso(c.x / T, c.y / T); for (let i = 0; i < n; i++) fx.hearts.push({ x: px - 10 + Math.random() * 20, y: py - 30, t: 1.2 + Math.random(), life: 2.2, s: Math.random() * 6 }); };
  const faceTo = (c, x, y) => { const dx = x - c.x, dy = y - c.y; c.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); };
  function buddyToTable(myChair) { // 상대(오프라인)도 다른 의자로 와서 앉음 → 앉으면 resolve
    return new Promise((done) => {
      if (!buddyHere()) return done(false);
      const table = (scene.furniture || []).find((f) => f.kind === 'table');
      const chairs = (scene.furniture || []).filter((f) => (f.kind === 'clearchair' || f.kind === 'chair') && f !== myChair).sort((a, b) => (a.kind === 'chair') - (b.kind === 'chair'));
      buddy.hold = false; buddy.pillion = false; buddy.pose = ''; buddy.greeting = false;
      let seat, sit;
      if (myChair && chairs.length) { const c = chairs[0]; seat = furnPt(c, 0.5, 0.55).map((v) => v * T); sit = () => { buddy.x = seat[0]; buddy.y = seat[1]; buddy.pose = 'sit'; if (table) faceTo(buddy, (table.x + table.w / 2) * T, (table.y + table.h / 2) * T); }; }
      else { seat = [player.x + 0.7 * T, player.y]; sit = () => { buddy.x = seat[0]; buddy.y = seat[1]; faceTo(buddy, player.x, player.y); }; }
      let fin = false; const end = () => { if (fin) return; fin = true; buddy.target = null; buddy.onArrive = null; sit(); syncSoon(); done(true); };
      if (Math.hypot(seat[0] - buddy.x, seat[1] - buddy.y) > 7 * T) return end(); // 멀면 바로 자리로
      buddy.target = seat; buddy.onArrive = end; setTimeout(end, 4500);
    });
  }
  const MEAL_LINE = { solo: ['냠냠~ 내가 만들었지만 맛있다! 😋', '맛있게 먹어~ 😊'], together: ['같이 먹으니까 더 맛있다 💕', '진짜 맛있어!! 최고야 👍'], give: ['맛있어? 😊', '고마워!! 진짜 맛있다 😋💕'] };
  function serveMeal(title, mode) {
    const bud = buddyHere(), meal = (ms, sip) => ({ id: 'meal', until: Date.now() + ms, sip });
    if (!bud && mode !== 'solo') { // 상대가 접속 중이면 상대 화면에 같이 먹자 / 선물 도착
      sendAct({ type: 'meal', mode, title });
      if (mode === 'give') { toast(`${names[partner]}에게 ${title}을(를) 보냈어요 🎁`); melody([659, 784, 1047]); heartsAt(player, 6); return; }
    }
    if (mode !== 'give') { player.hold = meal(60000); if (bud || mode === 'solo') sendAct({ type: 'eat', name: title, kind: 'eat', id: 'meal', step: 'carry' }); } // (같이 먹자 신호를 덮어쓰지 않게)
    if (bud) buddy.bubble = { text: mode === 'give' ? '나 주는 거야?? 💕' : mode === 'together' ? '우와 같이 먹자!!' : '맛있겠다~ 옆에 있을게', until: Date.now() + 2500 };
    toast(mode === 'give' ? `${names[partner]}와 식탁으로 가요` : `${title}을(를) 들고 식탁으로 가요`);
    atTable(async (chair) => {
      if (bud) await buddyToTable(chair);
      const [mine, theirs] = MEAL_LINE[mode];
      if (mode !== 'give') { player.hold = meal(8000, true); fx.bubbles[me] = { text: mine, until: Date.now() + 3400 }; player.emote = { e: 'happy', start: performance.now(), until: performance.now() + 2600 }; sendAct({ type: 'eat', name: title, kind: 'eat', id: 'meal' }); }
      else { player.hold = null; fx.bubbles[me] = { text: mine, until: Date.now() + 3400 }; player.emote = { e: 'shy', start: performance.now(), until: performance.now() + 2600 }; }
      if (bud) {
        if (mode !== 'solo') buddy.item = meal(8000, true);
        setTimeout(() => { if (buddyHere()) buddy.bubble = { text: theirs, until: Date.now() + 3000 }; }, mode === 'give' ? 300 : 1400);
        heartsAt(buddy, mode === 'solo' ? 2 : 5);
      }
      heartsAt(player, 5); melody([784, 988, 1175, 1568]);
      toast(mode === 'solo' ? `${title} 맛있게 먹었어요 🍽️` : mode === 'together' ? `${names[partner]}와 ${title}을(를) 같이 먹었어요 💕` : `${names[partner]}가 ${title}을(를) 맛있게 먹어요 💕`);
    });
  }
  function mealFromPartner(a) { // 상대가 같이 먹자고 하거나 선물로 줌 → 식탁으로 가서 먹기
    const eat = () => {
      player.hold = { id: 'meal', until: Date.now() + 60000 }; sendAct({ type: 'eat', name: a.title, kind: 'eat', id: 'meal', step: 'carry' });
      const go = () => { player.hold = { id: 'meal', until: Date.now() + 8000, sip: true }; fx.bubbles[me] = { text: a.mode === 'give' ? '고마워!! 진짜 맛있다 😋💕' : '같이 먹으니까 더 맛있다 💕', until: Date.now() + 3400 }; heartsAt(player, 6); melody([784, 988, 1175, 1568]); sendAct({ type: 'eat', name: a.title, kind: 'eat', id: 'meal' }); };
      if (scene.key === 'home') atTable(go); else go();
    };
    say(a.mode === 'give' ? `${names[partner]}가 ${a.title}을(를) 만들어 줬어요! 🎁💕` : `${names[partner]}가 ${a.title} 같이 먹재요! 🍽️`, [{ label: a.mode === 'give' ? '잘 먹을게! 먹기' : '같이 먹기 💕', fn: eat }]);
    melody([659, 784, 1047]);
  }
  // 요리 미니게임: ① 재료 손질(빨리 톡톡) ② 불 조절(초록 칸에서 멈추기 ×3) ③ 간 맞추기(순서 기억)
  function cookGame(r, need) {
    const m = document.getElementById('modal');
    let score = 0;
    const stage1 = () => {
      let taps = 0, left = 7; const goal = 18;
      m.innerHTML = `<div class="card game-card"><b class="wd-title">① 재료 손질</b><p>도마를 빠르게 톡톡! (${goal}번)</p><div class="board" id="board">${need.slice(0, 4).map((n) => ITEMS[n.id].icon).join(' ')}<span class="knife">🔪</span></div><div class="gbar"><i id="gfill"></i></div><p class="gtime" id="gtime">7초</p></div>`;
      const board = m.querySelector('#board'), fill = m.querySelector('#gfill'), tEl = m.querySelector('#gtime');
      board.onpointerdown = () => { taps++; fill.style.width = `${Math.min(100, (taps / goal) * 100)}%`; board.classList.remove('chop'); void board.offsetWidth; board.classList.add('chop'); beep(500 + taps * 20, 0.02); if (taps >= goal) done(); };
      const iv = setInterval(() => { left--; tEl.textContent = `${left}초`; if (left <= 0) done(); }, 1000);
      let fin = false; function done() { if (fin) return; fin = true; clearInterval(iv); score += taps >= goal ? 3 : taps >= goal * 0.6 ? 2 : 1; setTimeout(stage2, 400); }
    };
    const stage2 = () => { // 요리는 이 한 단계만: 왔다갔다 바늘을 초록 칸에서 멈추면 완성 (못 맞추면 다시)
      let pos = 0, dir = 1, raf = 0, miss = 0, done = false;
      m.innerHTML = `<div class="card game-card"><b class="wd-title">🔥 불 조절</b><p>왔다갔다 바늘이 초록 칸에 오면 멈춰요!</p><div class="gauge"><span class="zone" id="zone"></span><span class="needle" id="needle"></span></div><button type="button" class="btn" id="stop">멈춰!</button><p class="gres" id="gres"></p><button type="button" class="btn ghost" id="cookQuit">그만하기</button></div>`;
      const nd = m.querySelector('#needle'), zone = m.querySelector('#zone'), res = m.querySelector('#gres');
      const W = 24; let z0 = 15 + Math.random() * 55; zone.style.left = `${z0}%`; zone.style.width = `${W}%`;
      const loop = () => { pos += dir * 1.15; if (pos > 100 || pos < 0) { dir *= -1; pos = Math.max(0, Math.min(100, pos)); } nd.style.left = `${pos}%`; raf = requestAnimationFrame(loop); };
      loop();
      m.querySelector('#cookQuit').onclick = () => { cancelAnimationFrame(raf); m.hidden = true; };
      m.querySelector('#stop').onclick = () => {
        if (done) return;
        const ok = pos >= z0 && pos <= z0 + W;
        beep(ok ? 1046 : 220, 0.08);
        if (ok) { done = true; cancelAnimationFrame(raf); res.textContent = '완벽해요! 🔥 맛있게 익었어요'; score = miss === 0 ? 9 : miss === 1 ? 6 : 3; setTimeout(finish, 600); return; }
        miss++; res.textContent = '앗 아까워! 한 번 더 해봐요'; z0 = 15 + Math.random() * 55; zone.style.left = `${z0}%`;
      };
    };
    const stage3 = () => {
      const SEAS = ['🧂', '🍯', '🌶️', '🧄'], seq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
      m.innerHTML = `<div class="card game-card"><b class="wd-title">③ 간 맞추기</b><p id="sq">순서를 잘 봐요…</p><div class="seas">${SEAS.map((e, i) => `<button type="button" data-i="${i}">${e}</button>`).join('')}</div></div>`;
      const btns = [...m.querySelectorAll('[data-i]')], sq = m.querySelector('#sq');
      btns.forEach((b) => (b.disabled = true));
      seq.forEach((v, k) => setTimeout(() => { btns[v].classList.add('lit'); beep(600 + v * 120, 0.12); setTimeout(() => btns[v].classList.remove('lit'), 380); }, 500 + k * 650));
      setTimeout(() => {
        sq.textContent = '같은 순서로 눌러요!'; btns.forEach((b) => (b.disabled = false));
        let k = 0, miss = 0;
        btns.forEach((b) => (b.onclick = () => {
          const v = Number(b.dataset.i); beep(600 + v * 120, 0.08);
          if (v !== seq[k]) { miss++; b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 300); }
          k++; if (k >= seq.length) { score += miss === 0 ? 3 : miss === 1 ? 2 : 1; finish(); }
        }));
      }, 500 + seq.length * 650 + 200);
    };
    const finish = async () => {
      const stars = score >= 8 ? 3 : score >= 5 ? 2 : 1;
      const d = await stateOp({ op: 'use', items: Object.fromEntries(need.map((n) => [n.id, 1])), cooked: r.id ? { id: r.id, stars } : undefined });
      if (!d) { m.hidden = true; return; }
      const lvNow = lvOf(cookedOf(r.id).n), msg = ['조금 아쉽지만 정성이 가득해요!', '맛있게 잘 됐어요! 😋', '셰프 수준이에요!! 🏆'][stars - 1];
      m.innerHTML = `<div class="card rc-card rc-done"><div class="rc-sign"><b>${esc(r.title)} 완성!</b></div><div class="rc-stage"><em class="rc-badge done">숙련 Lv.${lvNow}/5</em><div class="rc-dish">${r.image_thumb || r.image_url ? `<img src="${esc(r.image_url || r.image_thumb)}" alt="">` : '<i>🍲</i>'}</div><i class="rc-heart h1"></i><i class="rc-heart h2"></i><i class="rc-spark s1"></i><i class="rc-spark s2"></i></div><p class="rc-stars">${'<i class="on"></i>'.repeat(stars)}${'<i></i>'.repeat(3 - stars)}</p><p class="rc-msg">${msg}</p><div class="say-btns meal-btns"><button type="button" class="btn ghost" data-meal="solo">🍽️ 혼자 먹기</button><button type="button" class="btn" data-meal="together">💕 같이 먹기</button><button type="button" class="btn ghost" data-meal="give">🎁 ${esc(names[partner])}에게 주기</button></div></div>`;
      m.querySelectorAll('[data-meal]').forEach((b) => (b.onclick = () => { m.hidden = true; serveMeal(r.title, b.dataset.meal); }));
      melody([784, 988, 1175, 1568, 1319, 1568]); sendAct({ type: 'cook', title: r.title }); buddySays('우와 맛있겠다!! 잘 먹겠습니다 🥄');
    };
    if (!window.TOWN_COOK) { stage2(); return; }
    // 레시피 순서를 한 줄씩: 손질(씻기·썰기·다지기·간하기…) → 인덕션·에어프라이어·토스터·전자레인지 → 담기
    TOWN_COOK.play({
      root: m, recipe: r, need: need.map((n) => ({ id: n.id, name: ITEMS[n.id].name })),
      match: (line) => matchIngredients(line).need.map((n) => ({ id: n.id, name: ITEMS[n.id].name })),
      foodSrc: (iid) => TOWN_ICONS.foodSrc(iid), beep, melody,
    }).then((res) => { if (res.quit) { m.hidden = true; return; } score = [0, 3, 6, 9][res.stars]; m.hidden = false; finish(); });
  }
  // 실시간 위치: 동네에 있는 동안에도 보고 (앱 메인과 같은 규칙 · 이 기기에서 위치를 한 번 허용했을 때만)
  //   움직이면 80m·30초마다, 가만히 있어도 10분마다. 화면이 꺼지거나 앱이 뒤로 가면 멈춤 (폰이 백그라운드 위치를 막음)
  (function liveGeo() {
    let ok = false; try { ok = localStorage.getItem('kk_geo_ok') === '1'; } catch {}
    if (!ok || !('geolocation' in navigator)) return;
    let watch = null, sent = { t: 0, lat: 0, lng: 0 }, busy = false;
    const dist = (a1, o1, a2, o2) => { const R = 6371e3, r = Math.PI / 180, d1 = (a2 - a1) * r, d2 = (o2 - o1) * r; const h = Math.sin(d1 / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(d2 / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
    const ko = (n) => Boolean(n) && /[가-힣]/.test(n) && !/[A-Za-z]/.test(n);
    async function area(lat, lng) { // 동네 이름 (1km 안에서는 저장해 둔 걸 다시 씀)
      let c = null; try { c = JSON.parse(localStorage.getItem('kk_geo_area') || 'null'); } catch {}
      if (c && dist(lat, lng, c.lat, c.lng) < 1000) return c.area;
      try {
        const d = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ko`)).json();
        const admin = (d.localityInfo?.administrative || []).filter((x) => ko(x.name)), info = (d.localityInfo?.informative || []).filter((x) => ko(x.name));
        const gu = admin.filter((x) => x.adminLevel >= 5 && x.adminLevel <= 7).sort((x, y) => y.adminLevel - x.adminLevel)[0]?.name;
        const dong = (ko(d.locality) && /(동|읍|면|가|리)$/.test(d.locality) ? d.locality : '') || admin.filter((x) => x.adminLevel >= 8).map((x) => x.name).pop() || info.find((x) => /(동|읍|면)$/.test(x.name))?.name || '';
        const out = [...new Set([gu || (ko(d.principalSubdivision) ? d.principalSubdivision : ''), dong].filter(Boolean))].join(' ').slice(0, 40);
        try { localStorage.setItem('kk_geo_area', JSON.stringify({ lat, lng, area: out })); } catch {}
        return out;
      } catch { return c ? c.area : ''; }
    }
    async function post(lat, lng) {
      if (busy || names[me] === '男' || names[me] === '女') return; // 이름을 받아온 뒤에 (빈 이름으로 덮지 않게)
      busy = true;
      try { await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatar: me, name: names[me], lat, lng, area: await area(lat, lng) }) }); sent = { t: Date.now(), lat, lng }; } catch {}
      finally { busy = false; }
    }
    const start = () => {
      if (watch != null || document.visibilityState !== 'visible') return;
      watch = navigator.geolocation.watchPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords, age = Date.now() - sent.t;
        if ((dist(lat, lng, sent.lat, sent.lng) > 80 && age > 30e3) || age > 10 * 60e3) post(lat, lng);
      }, () => {}, { enableHighAccuracy: true, maximumAge: 30e3, timeout: 30e3 });
    };
    const stop = () => { if (watch != null) { navigator.geolocation.clearWatch(watch); watch = null; } };
    document.addEventListener('visibilitychange', () => (document.visibilityState === 'visible' ? start() : stop()));
    setInterval(() => { if (document.visibilityState === 'visible' && Date.now() - sent.t > 10 * 60e3) navigator.geolocation.getCurrentPosition((p) => post(p.coords.latitude, p.coords.longitude), () => {}, { enableHighAccuracy: true, timeout: 20e3, maximumAge: 60e3 }); }, 60e3);
    setTimeout(start, 2500);
  })();

  // =====================================================================
  // 펫 (프로젝트 아니마): 알 → 유아기 → 성장기 → 성체. 돌봄·먹이·대답이 성향으로 쌓여 모습이 갈림
  // =====================================================================
  const PET_FORM = { egg: '태동의 알', pong: '퐁글이', zzi: '찌릿이', muk: '묵묵이', lumi: '루미너', aqua: '아쿠아', zephy: '제피', pyro: '파이로', golem: '골렘', nox: '녹스', solaris: '솔라리스', chronicle: '크로니클', mirage: '미라쥬', boulder: '볼더', starfox: '별빛 요령' };
  const PET_STAGE = ['태동의 알', '유아기', '성장기', '성체'];
  const PET_NEXT = [[3, 30], [14, 120], [38, 300]];
  const PET_FOODS = { red: ['활력의 열매', '🍒'], blue: ['사색의 이슬', '💧'], yellow: ['온기의 수프', '🍲'], purple: ['몽환의 버섯', '🍄'] };
  const FOOD_COL = { red: '#ff7a6b', blue: '#6aa7ff', yellow: '#ffd23a', purple: '#b48cff' };
  const petE = { x: 0, y: 0, face: 'down', moving: false, step: 0, show: false, react: null, bubble: null, nextTalk: 0, scene: '' };
  let petCreating = false;
  const petDays = (P) => Math.floor((Date.now() - Date.parse(P.born)) / 86400e3);
  const hoursSince = (iso) => (iso ? (Date.now() - Date.parse(iso)) / 3600e3 : 99);
  function petGrow(P) { const nx = PET_NEXT[P.stage]; if (!nx) return null; return Math.max(0, Math.min(1, Math.min(P.intimacy / nx[1], (petDays(P) + 0.5) / nx[0]))); }
  const growWord = (g) => (g >= 0.9 ? '곧 깨어날 것 같아요!' : g >= 0.6 ? '꽤 자랐어요' : g >= 0.3 ? '쑥쑥 크는 중' : '이제 막 시작');
  // 서버(petNeedsOf)와 같은 식: 저장된 값에서 시간만큼 줄어듦. 돌봐주면 조금씩 오름 (한 번에 100 아님)
  const NEED_RATE = { clean: 8, warm: 10, full: 10 };
  function petNeeds(P) {
    const hs = (iso) => hoursSince(iso || P.born); // 한 번도 안 돌봤으면 태어난 때부터
    const lastWarm = [P.last?.warm, P.last?.guitar, P.last?.talk].filter(Boolean).sort().pop();
    const now = (k, legacy) => { const n = P.need && P.need[k]; return Math.max(0, Math.round(n ? n.v - hoursSince(n.at) * NEED_RATE[k] : 100 - hs(legacy) * NEED_RATE[k])); };
    return { clean: now('clean', P.last?.wipe), warm: now('warm', lastWarm), full: now('full', P.last?.feed) };
  }
  // 하늘나라로 간 알: 추모 카드 (처음 한 번은 저절로, 그 뒤엔 펫 집을 누르면)
  function showPetGone(force) {
    const g = (townSt.petGone || []).slice(-1)[0]; if (!g) return;
    let seen = ''; try { seen = localStorage.getItem('kk_pet_gone_seen') || ''; } catch {}
    if (!force && seen === g.died) return;
    try { localStorage.setItem('kk_pet_gone_seen', g.died); } catch {}
    const m = document.getElementById('modal'), next = townSt.petNext && Date.parse(townSt.petNext) > Date.now();
    const d = new Date(g.died), when = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    m.innerHTML = `<div class="card pet-gone"><div class="pg-sky"><span class="pg-cloud c1"></span><span class="pg-cloud c2"></span><svg class="pg-egg" viewBox="0 0 80 80"><ellipse cx="40" cy="12" rx="13" ry="4" fill="none" stroke="#ffd34d" stroke-width="3.4"/><path d="M14 44 C 2 36, 4 26, 14 28 C 10 20, 20 18, 24 30 Z M66 44 C 78 36, 76 26, 66 28 C 70 20, 60 18, 56 30 Z" fill="#fff" stroke="#6b4430" stroke-width="2.4" stroke-linejoin="round"/><path d="M40 20 C 26 20, 22 42, 24 52 C 26 64, 34 70, 40 70 C 46 70, 54 64, 56 52 C 58 42, 54 20, 40 20 Z" fill="#fff6e6" stroke="#6b4430" stroke-width="2.6"/><path d="M33 46 q3 3 6 0 M41 46 q3 3 6 0" stroke="#6b4430" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="31" cy="53" rx="3" ry="2" fill="#ffb3c4"/><ellipse cx="49" cy="53" rx="3" ry="2" fill="#ffb3c4"/></svg></div>
      <b class="wd-title">🕊️ ${esc(g.name)}이(가) 하늘나라로 갔어요</b>
      <p class="pg-sub">${when} · 너무 추웠나 봐요…<br>함께한 ${g.days}일 · 친밀감 ${g.intimacy}</p>
      ${(g.log || []).length ? `<ul class="pg-log">${g.log.slice(-4).map((l) => `<li>${esc(l.text || l)}</li>`).join('')}</ul>` : ''}
      <p class="pg-next">${next ? '내일 새 알이 펫 집으로 찾아올 거예요 🥚<br>이번엔 자주 품어줘요!' : '새 알이 곧 찾아올 거예요 🥚'}</p>
      <button type="button" class="btn" id="modalClose">잘 가, ${esc(g.name)} 💐</button></div>`;
    m.querySelector('#modalClose').onclick = () => (m.hidden = true);
    m.hidden = false; melody([659, 587, 523, 440]);
  }
  function ensurePet() {
    if (!stateLoaded || townSt.pet || petCreating || !scene || scene.key !== 'home') return;
    if (townSt.petNext && Date.parse(townSt.petNext) > Date.now()) { setTimeout(showPetGone, 900); return; } // 하늘나라로 간 날은 새 알이 안 옴
    petCreating = true;
    stateOp({ op: 'pet', act: 'create' }).then((d) => { if (d && d.msg) { toast(d.msg); petE.react = { kind: 'warm', until: performance.now() + 2500 }; } });
  }
  function petCelebrate() {
    const P = townSt.pet; if (!P) return;
    toast(`${PET_FORM[P.form]}(으)로 자랐어요! ✨`); melody([784, 988, 1175, 1568, 1319, 1568]);
    petE.react = { kind: 'evolve', until: performance.now() + 4000 };
  }
  function petHolder() {
    const P = townSt.pet; if (!P) return null;
    if (P.follow === me) return player;
    if (P.follow === partner && other.visible) return other;
    return null;
  }
  function petHome() { // 펫 집 앞 (집에 넣어뒀으면 거실 가운데)
    const h = scene.furniture && scene.furniture.find((f) => f.kind === 'pethouse');
    return h ? [(h.x + 0.5) * T, (h.y + 0.9) * T] : [11 * T, 7.5 * T];
  }
  function updatePet(dt) {
    const P = townSt.pet; petE.show = false; if (!P || !scene) return;
    const holder = petHolder();
    let goal = null;
    if (holder) {
      const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[holder.face] || [0, 1];
      goal = [holder.x + back[0] * 0.85 * T + back[1] * 0.35 * T, holder.y + back[1] * 0.85 * T + back[0] * 0.35 * T];
      if (petE.scene !== scene.key) { petE.x = goal[0]; petE.y = goal[1]; petE.scene = scene.key; }
    } else if (scene.key === 'home' && (P.follow == null || P.follow === me || !other.online || other.scene !== 'home' || P.follow === partner)) {
      if (P.follow === partner && other.online) return; // 상대와 나가 있음
      goal = petHome();
      if (petE.scene !== scene.key) { petE.x = goal[0]; petE.y = goal[1]; petE.scene = scene.key; }
    }
    if (!goal) return;
    petE.show = true;
    const dx = goal[0] - petE.x, dy = goal[1] - petE.y, d = Math.hypot(dx, dy);
    if (d > 2) { const sp = Math.min(d, (d > 40 ? 120 : SPEED * 1.05) * dt); petE.x += (dx / d) * sp; petE.y += (dy / d) * sp; petE.moving = true; petE.step += dt; petE.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); }
    else petE.moving = false;
    // 가끔 혼잣말 (필요한 게 있으면 그걸 말함)
    if (Date.now() > petE.nextTalk) {
      petE.nextTalk = Date.now() + 14000 + Math.random() * 10000;
      const n = petNeeds(P), lines = [];
      if (n.clean < 40) lines.push(P.stage ? '몸이 꼬질꼬질해… 씻겨줘 🫧' : '(먼지가 뽀얗게 앉았어요… 닦아줄까요?)');
      if (P.stage === 0 && n.warm < 40) lines.push(n.warm <= 10 ? '(알이 덜덜 떨어요… 이대로면 하늘나라로 가요!)' : '(알이 조금 차가워요… 품어주거나 기타를 쳐줘요)');
      if (P.stage > 0 && n.full < 40) lines.push('배고파… 🍼');
      if (!lines.length) lines.push(...(P.stage === 0 ? ['(톡… 톡… 안에서 무언가 움직여요)', '(알이 따뜻하게 빛나요 ✨)', '(데굴… 알이 살짝 흔들려요)'] : ['헤헤 좋아~', '놀아줘!', `${names[me]} 최고!`, '오늘 뭐 했어?', '쿨… 아니 안 졸려!']));
      petE.bubble = { text: lines[Math.floor(Math.random() * lines.length)], until: Date.now() + 3200 };
    }
  }
  function petTint(P, base) {
    const f = P.food || {}, tot = Object.values(f).reduce((a, b) => a + b, 0);
    if (!tot) return base;
    const top = Object.keys(f).sort((a, b) => f[b] - f[a])[0], k = Math.min(0.45, f[top] / (tot + 6));
    const a = parseInt(base.slice(1), 16), b = parseInt(FOOD_COL[top].slice(1), 16);
    const mix = (sh) => Math.round(((a >> sh) & 255) * (1 - k) + ((b >> sh) & 255) * k);
    return '#' + [mix(16), mix(8), mix(0)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  // 펫 그리기 (발밑 px,py 기준). 단계별로 크기가 커지고, 먹이 색으로 몸이 물듦
  function drawPet(g, px, py, P, t, react) {
    const days = petDays(P), stg = P.stage || 0;
    const grow = 1 + Math.min(0.25, (days - [0, 3, 14, 38][stg]) * 0.02);
    const k = [1, 1.1, 1.35, 1.65][stg] * grow;
    const hop = petE.moving ? Math.abs(Math.sin(petE.step * 12)) * 2.5 : react && react.until > performance.now() ? Math.abs(Math.sin(t * 10)) * 2 : 0;
    const wob = react && react.until > performance.now() ? Math.sin(t * 18) * 1.2 : Math.sin(t * 1.5) * 0.3;
    py -= hop; px += stg === 0 ? wob : 0;
    ell(g, px, py + hop, 5 * k, 2 * k, 'rgba(0,0,0,.18)');
    const blink = (Math.floor(t * 10) % (40 - Math.min(20, days))) === 0;
    const eyes = (ex, ey, gap, col = '#2b2326') => { if (blink) { R2(g, ex - gap - 1, ey, 2, 0.6, col); R2(g, ex + gap - 1, ey, 2, 0.6, col); return; } R2(g, ex - gap - 1, ey - 1, 1.6, 2, col); R2(g, ex + gap - 0.6, ey - 1, 1.6, 2, col); R2(g, ex - gap - 0.8, ey - 1, 0.6, 0.6, '#fff'); R2(g, ex + gap - 0.4, ey - 1, 0.6, 0.6, '#fff'); };
    const blush = (ex, ey, gap) => { R2(g, ex - gap - 2.5, ey + 1, 1.8, 0.9, 'rgba(255,120,150,.7)'); R2(g, ex + gap + 0.8, ey + 1, 1.8, 0.9, 'rgba(255,120,150,.7)'); };
    const f = P.form || 'egg';
    if (f === 'egg') {
      const c = petTint(P, '#fff4e2');
      ell(g, px, py - 6.2 * k, 4.6 * k, 6 * k, '#e8d6bb'); ell(g, px, py - 6.4 * k, 4.2 * k, 5.6 * k, c);
      circle(g, px - 1.6, py - 8, 1.1, '#ffb3c6'); circle(g, px + 1.8, py - 5, 0.9, '#9be3d2'); circle(g, px + 0.4, py - 10.2, 0.8, '#ffd23a'); circle(g, px - 2, py - 4, 0.7, '#b48cff');
      R2(g, px - 2.6, py - 10, 1, 2.2, 'rgba(255,255,255,.85)');
      const n = petNeeds(P); if (n.clean < 40) for (let i = 0; i < 4; i++) circle(g, px - 2 + i * 1.4, py - 3 - (i % 2) * 3, 0.5, 'rgba(120,100,80,.5)');
      if (days >= 2 || P.intimacy >= 25) { g.strokeStyle = '#b89a76'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(px - 3, py - 7); g.lineTo(px - 1.5, py - 8); g.lineTo(px - 0.5, py - 6.6); g.lineTo(px + 1, py - 8.2); g.lineTo(px + 2.4, py - 7); g.stroke(); }
      if (P.intimacy >= 15) for (let i = 0; i < 2; i++) { const a = t * 2 + i * 3; R2(g, px + Math.cos(a) * 7, py - 8 + Math.sin(a) * 3, 0.8, 0.8, '#fff3a8'); }
      return [px - 5 * k, py - 13 * k, px + 5 * k, py + 1];
    }
    const BASE = { pong: '#ffc2d4', zzi: '#ffe066', muk: '#a8e6cf', lumi: '#fff1c9', aqua: '#8fd3ff', zephy: '#a8f0b8', pyro: '#ffab6b', golem: '#c9a27a', nox: '#4a5a9a', solaris: '#ffcf5a', chronicle: '#a8825a', mirage: '#c9b8ff', boulder: '#8fc48a', starfox: '#3b3f8f' };
    const c = petTint(P, BASE[f] || '#ffc2d4'), cd = shade(c, -0.22), cl = shade(c, 0.35);
    const by = py - 5 * k;
    const feet = () => { R2(g, px - 3 * k, py - 1.2, 2 * k, 1.2, cd); R2(g, px + 1 * k, py - 1.2, 2 * k, 1.2, cd); };
    switch (f) {
      case 'pong': feet(); ell(g, px, by, 6 * k, 5 * k, cd); ell(g, px, by - 0.4, 5.6 * k, 4.6 * k, c); ell(g, px - 2, by - 2.5, 1.6, 1, cl); eyes(px, by, 2.2); blush(px, by, 2.2); break;
      case 'zzi': feet(); poly(g, [[px - 5, by - 3], [px - 3.5, by - 9], [px - 1.5, by - 4]], cd); poly(g, [[px + 5, by - 3], [px + 3.5, by - 9], [px + 1.5, by - 4]], cd);
        g.strokeStyle = cd; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px + 5, by + 2); g.lineTo(px + 8, by - 1); g.lineTo(px + 7, by + 1); g.lineTo(px + 10, by - 3); g.stroke();
        ell(g, px, by, 5.4 * k, 4.8 * k, c); eyes(px, by, 2.2); blush(px, by, 2.2); break;
      case 'muk': feet(); ell(g, px, by, 6 * k, 5 * k, cd); ell(g, px, by - 0.4, 5.6 * k, 4.6 * k, c);
        g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(px, by - 3.5 * k, 5.4 * k, 3.4 * k, 0, Math.PI, 0); g.fill(); for (let i = -2; i <= 2; i++) poly(g, [[px + i * 2 - 1, by - 3.5 * k], [px + i * 2, by - 2.2 * k], [px + i * 2 + 1, by - 3.5 * k]], '#fffaf0');
        eyes(px, by + 0.6, 2.2); break;
      case 'lumi': feet(); ell(g, px, by, 6 * k, 5.2 * k, cd); ell(g, px, by - 0.4, 5.6 * k, 4.8 * k, c); R2(g, px - 0.4, by - 5.2 * k - 3, 0.8, 3, '#6fb35d'); ell(g, px - 2, by - 5.2 * k - 3, 2.2, 1.1, '#7cc36a'); ell(g, px + 2, by - 5.2 * k - 3.6, 2.2, 1.1, '#8fd07a');
        for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1; circle(g, px + Math.cos(a) * 9, by - 4 + Math.sin(a) * 4, 0.7, 'rgba(255,240,150,.9)'); } eyes(px, by, 2.4); blush(px, by, 2.4); break;
      case 'aqua': poly(g, [[px, by - 9 * k], [px - 5.6 * k, by + 1], [px + 5.6 * k, by + 1]], c); ell(g, px, by + 1, 5.6 * k, 4 * k, c); ell(g, px - 2, by - 1, 1.4, 2.2, cl); for (let i = 0; i < 3; i++) R2(g, px - 4 + i * 3, py - 1.2, 2, 1, cd); eyes(px, by + 1, 2.4); blush(px, by + 1, 2.4); break;
      case 'zephy': feet(); ell(g, px - 7, by - 1 + Math.sin(t * 9) * 1, 3.4, 1.8, cl); ell(g, px + 7, by - 1 - Math.sin(t * 9) * 1, 3.4, 1.8, cl); ell(g, px, by, 5.6 * k, 5 * k, c); g.strokeStyle = cd; g.lineWidth = 0.6; g.beginPath(); g.arc(px, by - 6 * k, 2, 0, 5); g.stroke(); eyes(px, by, 2.3); blush(px, by, 2.3); break;
      case 'pyro': feet(); { const fl = Math.sin(t * 14) * 1; poly(g, [[px + 4, by + 2], [px + 10, by - 4 + fl], [px + 7, by + 3]], '#ff6b3a'); poly(g, [[px + 5, by + 2], [px + 8.5, by - 1 + fl], [px + 7, by + 2.6]], '#ffd23a'); }
        ell(g, px, by, 5.6 * k, 5 * k, c); poly(g, [[px - 2, by - 5 * k], [px, by - 5 * k - 4], [px + 2, by - 5 * k]], '#ff6b3a'); eyes(px, by, 2.3); blush(px, by, 2.3); break;
      case 'golem': R2(g, px - 6 * k, by - 5 * k, 12 * k, 10 * k, cd); R2(g, px - 5.6 * k, by - 5.4 * k, 11.2 * k, 9.6 * k, c); R2(g, px - 5.6 * k, by - 5.4 * k, 11.2 * k, 2, '#6fb35d'); R2(g, px - 4, by + 1, 2, 2, cd); R2(g, px + 2, by - 2, 1.6, 1.6, cd); eyes(px, by - 0.5, 2.4); break;
      case 'nox': feet(); ell(g, px, by, 6 * k, 5.6 * k, cd); ell(g, px, by - 0.3, 5.6 * k, 5.2 * k, c); poly(g, [[px - 5, by - 3.6 * k], [px - 4, by - 7 * k], [px - 2, by - 4.4 * k]], c); poly(g, [[px + 5, by - 3.6 * k], [px + 4, by - 7 * k], [px + 2, by - 4.4 * k]], c);
        circle(g, px - 2.2, by - 0.5, 2, '#fff7d6'); circle(g, px + 2.2, by - 0.5, 2, '#fff7d6'); eyes(px, by - 0.3, 2.2); poly(g, [[px - 0.6, by + 1.4], [px + 0.6, by + 1.4], [px, by + 2.4]], '#ffb84a'); break;
      case 'solaris': case 'starfox': {
        const tail = f === 'solaris' ? '#fff3d0' : '#8ea0ff';
        ell(g, px + 7 * k * 0.8, by + 1 + Math.sin(t * 5) * 0.8, 3.4 * k, 2.2 * k, tail); ell(g, px + 9 * k * 0.8, by, 1.6 * k, 1.2 * k, '#ffffff');
        feet(); ell(g, px, by, 5.6 * k, 4.6 * k, c); poly(g, [[px - 5, by - 3], [px - 4.5, by - 3 - 6 * k], [px - 1, by - 4]], c); poly(g, [[px + 5, by - 3], [px + 4.5, by - 3 - 6 * k], [px + 1, by - 4]], c); poly(g, [[px - 4.2, by - 3.6], [px - 4, by - 2 - 5 * k], [px - 2, by - 4]], '#ffd1dc'); poly(g, [[px + 4.2, by - 3.6], [px + 4, by - 2 - 5 * k], [px + 2, by - 4]], '#ffd1dc');
        ell(g, px, by + 2, 3, 2, '#fffaf0'); eyes(px, by, 2.4); blush(px, by, 2.4);
        for (let i = 0; i < 5; i++) { const a = t * (f === 'solaris' ? 1.2 : 0.8) + i * 1.26; const sx = px + Math.cos(a) * 12, sy = by - 2 + Math.sin(a) * 5; if (f === 'solaris') circle(g, sx, sy, 0.8, 'rgba(255,220,120,.85)'); else { R2(g, sx - 1, sy, 2.4, 0.6, '#fff7c2'); R2(g, sx - 0.2, sy - 0.9, 0.6, 2.4, '#fff7c2'); } }
        break;
      }
      case 'chronicle': feet(); R2(g, px - 9 * k * 0.8, by - 3, 4 * k, 6 * k, '#fffaf0'); R2(g, px + 5 * k * 0.8, by - 3, 4 * k, 6 * k, '#fffaf0'); R2(g, px - 9 * k * 0.8, by - 3, 0.6, 6 * k, '#8a5a34'); R2(g, px + 9 * k * 0.8 - 0.6, by - 3, 0.6, 6 * k, '#8a5a34');
        ell(g, px, by, 6 * k, 5.6 * k, c); circle(g, px - 2.4, by - 0.6, 2.4, '#fff7d6'); circle(g, px + 2.4, by - 0.6, 2.4, '#fff7d6'); eyes(px, by - 0.5, 2.4);
        g.strokeStyle = '#2b2326'; g.lineWidth = 0.5; g.beginPath(); g.arc(px - 2.4, by - 0.6, 2.4, 0, 7); g.stroke(); g.beginPath(); g.arc(px + 2.4, by - 0.6, 2.4, 0, 7); g.stroke(); poly(g, [[px - 0.6, by + 2], [px + 0.6, by + 2], [px, by + 3]], '#ffb84a'); break;
      case 'mirage': { g.globalAlpha = 0.85; for (let i = -2; i <= 2; i++) { g.strokeStyle = shade(c, -0.1); g.lineWidth = 1; g.beginPath(); g.moveTo(px + i * 2.2, by + 2); g.quadraticCurveTo(px + i * 2.2 + Math.sin(t * 3 + i) * 2, by + 6, px + i * 2.2, py - 0.5); g.stroke(); }
        g.fillStyle = c; g.beginPath(); g.ellipse(px, by + 2, 7 * k, 7 * k, 0, Math.PI, 0); g.fill(); g.globalAlpha = 1;
        for (let i = 0; i < 6; i++) circle(g, px - 5 + ((i * 37) % 10), by - 3 + ((i * 23) % 5), 0.5, ['#fff', '#ffd23a', '#8fd3ff'][i % 3]); eyes(px, by, 2.4); blush(px, by, 2.4); break; }
      case 'boulder': feet(); ell(g, px, by + 1, 7 * k, 4.4 * k, '#5f8f55'); ell(g, px, by, 6.4 * k, 4 * k, c); for (let i = 0; i < 3; i++) ell(g, px - 3 + i * 3, by - 2, 1.4, 0.9, '#6fb35d');
        R2(g, px + 1, by - 4 * k - 4, 0.8, 4, '#6b4a2e'); circle(g, px + 1.4, by - 4 * k - 5, 2.4, '#4f8f45'); ell(g, px - 7 * k * 0.8, by + 1, 2.4, 2, '#f4efe0'); eyes(px - 7 * k * 0.8, by + 0.8, 0.9); break;
    }
    if (react && react.kind === 'evolve' && react.until > performance.now()) for (let i = 0; i < 6; i++) { const a = t * 4 + i; circle(g, px + Math.cos(a) * 10, by + Math.sin(a) * 6, 0.9, '#fff3a8'); }
    if (react && react.kind === 'wipe' && react.until > performance.now()) for (let i = 0; i < 4; i++) { const kk = (t * 1.5 + i / 4) % 1; circle(g, px - 4 + i * 2.6, by - 4 - kk * 8, 0.8 + kk, `rgba(200,235,255,${1 - kk})`); }
    return [px - 7 * k, by - 7 * k, px + 7 * k, py + 1];
  }
  // 알 창: 바로 뜨면 누른 손가락이 버튼을 같이 눌러버려서(갤럭시) 1초 동안 두근두근 화면을 먼저
  let petOpenAt = 0;
  function openPet(quick = false) {
    const P = townSt.pet; if (!P) return;
    const m = document.getElementById('modal');
    if (!quick) {
      const tok = petOpenAt = performance.now();
      m.innerHTML = `<div class="card pet-card pet-loading"><div class="pet-beat">${TOWN_ICONS.img(P.stage ? 'paw' : 'egg', 'beat')}</div><p>${P.stage ? '꼬물꼬물…' : '두근두근…'}</p><small>${esc(P.name || PET_FORM[P.form])}에게 가는 중</small></div>`;
      m.hidden = false; beep(523, 0.06); setTimeout(() => beep(659, 0.06), 300);
      setTimeout(() => { if (petOpenAt === tok && !m.hidden && m.querySelector('.pet-loading')) openPet(true); }, 1000);
      return;
    }
    const days = petDays(P), n = petNeeds(P);
    const qi = Math.floor(Date.parse(kstToday()) / 86400e3) % Math.max(1, PETQ.length), Q = PETQ[qi];
    const askQ = Q && P.lastQ !== kstToday();
    const acts = P.stage === 0
      ? [['wipe', '🧽', '닦아주기'], ['guitar', '🎸', '기타 쳐주기'], ['warm', '🤲', '품어주기'], ['knock', '👆', '톡톡'], ['talk', '💬', '태교 말걸기']]
      : [['feed', '🍽️', '밥 주기'], ['play', '🎈', '놀아주기'], ['wipe', '🫧', '목욕'], ['guitar', '🎸', '기타 쳐주기'], ['sleep', '🌙', '재우기'], ['talk', '💬', '이야기']];
    m.innerHTML = `<div class="card pet-card"><b class="wd-title">${esc(P.name || PET_FORM[P.form])} <small>· ${PET_STAGE[P.stage]} · D+${days + 1}</small></b>
      ${petGrow(P) != null ? `<div class="pet-grow"><small>다음 모습까지 · ${growWord(petGrow(P))}</small><div class="bar"><i style="width:${Math.round(petGrow(P) * 100)}%"></i></div></div>` : '<div class="pet-grow"><small>다 자랐어요 ✨</small></div>'}
      <canvas id="petView" width="120" height="96" style="width:120px;height:96px;image-rendering:pixelated"></canvas>
      <div class="pet-namebox" id="petNameBox"><b>${esc(P.name || '아직 이름이 없어요')}</b><button type="button" class="pet-pencil" id="petPencil" aria-label="이름 고치기"><img src="icons/doodle/pencil.svg" alt=""></button></div>
      <div class="pet-stat"><div>친밀감 💗 ${P.intimacy}</div>
        <div>청결 ${n.clean}% · ${P.stage ? `배부름 ${n.full}%` : `온기 ${n.warm}%`}</div>${!P.stage && n.warm < 30 ? `<div class="pet-cold">${n.warm <= 10 ? '🥶 너무 추워요! 온기가 0이 되면 하늘나라로 가요' : '🥶 추워서 돌봐줘도 친밀감이 절반만 올라요'}</div>` : ''}
        <div class="pet-mystery">어떤 모습으로 자랄지는 아무도 몰라요… 🌱</div></div>
      ${askQ ? `<div class="pet-q"><p>💭 ${esc(Q.q)}</p>${Q.a.map((a, i) => `<button type="button" data-a="${i}">${esc(a)}</button>`).join('')}</div>` : ''}
      <div class="pet-acts">${acts.map(([k, i, l]) => `<button type="button" data-k="${k}"><i>${i}</i>${l}</button>`).join('')}<button type="button" data-k="follow"><i>${P.follow === me ? '🏠' : '🐾'}</i>${P.follow === me ? '집에서 쉬기' : '같이 다니기'}</button></div>
      <details><summary>📔 그림일기</summary><div class="pet-diary">${(P.log || []).slice().reverse().map((l) => `<p><small>${new Date(l.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</small>${esc(l.text)}</p>`).join('') || '<p>아직 기록이 없어요.</p>'}</div></details>
      <button type="button" class="btn ghost" id="modalClose">닫기</button></div>`;
    const pv = m.querySelector('#petView').getContext('2d'); pv.imageSmoothingEnabled = false;
    const paint = () => { if (m.hidden || !m.querySelector('#petView')) return; pv.setTransform(1, 0, 0, 1, 0, 0); pv.clearRect(0, 0, 120, 96); pv.setTransform(4, 0, 0, 4, 0, 0); drawPet(pv, 15, 21, P, performance.now() / 1000, petE.react); requestAnimationFrame(paint); };
    requestAnimationFrame(paint); // 창이 열린 뒤부터 그림
    m.querySelector('#modalClose').onclick = () => (m.hidden = true);
    m.querySelectorAll('[data-a]').forEach((b) => (b.onclick = async () => { const d = await stateOp({ op: 'pet', act: 'answer', qi, ai: Number(b.dataset.a) }); if (d) { toast(d.msg); openPet(true); } }));
    // 연필을 누르면 그 자리에서 이름 고치기 (아이폰에서도 저장 버튼이 안 잘리게 한 줄 안에서 줄어듦)
    m.querySelector('#petPencil').onclick = () => {
      const box = m.querySelector('#petNameBox');
      box.innerHTML = `<input id="petName" maxlength="10" placeholder="이름 지어주기" value="${esc(P.name || '')}"><button type="button" id="petNameOk">저장</button>`;
      const inp = box.querySelector('#petName'); inp.focus(); inp.select();
      const saveName = async () => { const v = inp.value.trim(); if (!v) return; const d = await stateOp({ op: 'pet', act: 'name', name: v }); if (d) { toast(d.msg); openPet(true); } };
      box.querySelector('#petNameOk').onclick = saveName; inp.onkeydown = (e) => { if (e.key === 'Enter') saveName(); };
    };
    m.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => petAction(b.dataset.k)));
    m.hidden = false;
  }
  async function petAction(k) {
    const m = document.getElementById('modal');
    if (k === 'feed') {
      m.querySelector('.pet-acts').innerHTML = Object.entries(PET_FOODS).map(([c, [l, i]]) => `<button type="button" data-f="${c}"><i>${i}</i>${l}</button>`).join('');
      m.querySelectorAll('[data-f]').forEach((b) => (b.onclick = async () => { const d = await stateOp({ op: 'pet', act: 'feed', color: b.dataset.f }); if (d) { m.hidden = true; petFeedback('feed', d.msg); } }));
      return;
    }
    if (k === 'follow') { const on = townSt.pet.follow !== me; const d = await stateOp({ op: 'pet', act: 'follow', on }); if (d) { m.hidden = true; toast(d.msg); petE.scene = ''; } return; }
    const d = await stateOp({ op: 'pet', act: 'care', kind: k });
    if (d) { m.hidden = true; petFeedback(k, d.msg); }
  }
  function petFeedback(kind, msg) {
    toast(msg); petE.react = { kind, until: performance.now() + 2600 };
    petE.bubble = { text: { wipe: '뽀득뽀득 ✨', guitar: '🎵 ♪ ♫', warm: '따뜻해… 💗', knock: '톡! 톡!', talk: '응응! 듣고 있어', feed: '냠냠 맛있어!', play: '꺄르르~ 🎈', sleep: '쿨… 쿨… 💤' }[kind] || '헤헤', until: Date.now() + 2600 };
    if (kind === 'guitar') { const secs = playSong() || 6; for (let i = 0; i < 6; i++) setTimeout(() => { OX = scene.ox; OY = scene.oy; const [px, py] = iso(petE.x / T, petE.y / T); fx.notes.push({ x: px + Math.random() * 10 - 5, y: py - 14, t: 1.8, life: 1.8, ch: ['♪', '♫', '♬'][i % 3] }); }, i * Math.min(1000, secs * 150)); }
    if (kind === 'warm' || kind === 'play' || kind === 'feed') { OX = scene.ox; OY = scene.oy; const [px, py] = iso(petE.x / T, petE.y / T); for (let i = 0; i < 4; i++) fx.hearts.push({ x: px - 6 + Math.random() * 12, y: py - 16, t: 1 + Math.random(), life: 2, s: Math.random() * 6 }); }
    beep(988, 0.05); sendAct({ type: 'pet', kind });
    buddySays({ wipe: '반짝반짝 예쁘다~', guitar: '우리 아기 노래 좋아하네 ㅎㅎ', feed: '많이 먹고 쑥쑥 크자!', warm: '따뜻하지~?' }[kind] || '귀여워 💕');
  }
  const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  function openShop(shop) {
    const m = document.getElementById('modal');
    m.innerHTML = `<div class="card shop-card"><div class="shop-front" style="--wall:${shop.wall}"><div class="shop-sign${shop.glow ? ' glow' : ''}" style="background:${shop.sign};color:${shop.ink}">${shop.sub ? `<small class="l">${esc(shop.sub)}</small>` : ''}<b>${esc(shop.name)}</b>${(shop.right || []).map((t) => `<small class="r">${esc(t)}</small>`).join('')}</div><div class="shop-glass"><i></i><i></i><i></i><i></i></div></div><p class="shop-say">${esc(shop.say)}</p><button type="button" class="btn" id="modalClose">닫기</button></div>`;
    m.hidden = false; document.getElementById('modalClose').onclick = () => (m.hidden = true);
  }
  function askEnterBuilding() { say('별빛 아침 오피스텔. 공동현관으로 들어갈까요?', [{ label: '들어가기', fn: () => goScene('lobby') }]); }

  // ---------- 키패드 ----------
  const CODE_LEN = { lobby: 4, door: 6 };
  function openKeypad(which) {
    const m = document.getElementById('modal');
    const isLobby = which === 'lobby', len = CODE_LEN[which];
    let code = '';
    m.innerHTML = `<div class="card keypad ${isLobby ? 'lobby' : 'door'}"><div class="kp-title">${isLobby ? '공동현관' : '406호 도어락'}</div><div class="kp-slots" id="kpSlots">${'<i></i>'.repeat(len)}</div><div class="kp-msg" id="kpMsg">${len}자리 숫자를 눌러주세요</div><div class="kp-grid">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'].map((k) => `<button type="button" data-k="${k}" class="${k === 'ok' ? 'ok' : k === 'del' ? 'del' : ''}">${k === 'del' ? '지우기' : k === 'ok' ? '확인' : k}</button>`).join('')}</div><p class="kp-hint">힌트: 처음 만난 날</p><button type="button" class="kp-close" data-k="close">✕</button></div>`;
    m.hidden = false;
    const slots = [...m.querySelectorAll('#kpSlots i')], msg = document.getElementById('kpMsg');
    const show = () => slots.forEach((s, i) => s.classList.toggle('on', i < code.length));
    m.querySelectorAll('button').forEach((b) => (b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'close') { m.hidden = true; return; }
      if (k === 'del') { code = code.slice(0, -1); beep(520, 0.05); show(); return; }
      if (k === 'ok') return submit();
      if (code.length < len) { code += k; beep(880, 0.06); show(); }
      if (code.length === len) setTimeout(submit, 150);
    }));
    let sending = false;
    async function submit() {
      if (sending) return;
      if (code.length !== len) { msg.textContent = `${len}자리를 모두 눌러주세요`; return; }
      sending = true; let okay = false;
      try { const r = await fetch('/api/town/unlock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ which, code }) }); okay = (await r.json()).ok === true; }
      catch { msg.textContent = '연결이 안 돼요'; sending = false; return; }
      sending = false;
      if (!okay) { code = ''; msg.textContent = '삐삐- 비밀번호가 틀렸어요'; m.querySelector('.card').classList.add('shake'); beep(300, 0.12); setTimeout(() => beep(300, 0.12), 160); setTimeout(() => { m.querySelector('.card')?.classList.remove('shake'); show(); }, 700); return; }
      msg.textContent = isLobby ? '문이 열립니다' : '띠리릭~ 어서 와요!';
      melody([784, 988, 1175, 1568]);
      setTimeout(() => { m.hidden = true; if (isLobby) { lobbyOpen = true; say('공동현관이 열렸어요! 엘리베이터로 가요.'); walkTo(4, 6); } else goScene('home'); }, 650);
    }
  }

  // ---------- 엘리베이터 ----------
  function ride(dir) {
    if (dir === 'up' && !lobbyOpen) { say('공동현관 비밀번호를 먼저 눌러야 해요.'); return; }
    const m = document.getElementById('modal');
    const floors = dir === 'up' ? [1, 2, 3, 4] : [4, 3, 2, 1];
    m.innerHTML = `<div class="card elevator"><div class="ev-panel"><span class="ev-arrow">${dir === 'up' ? '▲' : '▼'}</span><span class="ev-floor" id="evFloor">${floors[0]}</span></div><div class="ev-text" id="evText">${dir === 'up' ? '4층 우리 집으로 올라가는 중' : '1층으로 내려가는 중'}</div><div class="ev-doors"><i></i><i></i></div></div>`;
    m.hidden = false; busy = true;
    floors.forEach((f, i) => setTimeout(() => { const el = document.getElementById('evFloor'); if (el) el.textContent = f; beep(440 + i * 60, 0.04); }, i * 650));
    setTimeout(() => { document.getElementById('evText').textContent = `띵동~ ${floors[3]}층입니다!`; melody([1047, 784]); m.querySelector('.ev-doors').classList.add('open'); }, 3 * 650 + 300);
    setTimeout(() => { m.hidden = true; busy = false; if (dir === 'up') goScene('hall', [9, 2, 'down']); else goScene('lobby', [4, 1, 'down']); }, 3 * 650 + 1200);
  }

  // ---------- 소리 ----------
  let ac = null;
  function audio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch {} }
  function beep(freq, dur, when = 0) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.05, ac.currentTime + when); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + when + dur);
    o.connect(g).connect(ac.destination); o.start(ac.currentTime + when); o.stop(ac.currentTime + when + dur + 0.02);
  }
  const melody = (notes) => notes.forEach((f, i) => beep(f, 0.12, i * 0.11));

  // ---------- 시작 ----------
  // 나가는 순간 "오프라인" 신호 (탭 닫기 · 앱 내리기 · 뒤로가기)
  function goOffline() {
    clearTimeout(syncTimer);
    const data = JSON.stringify({ me, offline: true });
    try { if (!navigator.sendBeacon('/api/town/presence', new Blob([data], { type: 'application/json' }))) throw 0; }
    catch { fetch('/api/town/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(() => {}); }
  }
  window.addEventListener('pagehide', goOffline);
  document.getElementById('backBtn').onclick = () => { saveSpot(); goOffline(); location.href = '/'; };
  // 앱 화면(레시피·의결서·편지)으로 갈 때: 표시를 달아서 거기서 뒤로 가면 다시 동네로
  function leaveTo(url) { saveSpot(); location.href = url + (url.includes('?') ? '&' : '?') + 'from=town'; }
  // 갤럭시 뒤로 가기(제스처)를 덜 민감하게: 창이 열려 있으면 창만 닫고, 아니면 한 번 더 눌러야 동네에서 나감
  let backAt = 0;
  history.pushState({ town: 1 }, '');
  window.addEventListener('popstate', () => {
    const m = document.getElementById('modal');
    if (!m.hidden) { m.hidden = true; history.pushState({ town: 1 }, ''); return; }
    if (!sayEl.hidden) { closeSay(); history.pushState({ town: 1 }, ''); return; }
    if (Date.now() - backAt < 2000) { saveSpot(); goOffline(); history.back(); return; }
    backAt = Date.now(); history.pushState({ town: 1 }, ''); toast('한 번 더 뒤로 가면 동네에서 나가요');
  });
  // 알림을 눌렀는데 동네가 이미 열려 있으면 (서비스워커가 알려줌) 그 주소로
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'open' && e.data.url) { saveSpot(); location.href = e.data.url; } });
  // 창이 막 뜬 순간의 터치는 무시 (창을 연 손가락이 그대로 버튼을 누르는 것 방지)
  let modalShownAt = 0;
  new MutationObserver(() => { if (!document.getElementById('modal').hidden) modalShownAt = performance.now(); }).observe(document.getElementById('modal'), { attributes: true, attributeFilter: ['hidden'] });
  document.getElementById('modal').addEventListener('click', (e) => { if (performance.now() - modalShownAt < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
  // 마지막 장소 기억: 다시 들어오면 그 자리에서 이어서
  function saveSpot() { try { if (scene && player) localStorage.setItem('kk_town_spot', JSON.stringify({ scene: scene.key, x: Math.floor(player.x / T), y: Math.floor(player.y / T), face: player.face, at: Date.now() })); } catch {} }
  setInterval(saveSpot, 3000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveSpot(); });
  window.addEventListener('pagehide', saveSpot);
  document.getElementById('modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !busy) e.target.hidden = true; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) goOffline(); else syncSoon(); });

  // =====================================================================
  // 무전기: 버튼을 꾹 누르는 동안 말하고, 떼면 상대에게 감 (상대가 동네에 있으면 바로 들림)
  // =====================================================================
  const talkBtn = document.getElementById('talkBtn'), talkPill = document.getElementById('talkPill');
  let micStream = null, micIdle = null, rec = null, recStart = 0, recTimer = null, voiceAt = '', voiceInit = false, lastHeard = '';
  const REC_MAX = 15;
  const recMime = () => ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  function chirp(up) { audio(); [up ? 880 : 1320, up ? 1320 : 880].forEach((f, i) => beep(f, 0.05, i * 0.06)); }
  async function startTalk() {
    if (rec) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) { toast('이 브라우저는 무전기를 지원하지 않아요'); return; }
    try {
      clearTimeout(micIdle);
      if (!micStream || !micStream.active) micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch { toast('마이크를 허용해야 무전할 수 있어요 (설정 → 마이크)'); return; }
    if (!talkBtn.classList.contains('down')) return; // 허락 받는 사이 손을 뗐으면 취소
    const mime = recMime(), chunks = [];
    try { rec = new MediaRecorder(micStream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined); } catch { rec = new MediaRecorder(micStream); }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => sendVoice(new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' }), (performance.now() - recStart) / 1000);
    recStart = performance.now(); rec.start(); chirp(true);
    talkBtn.classList.add('rec'); talkPill.hidden = false;
    fx.bubbles[me] = { text: '(무전 중… 치직)', until: Date.now() + REC_MAX * 1000 };
    const tick = () => { const s2 = (performance.now() - recStart) / 1000; talkPill.textContent = `말하는 중 ${Math.floor(s2)}초 · 떼면 전송`; if (s2 >= REC_MAX) stopTalk(); else recTimer = setTimeout(tick, 200); };
    tick();
  }
  function stopTalk() {
    talkBtn.classList.remove('down');
    if (!rec) return;
    clearTimeout(recTimer); talkBtn.classList.remove('rec'); talkPill.hidden = true; fx.bubbles[me] = null;
    try { rec.stop(); } catch {}
    rec = null; chirp(false);
    clearTimeout(micIdle); micIdle = setTimeout(() => { if (micStream) micStream.getTracks().forEach((t) => t.stop()); micStream = null; }, 60e3); // 1분 안 쓰면 마이크 끔
  }
  async function sendVoice(blob, dur) {
    if (dur < 0.5 || !blob.size) { toast('조금 더 길게 눌러서 말해주세요'); return; }
    if (blob.size > 360 * 1024) { toast('너무 길어요. 15초 안으로 말해주세요'); return; }
    const data = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    try {
      const r = await fetch('/api/town/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ me, op: 'send', data, dur }) });
      const d = await r.json();
      if (!d.ok) { toast(d.error || '무전을 못 보냈어요'); return; }
      voiceAt = d.voiceAt; toast(other.online ? `${names[partner]}에게 무전을 보냈어요` : `무전을 남겼어요. ${names[partner]}가 동네에 오면 들을 수 있어요`);
    } catch { toast('연결이 잠깐 끊겼어요'); }
  }
  async function checkVoice(at) {
    if (!at || at === voiceAt) return;
    voiceAt = at;
    try {
      const d = await (await fetch('/api/town/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ me, op: 'latest' }) })).json();
      const c = d.clip;
      if (!c || c.id === lastHeard) return;
      const fresh = Date.now() - Date.parse(c.at) < 5 * 60e3;
      const first = !voiceInit; voiceInit = true;
      if (first && !fresh) { lastHeard = c.id; return; } // 오래된 무전은 조용히 넘김
      lastHeard = c.id;
      playVoice(c);
    } catch {}
  }
  async function playVoice(c) {
    toast(`${names[partner]}의 무전이 왔어요`);
    fx.bubbles[partner] = { text: '(무전) 치직…', until: Date.now() + Math.max(2500, (c.dur || 2) * 1000 + 600) };
    if (!other.visible && buddyHere()) buddy.bubble = { text: '(무전) 치직…', until: Date.now() + 3000 };
    chirp(true);
    TOWN_MUSIC.duck(true); setTimeout(() => TOWN_MUSIC.duck(false), Math.max(2500, (c.dur || 2) * 1000 + 900)); // 무전 들을 땐 음악 작게
    try {
      audio();
      const buf = await (await fetch(c.data)).arrayBuffer();
      const ab = await ac.decodeAudioData(buf);
      const src = ac.createBufferSource(), gn = ac.createGain(); gn.gain.value = 1.4; src.buffer = ab; src.connect(gn).connect(ac.destination); src.start(ac.currentTime + 0.15);
    } catch { try { const a = new Audio(c.data); await a.play(); } catch { toast('무전을 들으려면 화면을 한 번 눌러주세요'); pendingVoice = c; } }
  }
  let pendingVoice = null;
  document.addEventListener('pointerdown', () => { audio(); if (pendingVoice) { const c = pendingVoice; pendingVoice = null; playVoice(c); } }, { capture: true });
  talkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); talkBtn.classList.add('down'); try { talkBtn.setPointerCapture(e.pointerId); } catch {} startTalk(); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) talkBtn.addEventListener(ev, () => stopTalk());
  talkBtn.addEventListener('contextmenu', (e) => e.preventDefault());

  // =====================================================================
  // 3D 화면 연결 (town3d-view.js): 게임 로직은 여기 그대로, 그리기만 3D 가 맡음
  // =====================================================================
  const joy = { x: 0, y: 0, on: false }; // 화면 왼쪽 아래 조이스틱 (세상 기준 방향)
  let exitCool = 0;
  function joyMove(dt) {
    if (!joy.on || !(joy.x || joy.y) || player.pillion || busy || editing) return;
    if (anim && performance.now() < anim.until) return;
    if (player.pose) standUp();
    path = []; pending = null;
    const n = Math.hypot(joy.x, joy.y), sp = SPEED * (player.ride ? RIDE_SPEED[player.ride] : 1) * dt * Math.min(1, n);
    const vx = (joy.x / n) * sp, vy = (joy.y / n) * sp, rr = 4;
    const ok = (px, py) => [[px - rr, py - rr], [px + rr, py - rr], [px - rr, py + rr], [px + rr, py + rr]].every(([a, b]) => walkable(scene, Math.floor(a / T), Math.floor(b / T)));
    const tryExit = (px, py) => { // 문·출구 쪽으로 밀면 그 문을 씀
      if (exitCool > performance.now()) return;
      const tx = Math.floor(px / T + Math.sign(px - player.x) * 0.3), ty = Math.floor(py / T + Math.sign(py - player.y) * 0.3);
      const o = scene.objects.find((ob) => ob.interact && ob.solid === false && tx >= ob.x && tx < ob.x + (ob.w || 1) && ty >= ob.y && ty < ob.y + (ob.h || 1));
      if (o) { exitCool = performance.now() + 1500; joy.on = false; o.interact(); }
    };
    if (ok(player.x + vx, player.y)) player.x += vx; else tryExit(player.x + vx * 6, player.y);
    if (ok(player.x, player.y + vy)) player.y += vy; else { tryExit(player.x, player.y + vy * 6); if (vy < 0 && lockedAhead(Math.floor((player.y + vy * 6) / T)) && exitCool < performance.now()) { exitCool = performance.now() + 1500; joy.on = false; openKeypad('lobby'); } }
    player.face = Math.abs(joy.x) > Math.abs(joy.y) ? (joy.x > 0 ? 'right' : 'left') : (joy.y > 0 ? 'down' : 'up');
    player.moving = true; player.step += dt;
    if (Math.random() < dt * 2) syncSoon();
  }
  function tap3D(h) {
    if (busy) return;
    closeSay();
    if (!h) return;
    if (h.entrance) return useObject(scene.entrance.obj);
    if (h.pet) { const tx = Math.floor(petE.x / T), ty = Math.floor(petE.y / T), [px, py] = ptile(); if (Math.abs(px - tx) + Math.abs(py - ty) <= 2) return openPet(); const t = nearestWalkable(tx, ty + 1) || nearestWalkable(tx, ty); if (t) return walkTo(t[0], t[1], openPet); return openPet(); }
    if (h.kind === 'partner') return tapPartner();
    if (h.kind === 'buddy') return tapBuddy();
    if (h.kind === 'npc') return h.npc.lines && talkNpc(h.npc);
    if (h.kind === 'me') return openEmotes();
    if (player.pillion) return toast('뒤에 타고 있어요! 내리려면 🛑 내리기');
    if (h.obj && h.obj.interact) return useObject(h.obj);
    if (h.shop) { const o = scene.objects.find((ob) => ob.interact && ob.y === h.shop.y0 && (h.shop.side === 'W' ? ob.x === 0 : ob.x === 15)); if (h.shop.id === 'starlight') return useObject(scene.entrance.obj); if (o) return useObject(o); }
    if (h.grid) {
      const tx = Math.floor(h.grid[0]), ty = Math.floor(h.grid[1]);
      if (lockedAhead(ty)) return goKeypad();
      const ex = exitNear(h.grid[0], h.grid[1]); if (ex) return useObject(ex);
      const o = scene.objects.find((ob) => ob.interact && tx >= ob.x && tx < ob.x + (ob.w || 1) && ty >= ob.y && ty < ob.y + (ob.h || 1));
      if (o) return useObject(o);
      const t = walkable(scene, tx, ty) ? [tx, ty] : nearestWalkable(Math.max(0, Math.min(scene.w - 1, tx)), Math.max(0, Math.min(scene.h - 1, ty)));
      if (t) { tapMark = { x: t[0], y: t[1], t: 0.6 }; walkTo(t[0], t[1]); }
    }
  }
  function overlay3D(items) { // 이름표 · 말풍선 (3D 위치를 화면에 옮긴 좌표, 캔버스 px)
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    const now = Date.now();
    for (const it of items) {
      if (it.heart) { // 픽셀 하트 (뽀뽀·안기·옷 갈아입기 …)
        const k = (it.big ? 3 : 2) * dprNow(); ctx.globalAlpha = it.a ?? 1;
        HEART.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') { ctx.fillStyle = '#ff4f72'; ctx.fillRect(Math.round(it.x + (i - 3.5) * k), Math.round(it.y + j * k), Math.ceil(k), Math.ceil(k)); } }));
        if (it.big) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(it.x - 2 * k), Math.round(it.y + k), Math.ceil(k), Math.ceil(k)); }
        ctx.globalAlpha = 1; continue;
      }
      if (it.gauge != null) { // 알 위 성장 게이지
        const d = dprNow(), w = 34 * d, h = 5 * d, x = it.x - w / 2, y = it.y;
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(x - d, y - d, w + 2 * d, h + 2 * d);
        ctx.fillStyle = '#f3e6ee'; ctx.fillRect(x, y, w, h);
        const gr = ctx.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#ffd23a'); gr.addColorStop(1, '#ff8fab'); ctx.fillStyle = gr; ctx.fillRect(x, y, w * it.gauge, h);
        continue;
      }
      if (it.note) { ctx.globalAlpha = it.a ?? 1; ctx.fillStyle = '#5a3c8c'; ctx.font = `${15 * dprNow()}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(it.note, it.x, it.y); ctx.globalAlpha = 1; continue; }
      if (it.tag) nameTag(it.tag, it.x, it.y, it.color);
      if (it.bub && it.bub.until > now) speech(it.bub.text, it.x, it.y - (it.tag ? 14 * dprNow() : 0));
    }
  }
  const dummyG = document.createElement('canvas').getContext('2d');
  function capture(fn) { const k = [OX, OY]; CAP = { out: [], group: '' }; try { fn(dummyG); } catch (e) { console.error(e); } const out = CAP.out; CAP = null; [OX, OY] = k; return out; }
  window.T3API = {
    get scene() { return scene; }, get player() { return player; }, other, buddy, petE, fx, joy, scenes,
    get townSt() { return townSt; }, get tvOn() { return tvOn; }, get editing() { return editing; }, get anim() { return anim; }, get tapMark() { return tapMark; },
    get names() { return names; }, me, partner, T, WH, LAMP_COL, NPCSPR, fv,
    buddyHere, peopleNow, petGrow, drawAt, drawEmote, drawPet, drawFurniture, sprOf, iso, sky, capture, tap3D, overlay3D, startEdit, behind,
    setOrigin(ox, oy) { OX = ox; OY = oy; }, dprNow, layoutVer: () => layoutAt + JSON.stringify(layout),
  };
  function start() {
    scenes.street = streetScene(); scenes.yunseul = yunseulScene(); scenes.beach = beachScene(); linkStreet(); scenes.jumak = jumakScene(); scenes.mart = martScene(); scenes.lobby = lobbyScene(); scenes.hall = hallScene(); scenes.home = homeScene();
    resize();
    let s0 = scenes[qs.get('scene')], at0 = s0 ? s0.spawn : null;
    if (!s0) { // 주소에 장소가 없으면 지난번 마지막 장소에서
      try { const sp = JSON.parse(localStorage.getItem('kk_town_spot') || 'null'); const sc = sp && scenes[sp.scene]; if (sc && walkable(sc, sp.x, sp.y)) { s0 = sc; at0 = [sp.x, sp.y, sp.face]; } } catch {}
    }
    if (!s0) { s0 = scenes.street; at0 = s0.spawn; }
    place(s0, at0);
    if (qs.get('cook')) setTimeout(() => goCook(qs.get('cook')), 1600);
    if (qs.get('pet')) { // 알림에서 '이름 지어주세요' → 펫 창 열고 이름 칸에 바로
      const tryPet = (n) => { if (townSt.pet && scene.key === 'home') { openPet(); setTimeout(() => { document.getElementById('petPencil')?.click(); }, 1300); } else if (n > 0) setTimeout(() => tryPet(n - 1), 700); };
      setTimeout(() => tryPet(8), 1500);
    }
    requestAnimationFrame(frame); sync();
  }
  // 글꼴 (Poor Story · 간판용 갈무리 픽셀 글꼴) 을 받은 뒤 시작 — 3초 넘으면 그냥 시작
  const fontsReady = document.fonts && document.fonts.load ? Promise.all(['16px "Poor Story"', '11px Galmuri11', '9px Galmuri9', '7px Galmuri7'].map((f) => document.fonts.load(f, '가A').catch(() => {}))) : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 3000))]).then(start);
  window.__town = { openMart, openCheckout, openFridge, openCook, openPet, serveMeal, cookGame, doEmote, approachBuddy, get townSt() { return townSt; }, petE, openWardrobe, changeOutfit, outfit, setZoom, scenes, get scene() { return scene; }, get player() { return player; }, other, walkTo, goScene, openKeypad, tap, startEdit, nudge, endEdit, showAct, buddy, get layout() { return layout; }, fv, setTilt, turnAround, openEmotes, openPhotoBoard, mount, dismount, hopOn, meow, frontTap, get photos() { return photos; } };
})();
