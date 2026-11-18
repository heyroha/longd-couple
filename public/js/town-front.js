// 우리 동네 — 정면에서 본 거리 (가게 앞모습 그림)
// 물결로를 사이에 두고 서쪽 줄(올리브샵~고짚)과 동쪽 줄(경보·달빛주막~별빛)을 각각 한 장의 긴 그림으로 그림
// - base: 낮 모습 / emit: 밤에 빛나는 부분(간판·창문·전구)만 따로 → 밤엔 어둡게 덮은 뒤 emit 을 다시 올림
// - 가로 1칸(거리 격자 y 1칸) = CW px, 땅(인도 윗선) = G
(() => {
  const CW = 22, SH = 250, G = 200, H = 56, RES = 2;
  const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';
  const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w * RES; c.height = h * RES; const g = c.getContext('2d'); g.scale(RES, RES); g.imageSmoothingEnabled = false; return [c, g]; };
  const shade = (hex, amt) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v)))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };

  // ---------- 그리기 도구 (b: 낮 그림, e: 밤에 빛나는 그림) ----------
  let b, e, r;
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const RB = (x, y, w, h, c, glow) => { R(b, x, y, w, h, c); if (glow) R(e, x, y, w, h, glow === true ? c : glow); };
  const circ = (g, x, y, rr, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); };
  const ell = (g, x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); };
  function text(g, s, x, y, size, c, o = {}) {
    g.save(); g.font = `${o.w || 800} ${size}px ${FONT}`; g.fillStyle = c; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    if (o.max) { const m = g.measureText(s).width; if (m > o.max) { g.translate(x, y); g.scale(o.max / m, 1); g.fillText(s, 0, 0); g.restore(); return; } }
    if (o.spacing) { let cx = x - (s.length - 1) * o.spacing / 2; for (const ch of s) { g.fillText(ch, cx, y); cx += o.spacing; } } else g.fillText(s, x, y);
    g.restore();
  }
  // 밤에 켜지는 실내: 낮 그림을 그대로 복사해 따뜻하게 물들임 (안쪽 모습이 보이게)
  function lit(x, y, w, h, tint = 'rgba(255,196,110,.22)') { e.drawImage(b.canvas, x * RES, y * RES, w * RES, h * RES, x, y, w, h); R(e, x, y, w, h, tint); }
  const TB = (s, x, y, size, c, o = {}) => { text(b, s, x, y, size, c, o); if (o.glow) text(e, s, x, y, size, o.glow === true ? c : o.glow, o); };
  // 타일 벽 (돌 · 타일 · 벽돌)
  function wall(x, y, w, h, kind, c) {
    R(b, x, y, w, h, c);
    const line = shade(c, -0.12), hi = shade(c, 0.08);
    if (kind === 'stone') { // 큰 석재 판 (엇갈림)
      for (let j = 0, yy = y; yy < y + h; yy += 11, j++) { R(b, x, yy, w, 0.6, line); for (let xx = x + (j % 2 ? 0 : 11); xx < x + w; xx += 22) R(b, xx, yy, 0.6, 11, line); }
      for (let i = 0; i < w * h / 90; i++) R(b, x + r() * w, y + r() * h, 1, 1, r() < 0.5 ? hi : line);
    } else if (kind === 'tile') { // 작은 정사각 타일
      for (let yy = y; yy < y + h; yy += 4) R(b, x, yy, w, 0.5, line);
      for (let xx = x; xx < x + w; xx += 4) R(b, xx, y, 0.5, h, line);
    } else if (kind === 'brick') {
      for (let j = 0, yy = y; yy < y + h; yy += 3.5, j++) { R(b, x, yy, w, 0.5, line); for (let xx = x + (j % 2 ? 0 : 3.5); xx < x + w; xx += 7) R(b, xx, yy, 0.5, 3.5, line); }
      for (let i = 0; i < w * h / 40; i++) R(b, x + r() * w, y + r() * h, 1.5, 1, r() < 0.5 ? hi : shade(c, -0.06));
    } else if (kind === 'panel') { // 세로 줄 패널
      for (let xx = x; xx < x + w; xx += 3) R(b, xx, y, 0.5, h, line);
    } else if (kind === 'wood') {
      for (let xx = x; xx < x + w; xx += 2.5) R(b, xx, y, 0.4, h, line);
      for (let i = 0; i < w * h / 50; i++) R(b, x + r() * w, y + r() * h, 0.4, 2, shade(c, -0.18));
    }
  }
  // 위층 창문 (밤에 일부 켜짐)
  function win(x, y, w, h, o = {}) {
    const frame = o.frame || '#5b5f66', glass = o.glass || '#7f97a8';
    R(b, x - 1, y - 1, w + 2, h + 2, frame); R(b, x, y, w, h, glass);
    R(b, x + 1, y + 1, w * 0.35, h - 2, shade(glass, 0.18)); // 반사
    R(b, x + w / 2 - 0.4, y, 0.8, h, frame); // 가운데 창살
    if (o.curtain) { R(b, x, y, w * 0.28, h, o.curtain); R(b, x + w * 0.72, y, w * 0.28, h, o.curtain); }
    if (o.bars) for (let xx = x - 1; xx <= x + w + 1; xx += 2) R(b, xx, y + h * 0.35, 0.6, h * 0.7, '#3a3d42'); // 방범창
    if (o.bars) R(b, x - 1.5, y + h * 0.35, w + 3, 0.8, '#3a3d42');
    const lit = o.lit ?? r() < 0.55;
    if (lit) { R(e, x, y, w, h, o.litC || (r() < 0.7 ? '#ffd88a' : '#bfe0ff')); if (o.curtain) { R(e, x, y, w * 0.28, h, shade(o.curtain, 0.1)); R(e, x + w * 0.72, y, w * 0.28, h, shade(o.curtain, 0.1)); } R(e, x + w / 2 - 0.4, y, 0.8, h, frame); }
    else R(e, x, y, w, h, 'rgba(0,0,0,0)');
  }
  function acUnit(x, y) { R(b, x, y, 9, 7, '#e8e8e4'); R(b, x, y + 6.4, 9, 0.6, '#b8b8b2'); circ(b, x + 3.2, y + 3.4, 2.5, '#9a9d9f'); circ(b, x + 3.2, y + 3.4, 1.8, '#c8cacb'); for (let i = 0; i < 4; i++) R(b, x + 6.5, y + 1.5 + i * 1.2, 2, 0.5, '#9a9d9f'); R(b, x + 4, y + 7, 0.6, 3, '#6a6d70'); }
  function pot(x, y, kind = 0, s = 1) { // 화분 (잎 모양 3가지)
    R(b, x - 2.5 * s, y - 4 * s, 5 * s, 4 * s, ['#c0622f', '#d9d4c7', '#7a5a3c'][kind % 3]); R(b, x - 3 * s, y - 4.5 * s, 6 * s, 1 * s, shade(['#c0622f', '#d9d4c7', '#7a5a3c'][kind % 3], -0.15));
    const greens = ['#3f8f45', '#5fae4e', '#2e6b33', '#7cc36a'];
    if (kind % 4 === 0) for (let i = 0; i < 6; i++) ell(b, x + (r() - 0.5) * 7 * s, y - 6 * s - r() * 6 * s, 2.4 * s, 1.5 * s, greens[i % 4]);
    else if (kind % 4 === 1) for (let i = 0; i < 7; i++) R(b, x - 3 * s + i * s, y - 5 * s - (2 + r() * 7) * s, 0.8 * s, (2 + r() * 7) * s, greens[i % 4]);
    else if (kind % 4 === 2) { for (let i = 0; i < 5; i++) ell(b, x + (i - 2) * 1.8 * s, y - 7 * s - Math.abs(i - 2) * -1 * s, 2.2 * s, 3.6 * s, greens[(i + 1) % 4]); circ(b, x + 1 * s, y - 10 * s, 1.1 * s, '#ffffff'); circ(b, x - 2 * s, y - 9 * s, 1 * s, '#ffd23a'); }
    else { ell(b, x, y - 7 * s, 4 * s, 4 * s, '#3f8f45'); for (let i = 0; i < 4; i++) circ(b, x + (r() - 0.5) * 6 * s, y - 7 * s + (r() - 0.5) * 6 * s, 0.9 * s, ['#ff8fab', '#ffd23a', '#ffffff'][i % 3]); }
  }
  function awningStripe(x, y, w, h, c1, c2) { for (let xx = x, i = 0; xx < x + w; xx += 5, i++) R(b, xx, y, Math.min(5, x + w - xx), h, i % 2 ? c2 : c1); for (let xx = x; xx < x + w; xx += 5) { b.fillStyle = (Math.round((xx - x) / 5) % 2) ? c2 : c1; b.beginPath(); b.arc(xx + 2.5, y + h, 2.5, 0, Math.PI); b.fill(); } R(b, x, y, w, 1, shade(c1, -0.3)); }
  function laundry(x, y, w) { b.strokeStyle = '#555'; b.lineWidth = 0.4; b.beginPath(); b.moveTo(x, y); b.lineTo(x + w, y); b.stroke(); for (let xx = x + 2; xx < x + w - 3; xx += 4 + r() * 2) R(b, xx, y, 3, 4 + r() * 3, ['#f4f4f0', '#ffd1dc', '#cfe8ff', '#f2c94c'][Math.floor(r() * 4)]); }
  function roofline(x, y, w, c = '#cfc8bc') { R(b, x - 1, y - 2, w + 2, 2.5, c); R(b, x - 1, y + 0.5, w + 2, 0.6, shade(c, -0.25)); }
  function tank(x, y) { R(b, x, y - 10, 10, 10, '#4a90c8'); R(b, x, y - 10, 10, 1.5, '#6aaee0'); R(b, x + 2, y, 1, 3, '#555'); R(b, x + 7, y, 1, 3, '#555'); }
  function meter(x, y) { R(b, x, y, 4, 6, '#d9dcdf'); R(b, x + 0.6, y + 0.8, 2.8, 2, '#3a3d42'); R(b, x + 1.5, y + 6, 1, 3, '#7a7d80'); }
  function vsign(x, y, w, h, bg, s, fg) { RB(x, y, w, h, bg, true); R(b, x, y, w, 0.8, shade(bg, -0.3)); [...s].forEach((ch, i) => TB(ch, x + w / 2, y + 5 + i * ((h - 10) / Math.max(1, s.length - 1)), Math.min(w - 1.5, 6), fg, { glow: true })); }
  // 가게 1층 유리 + 안쪽 모습
  function storefront(x, y, w, h, o = {}) {
    const fr = o.frame || '#3a3d42';
    R(b, x, y, w, h, fr);
    const n = o.panes || Math.max(2, Math.round(w / 22));
    const pw = (w - 2) / n;
    for (let i = 0; i < n; i++) {
      const px = x + 1 + i * pw, py = y + 1, ph = h - (o.base ? 6 : 2);
      const inside = o.inside || '#e9eef0';
      R(b, px + 0.6, py, pw - 1.2, ph, inside);
      R(e, px + 0.6, py, pw - 1.2, ph, 'rgba(0,0,0,0)');
      if (o.draw) o.draw(px + 0.6, py, pw - 1.2, ph, i);
      lit(px + 0.6, py, pw - 1.2, ph, o.tint);
      R(b, px + 1, py + 1, (pw - 1.2) * 0.2, ph - 2, 'rgba(255,255,255,.28)'); // 유리 반사
    }
    if (o.base) R(b, x, y + h - 5, w, 5, o.baseC || shade(fr, 0.15));
  }

  // ---------- 가게 앞모습 ----------
  // x0: 가게 왼쪽 끝(px), w: 너비(px). 땅 = G
  const SHOP = {};
  SHOP.jumak = (x0, w) => { // 사진처럼: 베이지 석재 벽 · 노란 빛나는 간판 · 브론즈 프레임 통유리 · 흰 접이식 의자 · 입간판
    wall(x0, 0, w, G, 'stone', '#e4dac6');
    // 2층 큰 창 (어두운 유리)
    for (const [wx, ww] of [[x0 + 14, 30], [x0 + w - 44, 30]]) { R(b, wx - 1.5, 30, ww + 3, 34, '#c9bfa9'); R(b, wx, 31.5, ww, 31, '#2e333a'); R(b, wx + ww / 2 - 0.6, 31.5, 1.2, 31, '#1f2328'); R(b, wx + 2, 33, 5, 27, 'rgba(255,255,255,.08)'); R(e, wx, 31.5, ww, 31, r() < 0.5 ? '#ffd88a' : 'rgba(0,0,0,0)'); }
    roofline(x0, 6, w, '#d6ccb6');
    // 간판 상자: 노랑 · 테두리 · 글자 · 개구리 마스코트
    const sx = x0 + 8, sy = G - 106, sw = w - 16, sh = 31;
    R(b, sx - 1.5, sy - 1.5, sw + 3, sh + 3, '#4a3a28');
    const grd = b.createLinearGradient(sx, sy, sx, sy + sh); grd.addColorStop(0, '#ffd23a'); grd.addColorStop(0.5, '#ffe27a'); grd.addColorStop(1, '#f7b81c'); R(b, sx, sy, sw, sh, grd);
    const grE = e.createRadialGradient(sx + sw / 2, sy + sh / 2, 4, sx + sw / 2, sy + sh / 2, sw / 1.6); grE.addColorStop(0, '#fff3b0'); grE.addColorStop(1, '#ffc21c'); R(e, sx, sy, sw, sh, grE);
    for (const g of [b, e]) {
      text(g, '달 빛 주 막', sx + sw * 0.42, sy + sh / 2 + 1, 13.5, '#6b3a10', { w: 900 });
      text(g, '고추튀김 맛있는 한식주점', sx + 4, sy + 6, 3.4, '#6b3a10', { align: 'left', w: 700 });
      text(g, '비 오는 날엔 전', sx + sw - 4, sy + 6, 3.4, '#6b3a10', { align: 'right', w: 700 });
      text(g, '윤슬점', sx + sw - 4, sy + sh - 6, 3.6, '#6b3a10', { align: 'right', w: 700 });
      text(g, '가맹문의', sx + 4, sy + sh - 5, 3, '#6b3a10', { align: 'left', w: 600 });
      // 개구리 (모자 쓰고 막걸리 잔) — 갈색 선
      const fx = sx + sw * 0.72, fy = sy + sh / 2 + 2;
      g.strokeStyle = '#6b3a10'; g.lineWidth = 1; g.beginPath(); g.ellipse(fx, fy + 3, 4.5, 5.5, 0, 0, 7); g.stroke();
      g.beginPath(); g.arc(fx - 1.8, fy - 2.6, 1.4, 0, 7); g.stroke(); g.beginPath(); g.arc(fx + 1.8, fy - 2.6, 1.4, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(fx - 4, fy - 4); g.lineTo(fx + 1, fy - 12); g.lineTo(fx + 5, fy - 3.5); g.stroke(); // 고깔 모자
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(fx - 2.6 + k * 1.6, fy - 6 - k * 1.8); g.lineTo(fx + 3.8 - k * 0.4, fy - 5 - k * 1.8); g.stroke(); }
      g.beginPath(); g.moveTo(fx - 2, fy + 1); g.quadraticCurveTo(fx, fy + 2.5, fx + 2, fy + 1); g.stroke();
      g.beginPath(); g.moveTo(fx + 4, fy + 2); g.lineTo(fx + 7, fy); g.lineTo(fx + 7, fy + 5); g.stroke(); // 잔
    }
    // 간판 아래 환기창 줄 (어두운 루버)
    const ty = G - 72;
    R(b, x0 + 6, ty, w - 12, 11, '#3b3128');
    for (let i = 0; i < 6; i++) { const px = x0 + 8 + i * (w - 16) / 6, pw = (w - 16) / 6 - 2; if (i % 3 === 1) { for (let k = 0; k < 5; k++) R(b, px, ty + 1.5 + k * 1.8, pw, 1, '#5a4d40'); } else { R(b, px, ty + 1.5, pw, 8, '#c9d1d6'); R(b, px + 1, ty + 2.5, pw * 0.3, 6, '#e8eef0'); R(e, px, ty + 1.5, pw, 8, '#ffe0a0'); } }
    // 차양 빔
    R(b, x0 + 2, G - 61, w - 4, 3.2, '#2f2822'); R(b, x0 + 2, G - 58, w - 4, 0.8, '#1d1814');
    // 통유리 (브론즈 프레임) + 따뜻한 실내
    const gy = G - 57, gh = 57, cols = [x0 + 6, x0 + 6 + (w - 12) * 0.24, x0 + 6 + (w - 12) * 0.5, x0 + 6 + (w - 12) * 0.75, x0 + w - 6];
    R(b, x0 + 6, gy, w - 12, gh, '#5a3f26');
    for (let i = 0; i < 4; i++) {
      const px = cols[i] + 1.4, pw = cols[i + 1] - cols[i] - 2.8;
      const ins = b.createLinearGradient(0, gy, 0, G); ins.addColorStop(0, '#f2cf96'); ins.addColorStop(1, '#c98a4a'); R(b, px, gy + 1.5, pw, gh - 3, ins);
      // 펜던트 조명
      for (let k = 0; k < 2; k++) { const lx = px + pw * (0.3 + k * 0.4); R(b, lx - 0.3, gy + 1.5, 0.6, 7, '#3a2a22'); ell(b, lx, gy + 10, 3, 1.8, '#3a2a22'); ell(e, lx, gy + 11.5, 2.4, 1.2, '#fff6d0'); }
      R(b, px, gy + gh * 0.42, pw, 1.4, '#5a3f26'); // 가로 창살
      if (i === 0) { // 왼쪽: 개구리 커팅 스티커 + 메뉴 포스터
        ell(b, px + pw * 0.45, gy + 40, 8, 6, '#f2a531'); ell(b, px + pw * 0.3, gy + 34, 3, 3, '#f2a531'); ell(b, px + pw * 0.62, gy + 34, 3, 3, '#f2a531'); circ(b, px + pw * 0.3, gy + 33.5, 1, '#3a2a22'); circ(b, px + pw * 0.62, gy + 33.5, 1, '#3a2a22'); R(b, px + pw * 0.35, gy + 42, pw * 0.2, 1, '#c0392b');
        R(b, px + 2, gy + 14, 9, 12, '#fff7e0'); R(b, px + 3, gy + 15, 7, 3, '#c0392b'); for (let k = 0; k < 3; k++) R(b, px + 3, gy + 19.5 + k * 2, 7, 0.8, '#777');
        R(b, px + pw - 9, gy + 3, 7, 9, '#2f6fb3'); R(b, px + pw - 8, gy + 4, 5, 3, '#ffffff');
      }
      if (i === 1) { // 가운데 왼쪽: 문 (PUSH) + 메뉴 라이트보드
        R(b, px + 1, gy + 4, pw - 2, gh - 6, 'rgba(255,240,210,.35)'); R(b, px + pw - 5, gy + 30, 1.2, 8, '#c9a227'); text(b, 'PUSH', px + pw / 2, gy + 26, 2.8, '#5a3f26');
        R(b, px + pw * 0.2, gy + 36, 14, 10, '#fffdf6'); R(e, px + pw * 0.2, gy + 36, 14, 10, '#ffffff'); for (let k = 0; k < 4; k++) R(b, px + pw * 0.2 + 2, gy + 38 + k * 2, 10, 0.8, k % 2 ? '#c0392b' : '#333'); R(b, px + pw * 0.2 + 6, gy + 46, 1, 9, '#333');
      }
      if (i === 2) { // 가운데 오른쪽: TV (야구 중계) · 메뉴판 사진
        R(b, px + 3, gy + 14, 14, 9, '#1d1f24'); R(b, px + 4, gy + 15, 12, 7, '#3f8f45'); R(e, px + 4, gy + 15, 12, 7, '#5fd06a'); R(b, px + 9, gy + 18, 1, 1, '#fff');
        for (let k = 0; k < 3; k++) { R(b, px + 2 + k * 7, gy + 28, 6, 8, ['#d35400', '#f2c94c', '#e8a33d'][k]); }
      }
      if (i === 3) { // 오른쪽: 사람 실루엣 · 포스터
        R(b, px + 3, gy + 6, 8, 14, '#2a2420'); R(b, px + 4, gy + 7, 6, 4, '#e8343a');
        ell(b, px + pw * 0.6, gy + 36, 3, 3, '#5a4030'); R(b, px + pw * 0.6 - 3.5, gy + 39, 7, 10, '#5a4030');
      }
      lit(px, gy + 1.5, pw, gh - 3, 'rgba(255,190,90,.25)');
      for (let k = 0; k < 2; k++) ell(e, px + pw * (0.3 + k * 0.4), gy + 11.5, 2.4, 1.2, '#fff6d0');
      R(b, px + 1, gy + 2, pw * 0.16, gh - 5, 'rgba(255,255,255,.22)');
    }
    R(b, x0 + 6, G - 3, w - 12, 3, '#3b2c1e');
    // 흰 접이식 의자 3개 (왼쪽 앞)
    for (let k = 0; k < 3; k++) { const cx = x0 + 10 + k * 9; R(b, cx, G - 9, 7, 1.6, '#f4f4f0'); R(b, cx + 0.6, G - 7.6, 1, 7.6, '#dcdcd6'); R(b, cx + 5.4, G - 7.6, 1, 7.6, '#dcdcd6'); R(b, cx + 1.2, G - 4, 4.6, 0.8, '#dcdcd6'); }
    // A자 입간판 2개 (고추튀김 · 육전)
    for (const [ax, c, label, food] of [[x0 + w * 0.45, '#c0392b', '고추튀김', '#e8a33d'], [x0 + w * 0.45 + 13, '#a32c22', '육 전', '#f2c94c']]) {
      b.fillStyle = '#2b2b2b'; b.beginPath(); b.moveTo(ax, G); b.lineTo(ax + 3, G - 22); b.lineTo(ax + 9, G - 22); b.lineTo(ax + 12, G); b.closePath(); b.fill();
      R(b, ax + 2.2, G - 21, 7.6, 19, c); ell(b, ax + 6, G - 9, 3, 2.4, food); ell(b, ax + 5, G - 10, 1.2, 2.8, '#c0601c');
      text(b, label, ax + 6, G - 17.5, 2.6, '#fff3d6', { max: 7 });
    }
    // 오른쪽 세움 배너 (베스트메뉴 · Highball)
    for (const [bx, bg, t1, acc] of [[x0 + w - 24, '#f6efe2', '베스트메뉴', '#d35400'], [x0 + w - 12, '#1d1d22', 'Highball', '#f2a531']]) {
      R(b, bx, G - 44, 10, 41, bg); R(b, bx, G - 3, 10, 3, '#333'); text(b, t1, bx + 5, G - 40, 2.5, bg === '#1d1d22' ? '#fff' : '#333', { max: 9 });
      ell(b, bx + 5, G - 28, 3.5, 3, acc); ell(b, bx + 5, G - 16, 3, 2.6, bg === '#1d1d22' ? '#e8343a' : '#c0392b'); R(b, bx + 2, G - 9, 6, 1, '#888');
    }
    // 처마 끝 전구 줄 (밤에 반짝)
    for (let i = 0, xx = x0 + 6; xx < x0 + w - 6; xx += 5, i++) { const yy = G - 60 + Math.sin(i * 0.9) * 1.2; circ(b, xx, yy, 0.9, '#f4e2b0'); circ(e, xx, yy, 1.2, ['#ffe27a', '#ffb347', '#ff8fab'][i % 3]); }
    return { glow: [[x0 + w / 2, G - 90, 70, '255,210,90'], [x0 + w / 2, G - 30, 60, '255,190,110']] };
  };
  // 공통 가게 틀: 위층 + 간판 + 1층 유리
  function genericShop(x0, w, o) {
    const floors = o.floors ?? 2, fh = 30, top = G - 64 - floors * fh;
    if (o.sky) R(b, x0, 0, w, top, 'rgba(0,0,0,0)');
    wall(x0, top, w, G - top, o.wallKind || 'tile', o.wall);
    roofline(x0, top, w, o.roof || '#cfc8bc');
    // 옥상 소품
    if (o.rooftop !== false) { if (r() < 0.6) tank(x0 + 4 + r() * (w - 16), top - 2); for (let i = 0; i < 2 + Math.floor(r() * 3); i++) pot(x0 + 8 + r() * (w - 16), top - 1, Math.floor(r() * 4), 1.1); }
    // 위층 창 · 에어컨 · 빨래 · 화분
    for (let f = 0; f < floors; f++) {
      const fy = top + 7 + f * fh, n = Math.max(1, Math.floor((w - 8) / 26));
      for (let i = 0; i < n; i++) {
        const wx = x0 + 6 + i * ((w - 12) / n) + 2, ww = (w - 12) / n - 8;
        win(wx, fy, ww, 15, { frame: o.winFrame || '#6a6e74', glass: o.glass || '#86a3b5', curtain: r() < 0.4 ? ['#f4e6d0', '#ffd1dc', '#d8e8f4'][Math.floor(r() * 3)] : null, bars: o.bars && r() < 0.6 });
        if (r() < 0.45) acUnit(wx + ww + 0.5, fy + 9);
        if (r() < 0.35) laundry(wx, fy + 17.5, ww);
        else if (r() < 0.5) for (let k = 0; k < 3; k++) pot(wx + 3 + k * (ww - 6) / 2, fy + 19, Math.floor(r() * 4), 0.7);
      }
      R(b, x0, fy + 21, w, 1.5, shade(o.wall, -0.15)); // 층 띠
    }
    // 간판
    const sy = G - 62, sh = 15;
    R(b, x0 + 2, sy - 1, w - 4, sh + 2, shade(o.sign, -0.35));
    RB(x0 + 3, sy, w - 6, sh, o.sign, true);
    TB(o.name, x0 + w / 2 + (o.sub ? -2 : 0), sy + sh / 2 + 0.5, o.size || 8, o.ink, { glow: true, max: w - 14, w: 900 });
    if (o.sub) TB(o.sub, x0 + w - 5, sy + sh - 3, 2.6, o.ink, { align: 'right', glow: true, max: w * 0.5 });
    // 차양
    if (o.awning) awningStripe(x0 + 2, sy + sh + 1, w - 4, 4, o.awning[0], o.awning[1]);
    // 1층 유리
    const gy = sy + sh + (o.awning ? 7 : 2);
    storefront(x0 + 3, gy, w - 6, G - gy, { frame: o.frame || '#3a3d42', inside: o.inside, lit: o.lit, draw: o.inner, base: true, baseC: o.baseC, panes: o.panes });
    // 문
    if (o.door !== false) { const dx = x0 + (o.doorAt ?? 0.5) * w - 6; R(b, dx, gy + 4, 12, G - gy - 4, o.doorC || '#2f3338'); R(b, dx + 1, gy + 5, 10, G - gy - 6, o.inside ? shade(o.inside, -0.1) : '#d9e4ea'); lit(dx + 1, gy + 5, 10, G - gy - 6); R(b, dx + 8.5, gy + 18, 0.8, 6, '#c9c9c9'); }
    // 벽 소품: 계량기 · 세로 간판
    if (r() < 0.6) meter(x0 + 1, gy + 6);
    if (o.vsign) vsign(x0 + w - 7, top + 6, 6, 26, o.vsign[0], o.vsign[1], o.vsign[2]);
    return { glow: [[x0 + w / 2, sy + sh / 2, w * 0.55, o.glowC || '255,235,180'], [x0 + w / 2, gy + 20, w * 0.5, '255,220,150']] };
  }
  // =====================================================================
  // 가게마다 다른 분위기 (픽셀 글씨 간판 · 재질 · 옥상 · 가게 앞 소품)
  // =====================================================================
  const PFONT = (size) => (size >= 11 ? 'Galmuri11' : size >= 9 ? 'Galmuri9' : 'Galmuri7');
  function ptext(g, s, x, y, size, c, o = {}) { // 픽셀 글씨 (갈무리), 그림자·외곽선 선택
    g.save(); g.font = `${o.bold ? 'bold ' : ''}${size}px ${PFONT(size)}, ${FONT}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    const X = Math.round(x), Y = Math.round(y);
    if (o.max) { const m = g.measureText(s).width; if (m > o.max) { g.translate(X, Y); g.scale(o.max / m, 1); g.translate(-X, -Y); } }
    if (o.shadow) { g.fillStyle = o.shadow; g.fillText(s, X + 1, Y + 1); }
    if (o.outline) { g.fillStyle = o.outline; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.fillText(s, X + dx, Y + dy); }
    g.fillStyle = c; g.fillText(s, X, Y); g.restore();
  }
  const PT = (s, x, y, size, c, o = {}) => { ptext(b, s, x, y, size, c, o); if (o.glow) ptext(e, s, x, y, size, o.glow === true ? c : o.glow, { ...o, shadow: null, outline: o.glowOutline || null }); };
  // 건물 몸통: 벽 + 옥상 난간
  function body(x0, w, top, kind, c, o = {}) { wall(x0, top, w, G - top, kind, c); R(b, x0 - 1, top - 3, w + 2, 3, o.cap || shade(c, -0.08)); R(b, x0 - 1, top, w + 2, 1, shade(c, -0.25)); }
  // 옥상 정원: 큰 잎 · 풀 · 꽃 화분 + (밤) 전구 줄
  function bigLeaf(x, y, s, c) { ell(b, x, y, 4 * s, 2.4 * s, c); R(b, x - 3.5 * s, y - 0.2, 7 * s, 0.5, shade(c, 0.25)); for (let i = -2; i <= 2; i++) R(b, x + i * 1.4 * s, y - 1.6 * s, 0.4, 1.4 * s, shade(c, 0.2)); }
  function rooftopGarden(x0, w, top, o = {}) {
    for (let i = 0; i < Math.floor(w / 9); i++) { const px = x0 + 5 + i * 9 + r() * 3; pot(px, top - 3, Math.floor(r() * 4), 1.2 + r() * 0.5); }
    if (o.big !== false) for (let i = 0; i < 2; i++) { const bx = x0 + (i ? w - 12 : 10); R(b, bx - 4, top - 9, 8, 6, '#7a5a3c'); for (let k = 0; k < 6; k++) bigLeaf(bx + (r() - 0.5) * 12, top - 12 - r() * 12, 1 + r() * 0.5, ['#3f8f45', '#2e6b33', '#5fae4e'][k % 3]); }
    if (o.lights) { b.strokeStyle = '#4a3a2a'; b.lineWidth = 0.4; b.beginPath(); for (let xx = x0; xx <= x0 + w; xx += 2) { const yy = top + 4 + Math.abs(Math.sin((xx - x0) / w * Math.PI * 2)) * 6; if (xx === x0) b.moveTo(xx, yy); else b.lineTo(xx, yy); } b.stroke(); for (let xx = x0 + 3, i = 0; xx < x0 + w; xx += 6, i++) { const yy = top + 4 + Math.abs(Math.sin((xx - x0) / w * Math.PI * 2)) * 6; circ(b, xx, yy + 1, 0.9, '#e8d9a0'); circ(e, xx, yy + 1, 1.4, ['#ffe27a', '#ffc94a', '#fff3c4'][i % 3]); } }
  }
  function balcony(x, y, w, plants = true) { R(b, x - 1, y, w + 2, 1.2, '#5b5f66'); for (let k = 0; k <= w; k += 2.2) R(b, x + k, y, 0.6, 7, '#5b5f66'); R(b, x - 1, y + 7, w + 2, 1, '#5b5f66'); if (plants) for (let k = 3; k < w - 2; k += 5 + r() * 3) { pot(x + k, y, Math.floor(r() * 4), 0.8); if (r() < 0.5) for (let j = 0; j < 4; j++) R(b, x + k - 1 + j * 0.6, y + 7, 0.6, 3 + r() * 6, '#4f9a45'); } }
  function shutterBox(x, y, w) { R(b, x, y, w, 5, '#c9ccd0'); R(b, x, y + 4, w, 1, '#8e9399'); for (let k = 1; k < 4; k++) R(b, x, y + k, w, 0.3, '#b3b7bc'); }
  function blade(x, y, w, h, bg, s, fg, o = {}) { R(b, x - 2, y + 2, 2, 1, '#555'); R(b, x - 2, y + h - 3, 2, 1, '#555'); RB(x, y, w, h, bg, true); R(b, x, y, w, 1, shade(bg, -0.3)); R(b, x, y + h - 1, w, 1, shade(bg, -0.3)); [...s].forEach((ch, i) => PT(ch, x + w / 2, y + 5 + i * ((h - 10) / Math.max(1, s.length - 1)), 7, fg, { glow: true })); }
  function plate(x, y, s, bg = '#3f74cc') { R(b, x, y, 7, 4, bg); ptext(b, s, x + 3.5, y + 2, 7, '#fff'); }
  function lantern(x, y, c = '#e8343a', s = 1) { R(b, x - 0.3, y - 4, 0.6, 4, '#333'); ell(b, x, y + 3 * s, 2.8 * s, 3.6 * s, c); ell(e, x, y + 3 * s, 2.8 * s, 3.6 * s, shade(c, 0.25)); R(b, x - 2 * s, y - 0.3, 4 * s, 1, '#3a2a22'); R(b, x - 2 * s, y + 6.2 * s, 4 * s, 1, '#3a2a22'); R(b, x - 0.3, y + 7 * s, 0.6, 2.5, '#f2c230'); for (let k = -1; k <= 1; k++) R(b, x + k * 1.4 * s, y + 0.8, 0.3, 4.4 * s, shade(c, -0.25)); }
  function scallopAwning(x, y, w, h, c1, c2, txt, ink) { awningStripe(x, y, w, h, c1, c2); if (txt) { R(b, x + w * 0.15, y + 1, w * 0.7, h - 1, c1); PT(txt, x + w / 2, y + h / 2 + 0.5, 7, ink, { glow: false }); } }
  function hangPot(x, y, len = 6) { R(b, x - 0.2, y, 0.4, len, '#555'); R(b, x - 2.5, y + len, 5, 3, '#c0622f'); for (let k = 0; k < 5; k++) R(b, x - 2.5 + k * 1.2, y + len + 2, 0.7, 3 + r() * 6, ['#3f8f45', '#5fae4e', '#2e6b33'][k % 3]); }
  function pipe(x, y0, y1, c = '#9aa0a6') { R(b, x, y0, 1.6, y1 - y0, c); R(b, x + 1, y0, 0.4, y1 - y0, shade(c, 0.2)); for (let y = y0 + 10; y < y1; y += 18) R(b, x - 0.5, y, 2.6, 1, shade(c, -0.25)); }
  function cables(x0, w, y) { b.strokeStyle = 'rgba(30,30,35,.85)'; b.lineWidth = 0.4; for (let k = 0; k < 3; k++) { b.beginPath(); b.moveTo(x0, y + k * 2); b.quadraticCurveTo(x0 + w / 2, y + k * 2 + 4, x0 + w, y + k * 2 + 1); b.stroke(); } }
  function aframe(x, bg, line1, line2, ink = '#fff') { b.fillStyle = '#2b2b2b'; b.beginPath(); b.moveTo(x, G); b.lineTo(x + 2.5, G - 19); b.lineTo(x + 9.5, G - 19); b.lineTo(x + 12, G); b.closePath(); b.fill(); R(b, x + 2.2, G - 18, 7.6, 16, bg); ptext(b, line1, x + 6, G - 14, 7, ink, { max: 7.4 }); if (line2) ptext(b, line2, x + 6, G - 7, 7, ink, { max: 7.4 }); }

  SHOP.olive = (x0, w) => { // 깔끔한 흰 건물 · 초록 입체 글씨 · 분홍 세로 간판
    const top = G - 152; body(x0, w, top, 'panel', '#f4f6f7', { cap: '#e3e7ea' });
    R(b, x0 + 2, top - 10, w - 4, 7, 'rgba(180,215,230,.55)'); R(b, x0 + 2, top - 10, w - 4, 0.8, '#9aa3ad'); pot(x0 + 10, top - 3, 3, 1.1); pot(x0 + w - 10, top - 3, 1, 1.1);
    for (let f = 0; f < 2; f++) { const fy = top + 8 + f * 34; R(b, x0 + 4, fy, w - 8, 24, '#5d7f93'); for (let k = 0; k <= 4; k++) R(b, x0 + 4 + k * (w - 8) / 4, fy, 1, 24, '#e3e7ea'); R(b, x0 + 6, fy + 2, (w - 8) / 4 - 4, 20, 'rgba(255,255,255,.15)'); if (f === 0) { for (let k = 0; k < 3; k++) R(b, x0 + 8 + k * 25, fy + 16, 14, 8, '#e9eef0'); } lit(x0 + 4, fy, w - 8, 24, f === 0 ? 'rgba(220,240,255,.35)' : 'rgba(255,220,150,.25)'); }
    // 간판: 흰 판 위 초록 입체 글씨
    const sy = G - 64; R(b, x0 + 2, sy, w - 4, 16, '#ffffff'); R(b, x0 + 2, sy + 15, w - 4, 1, '#cfd6db'); R(e, x0 + 2, sy, w - 4, 16, 'rgba(255,255,255,.35)');
    PT('올리브샵', x0 + w / 2, sy + 8, 11, '#8cc63f', { shadow: '#4e7d1e', glow: '#b6ff5a' });
    blade(x0 + w - 8, top + 74, 6, 28, '#ff6fa8', 'OLIVE', '#fff');
    storefront(x0 + 3, G - 46, w - 6, 46, { frame: '#d9dee2', inside: '#fbf7f2', tint: 'rgba(255,250,240,.2)', base: true, baseC: '#e3e7ea', panes: 3, draw: (x, y, w2, h, i) => {
      for (let k = 0; k < 4; k++) { R(b, x, y + 9 + k * 8, w2, 0.8, '#d9d4ca'); for (let j = 0; j < Math.floor(w2 / 2.6); j++) R(b, x + 0.6 + j * 2.6, y + 5.5 + k * 8, 1.6, 3.4, ['#ff8fab', '#ffd23a', '#7fd3c6', '#c39cff', '#ff6b5a', '#ffffff'][(j + k * 2) % 6]); }
      if (i === 1) { R(b, x + 3, y + 3, w2 - 6, 20, '#ffe3ec'); ell(b, x + w2 / 2, y + 10, 4, 5, '#ffd9c4'); R(b, x + w2 / 2 - 5, y + 4, 10, 4, '#5a3a30'); PT('SALE', x + w2 / 2, y + 19, 7, '#ff4f87'); }
    } });
    aframe(x0 + 4, '#ff6fa8', '1+1', '세일');
    return { glow: [[x0 + w / 2, sy + 8, 50, '170,255,120'], [x0 + w / 2, G - 24, 46, '255,250,235']] };
  };
  SHOP.freshmart = (x0, w) => { // 낡은 타일 건물 · 파란 라이트박스 · 초록 줄무늬 차양 · 과일 상자
    const top = G - 142; body(x0, w, top, 'tile', '#efe6d4');
    rooftopGarden(x0, w, top, { lights: true });
    for (let f = 0; f < 2; f++) { const fy = top + 8 + f * 32; for (let i = 0; i < 3; i++) { const wx = x0 + 8 + i * ((w - 16) / 3), ww = (w - 16) / 3 - 8; win(wx, fy, ww, 15, { frame: '#7a6a58', glass: '#86a3b5', curtain: r() < 0.5 ? '#ffd1dc' : null, bars: f === 0 }); if (i === 1 && f === 1) acUnit(wx + ww + 1, fy + 6); } balcony(x0 + 6, fy + 18, w - 12, f === 1); }
    pipe(x0 + 2, top, G - 40);
    const sy = G - 74; R(b, x0 + 3, sy - 1, w - 6, 18, '#0a5f99'); RB(x0 + 4, sy, w - 8, 16, '#0b7ac2', true);
    ell(b, x0 + 13, sy + 8, 5, 5, '#ffffff'); ell(b, x0 + 13, sy + 8, 3.8, 3.8, '#2e9e5b'); R(b, x0 + 12.5, sy + 4, 1, 8, '#ffffff'); lit(x0 + 8, sy + 3, 10, 10, 'rgba(255,255,255,.15)');
    PT('FRESH MART', x0 + w / 2 + 6, sy + 7.5, 11, '#ffffff', { glow: true, max: w - 30, shadow: '#064a78' });
    scallopAwning(x0 + 2, sy + 17, w - 4, 6, '#2e9e5b', '#f4f4f0', '신선한 채소·과일', '#ffffff');
    storefront(x0 + 3, G - 50, w - 6, 50, { frame: '#3a3d42', inside: '#f4f8f2', tint: 'rgba(240,255,230,.2)', base: true, panes: 4, draw: (x, y, w2, h) => { for (let k = 0; k < 3; k++) { for (let i = 0; i < Math.floor(w2 / 3.2); i++) circ(b, x + 1.8 + i * 3.2, y + 12 + k * 9, 1.4, ['#e8343a', '#f2c94c', '#5fae4e', '#f08a2b', '#7d5bd6'][(i * 3 + k) % 5]); R(b, x, y + 14 + k * 9, w2, 1.2, '#7a5a3c'); } R(b, x + 2, y + 2, w2 - 4, 5, '#ffde59'); ptext(b, '특가', x + w2 / 2, y + 4.5, 7, '#c0392b'); } });
    for (let i = 0; i < 5; i++) { const cx = x0 + 4 + i * 11; R(b, cx, G - 11, 10, 8, '#8a5a34'); R(b, cx, G - 11, 10, 1, '#a87452'); for (let k = 0; k < 6; k++) circ(b, cx + 1.6 + (k % 3) * 3.4, G - 12 - Math.floor(k / 3) * 2.4, 1.6, ['#5fae4e', '#e8343a', '#f2c94c', '#f08a2b', '#7d5bd6'][i]); R(b, cx + 2, G - 17, 6, 4, '#ffde59'); ptext(b, ['990', '2천', '1+1', '세일', '특가'][i], cx + 5, G - 15, 7, '#c0392b', { max: 5.6 }); R(b, cx + 1, G - 3, 1, 3, '#5a3a22'); R(b, cx + 8, G - 3, 1, 3, '#5a3a22'); }
    return { glow: [[x0 + w / 2, sy + 8, 60, '120,200,255'], [x0 + w / 2, G - 25, 50, '240,255,230']] };
  };
  SHOP.sunny = (x0, w) => { // 회색 모자이크 타일 3층 · 분홍 네온 간판 · 매물 전단 가득
    const top = G - 166; body(x0, w, top, 'tile', '#aab4bd');
    tank(x0 + w - 18, top - 3); pot(x0 + 8, top - 3, 1, 1.2); R(b, x0 + 20, top - 14, 1, 12, '#666'); R(b, x0 + 16, top - 14, 9, 1, '#666'); // 안테나
    for (let f = 0; f < 3; f++) { const fy = top + 8 + f * 32; for (let i = 0; i < 3; i++) { const wx = x0 + 8 + i * ((w - 16) / 3), ww = (w - 16) / 3 - 10; win(wx, fy, ww, 16, { frame: '#5b6168', glass: '#7f97a8', curtain: r() < 0.4 ? '#f4e6d0' : null }); for (let k = 0; k < 6; k++) R(b, wx, fy + 1 + k * 2.6, ww, 0.6, 'rgba(255,255,255,.35)'); if (r() < 0.6) acUnit(wx + ww + 1, fy + 8); } }
    cables(x0, w, top + 100);
    shutterBox(x0 + 3, G - 72, w - 6);
    const sy = G - 66; R(b, x0 + 3, sy, w - 6, 16, '#3a1830'); R(e, x0 + 3, sy, w - 6, 16, '#2a0f22');
    b.strokeStyle = '#ff9ccb'; b.lineWidth = 0.8; b.strokeRect(x0 + 5, sy + 2, w - 10, 12); e.strokeStyle = '#ff5fae'; e.lineWidth = 1.4; e.strokeRect(x0 + 5, sy + 2, w - 10, 12);
    PT('햇살부동산', x0 + w / 2 - 14, sy + 8, 11, '#ffd1e8', { glow: '#ff8ac6', glowOutline: '#ff2f8f' });
    PT('오피스텔·상가', x0 + w - 24, sy + 8, 7, '#ffffff', { glow: true, max: 34 });
    blade(x0 + 1, top + 50, 7, 40, '#e8343a', '부동산', '#fff');
    storefront(x0 + 3, G - 50, w - 6, 50, { frame: '#2f3338', inside: '#eef2f5', base: true, panes: 4, draw: (x, y, w2) => { for (let k = 0; k < 4; k++) for (let i = 0; i < Math.floor(w2 / 6); i++) { R(b, x + 1 + i * 6, y + 3 + k * 10, 5, 8, '#ffffff'); R(b, x + 1.5 + i * 6, y + 4 + k * 10, 4, 1.6, ['#e8336d', '#2f6fb3', '#2e9e5b'][(i + k) % 3]); R(b, x + 1.5 + i * 6, y + 7 + k * 10, 4, 0.5, '#999'); R(b, x + 1.5 + i * 6, y + 8.5 + k * 10, 3, 0.5, '#999'); } R(b, x + w2 - 9, y + 2, 8, 6, '#e8343a'); ptext(b, '급매', x + w2 - 5, y + 5, 7, '#fff'); } });
    return { glow: [[x0 + w / 2, sy + 8, 70, '255,90,170'], [x0 + w / 2, G - 25, 50, '235,245,255']] };
  };
  SHOP.peach = (x0, w) => { // 짙은 원목 · 검은 옻칠 간판 금박 글씨 · 홍등 · 남색 포렴 · 숯
    const top = G - 140; body(x0, w, top, 'brick', '#9a5a44');
    for (let f = 0; f < 2; f++) { const fy = top + 10 + f * 32; for (let i = 0; i < 3; i++) { const wx = x0 + 10 + i * ((w - 20) / 3), ww = (w - 20) / 3 - 10; win(wx, fy, ww, 15, { frame: '#3a2a22', glass: '#6f8796', curtain: r() < 0.5 ? '#f4e6d0' : null }); } }
    pipe(x0 + w - 6, top - 10, G - 66, '#b0b4b8'); R(b, x0 + w - 9, top - 14, 8, 5, '#8e9399'); // 연기 배출구
    roofline(x0, top, w, '#5a3a2a');
    wall(x0, G - 72, w, 72, 'wood', '#3a2418');
    const sy = G - 70; R(b, x0 + 6, sy - 1, w - 12, 20, '#c9a227'); R(b, x0 + 7, sy, w - 14, 18, '#141414'); R(e, x0 + 7, sy, w - 14, 18, '#1a1408');
    PT('도  화', x0 + w / 2 - 6, sy + 7, 11, '#e9c766', { glow: '#ffd977', shadow: '#5a4410' });
    R(b, x0 + w / 2 + 18, sy + 4, 10, 10, '#c0392b'); R(e, x0 + w / 2 + 18, sy + 4, 10, 10, '#e04a3a'); text(b, '韓牛', x0 + w / 2 + 23, sy + 9, 4, '#fff1d6', { max: 9 }); text(e, '韓牛', x0 + w / 2 + 23, sy + 9, 4, '#fff6e0', { max: 9 });
    PT('1++ 한우 로스구이', x0 + w / 2 - 6, sy + 15, 7, '#e9c766', { glow: true });
    for (const lx of [x0 + 4, x0 + w - 4, x0 + w / 2 - 22, x0 + w / 2 + 22]) lantern(lx, G - 50, '#e8343a', 1);
    storefront(x0 + 6, G - 42, w - 12, 42, { frame: '#2a1a10', inside: '#d9a26a', tint: 'rgba(255,170,90,.28)', base: true, baseC: '#2a1a10', panes: 4, draw: (x, y, w2, h) => { R(b, x + 2, y + h - 14, w2 - 4, 2, '#3a2a22'); circ(b, x + w2 / 2, y + h - 15, 2.2, '#444'); circ(e, x + w2 / 2, y + h - 15, 1.6, '#ff6b3a'); R(b, x + w2 / 2 - 1, y + 2, 2, h - 20, '#9aa3ad'); ell(b, x + w2 / 2, y + h - 19, 3.6, 1.2, '#7d8790'); for (let k = 0; k < 3; k++) circ(b, x + w2 / 2 - 2 + k * 2, y + h - 22 - k * 3, 1 + k * 0.4, 'rgba(240,240,240,.35)'); } });
    const dx = x0 + w / 2 - 7; R(b, dx, G - 42, 14, 14, '#24324f'); R(b, dx + 6.6, G - 42, 0.8, 14, '#141c2e'); PT('한', dx + 3.5, G - 35, 7, '#f6efe0'); PT('우', dx + 10.5, G - 35, 7, '#f6efe0'); // 포렴
    for (let i = 0; i < 3; i++) { R(b, x0 + 4 + i * 5, G - 8, 4, 8, '#2b2b2b'); R(b, x0 + 4 + i * 5, G - 9, 4, 1.4, '#555'); } // 숯 포대
    R(b, x0 + w - 22, G - 7, 18, 2, '#6b4a35'); R(b, x0 + w - 21, G - 5, 1, 5, '#4a3020'); R(b, x0 + w - 6, G - 5, 1, 5, '#4a3020'); // 대기 의자
    return { glow: [[x0 + w / 2, sy + 9, 60, '255,210,120'], [x0 + w / 2, G - 22, 60, '255,150,80']] };
  };
  SHOP.tuna = (x0, w) => { // 파란 라이트박스 + 참치 그림 · 물결 차양 · 수조 · 스티로폼 박스
    const top = G - 138; body(x0, w, top, 'tile', '#bcc6cf');
    for (let f = 0; f < 2; f++) { const fy = top + 8 + f * 32; for (let i = 0; i < 4; i++) { const wx = x0 + 6 + i * ((w - 12) / 4), ww = (w - 12) / 4 - 8; win(wx, fy, ww, 15, { frame: '#5b6168', glass: '#7f97a8', bars: f === 0 }); } if (f === 1) laundry(x0 + 10, fy + 18, 40); }
    rooftopGarden(x0, w, top, { big: false });
    const sy = G - 76; R(b, x0 + 3, sy - 1, w - 6, 20, '#173d7a'); RB(x0 + 4, sy, w - 8, 18, '#2f5fb3', true);
    const fx = x0 + 16, fy = sy + 9; ell(b, fx, fy, 9, 4, '#c8d4e0'); ell(b, fx - 1, fy + 1.5, 7, 2, '#ffffff'); poly4(b, fx + 8, fy, fx + 13, fy - 4, fx + 13, fy + 4, '#c8d4e0'); circ(b, fx - 6, fy - 1, 0.8, '#1b1b1b'); R(b, fx - 3, fy - 4, 6, 1, '#7d8fa3'); lit(fx - 10, fy - 5, 24, 10, 'rgba(230,240,255,.15)');
    PT('대림참치', x0 + w / 2 + 10, sy + 6.5, 11, '#ffffff', { glow: true, shadow: '#173d7a' });
    PT('오션이츠 · 활어 · 스시', x0 + w / 2 + 10, sy + 14, 7, '#ffd23a', { glow: true });
    for (let xx = x0 + 3, i = 0; xx < x0 + w - 3; xx += 6, i++) { R(b, xx, sy + 19, 6, 3, i % 2 ? '#ffffff' : '#2f5fb3'); circ(b, xx + 3, sy + 22, 3, i % 2 ? '#ffffff' : '#2f5fb3'); } // 물결 차양
    blade(x0 + w - 8, top + 30, 6, 30, '#e8343a', '활어', '#fff');
    storefront(x0 + 3, G - 48, w - 6, 48, { frame: '#1d2a3a', inside: '#2a6fb0', tint: 'rgba(80,170,255,.18)', base: true, panes: 3, draw: (x, y, w2, h) => {
      R(b, x, y, w2, h, '#2f7fc0'); for (let k = 0; k < 5; k++) { const fx2 = x + 3 + r() * (w2 - 8), fy2 = y + 5 + r() * (h - 14), c = ['#f08a5d', '#ffd23a', '#c0c8d0', '#ff6b81', '#7fd3c6'][k]; ell(b, fx2, fy2, 3, 1.4, c); R(b, fx2 + 2.8, fy2 - 1, 1.4, 2, c); }
      for (let k = 0; k < 3; k++) { const px = x + 2 + r() * (w2 - 4); for (let j = 0; j < 7; j++) R(b, px + Math.sin(j) * 0.8, y + h - 3 - j * 2, 0.8, 2, '#3f8f45'); } R(b, x, y + h - 3, w2, 3, '#d9c9a0'); for (let k = 0; k < 6; k++) circ(b, x + r() * w2, y + r() * h, 0.6, 'rgba(255,255,255,.7)'); } });
    for (let i = 0; i < 3; i++) { R(b, x0 + 6 + i * 2, G - 6 - i * 5, 14, 5, '#f4f4f0'); R(b, x0 + 6 + i * 2, G - 6 - i * 5, 14, 0.8, '#d6d6d0'); ptext(b, '참치', x0 + 13 + i * 2, G - 3.5 - i * 5, 7, '#2f5fb3', { max: 10 }); }
    return { glow: [[x0 + w / 2, sy + 9, 70, '90,170,255'], [x0 + w / 2, G - 24, 70, '60,150,255']] };
  };
  SHOP.hanwoo = (x0, w) => { // 퓨전 한식 주점: 초록 간판 노란 픽셀 글씨 · 노란 물결 띠 · 옥상 정원 · 따뜻한 술집 안 · 하이볼 입간판
    const top = G - 128; body(x0, w, top, 'brick', '#d8c7a6');
    rooftopGarden(x0, w, top, { lights: true });
    R(b, x0 + 8, top + 8, w - 16, 26, '#3a3d42'); for (let k = 0; k < 9; k++) R(b, x0 + 10 + k * (w - 20) / 8, top + 8, 1.2, 26, '#5b5f66'); R(b, x0 + 10, top + 12, w - 20, 18, '#4f6b78'); R(e, x0 + 10, top + 12, w - 20, 18, r() < 0.6 ? '#ffd88a' : 'rgba(0,0,0,0)');
    for (const hx of [x0 + 14, x0 + w - 14]) hangPot(hx, top + 34, 5);
    R(b, x0 + 2, G - 76, w - 4, 6, '#e9eef0'); R(b, x0 + 2, G - 71, w - 4, 1, '#b8c1ca');
    const sy = G - 68; R(b, x0 + 2, sy, w - 4, 16, '#1f5a35'); R(b, x0 + 2, sy, w - 4, 1.2, '#3a8a55'); R(e, x0 + 2, sy, w - 4, 16, '#123a22');
    PT('미 광', x0 + 30, sy + 8, 11, '#e9c766', { glow: '#ffd977', shadow: '#0f2e1a' });
    PT('퓨전 한식 주점', x0 + w - 32, sy + 8, 7, '#f4f0d8', { glow: true, max: 50 });
    for (const lx of [x0 + 12, x0 + w - 12]) lantern(lx, sy - 6, '#f2a531', 0.8);
    for (let xx = x0 + 2, i = 0; xx < x0 + w - 2; xx += 4, i++) { R(b, xx, sy + 16, 4, 2, i % 2 ? '#f4f4f0' : '#e9c766'); circ(b, xx + 2, sy + 18, 2, i % 2 ? '#f4f4f0' : '#e9c766'); }
    storefront(x0 + 3, G - 48, w - 6, 48, { frame: '#1f3a28', inside: '#e8b77a', tint: 'rgba(255,190,110,.3)', base: true, baseC: '#1f3a28', panes: 3, draw: (x, y, w2, h, i) => {
      // 따뜻한 술집 안: 펜던트 · 술병 선반 · 테이블과 손님 실루엣
      for (let k = 0; k < 2; k++) { const lx = x + w2 * (0.3 + k * 0.4); R(b, lx - 0.3, y, 0.6, 6, '#3a2a22'); ell(b, lx, y + 7.5, 2.6, 1.6, '#2e5a3a'); ell(e, lx, y + 9, 2, 1, '#fff3c4'); }
      if (i === 1) { R(b, x + 1, y + 12, w2 - 2, 1, '#6b4224'); for (let k = 0; k < Math.floor((w2 - 2) / 3); k++) R(b, x + 2 + k * 3, y + 7.5, 1.6, 4.5, ['#3aa55a', '#f4f4ee', '#c9a227', '#7a3a2a'][k % 4]); R(b, x + 1, y + 20, w2 - 2, 1, '#6b4224'); for (let k = 0; k < Math.floor((w2 - 2) / 3); k++) R(b, x + 2 + k * 3, y + 15.5, 1.6, 4.5, ['#c9a227', '#3aa55a', '#7a3a2a', '#f4f4ee'][k % 4]); }
      R(b, x + 2, y + h - 14, w2 - 4, 2, '#5a3a22'); R(b, x + 4, y + h - 12, 1, 8, '#3a2a22'); R(b, x + w2 - 5, y + h - 12, 1, 8, '#3a2a22');
      ell(b, x + w2 * 0.3, y + h - 16, 2.4, 1.2, '#f2c94c'); ell(b, x + w2 * 0.6, y + h - 16, 2, 1, '#e8a33d'); R(b, x + w2 * 0.75, y + h - 19, 1.4, 3, '#c8e6f0');
      ell(b, x + 6, y + h - 22, 2.6, 2.6, '#4a3a30'); R(b, x + 3.5, y + h - 20, 5, 7, '#4a3a30');
      if (i === 0) { R(b, x + w2 - 9, y + 3, 7, 9, '#fffaf0'); R(b, x + w2 - 8, y + 4, 5, 2, '#c0392b'); for (let k = 0; k < 3; k++) R(b, x + w2 - 8, y + 7 + k * 1.5, 5, 0.6, '#777'); }
    } });
    aframe(x0 + 4, '#1f5a35', '하이볼', '1+1', '#e9c766');
    for (let i = 0; i < 2; i++) { R(b, x0 + w - 18 + i, G - 7 - i * 6, 13, 6, '#2e9e5b'); for (let k = 0; k < 4; k++) R(b, x0 + w - 17 + i + k * 3, G - 6 - i * 6, 2, 4, '#1f7a44'); } // 소주 상자
    for (let i = 0; i < 3; i++) pot(x0 + 24 + i * 8, G, i + 1, 1.1);
    return { glow: [[x0 + w / 2, sy + 8, 60, '255,215,120'], [x0 + w / 2, G - 24, 55, '255,190,110']] };
  };
  SHOP.straw = (x0, w) => { // 고짚: 짚풀 초가 지붕 · 나무 기둥 · 밧줄에 매단 판자 간판 · 종이등 · 옹기
    const top = G - 88;
    wall(x0, top, w, G - top, 'wood', '#c9a77a');
    // 짚 지붕 (두툼한 둥근 지붕 + 짚 결)
    b.fillStyle = '#b8924e'; b.beginPath(); b.moveTo(x0 - 6, top + 6); b.quadraticCurveTo(x0 + w / 2, top - 46, x0 + w + 6, top + 6); b.closePath(); b.fill();
    b.fillStyle = '#d6b26a'; b.beginPath(); b.moveTo(x0 - 2, top + 2); b.quadraticCurveTo(x0 + w / 2, top - 40, x0 + w + 2, top + 2); b.closePath(); b.fill();
    for (let i = 0; i < 160; i++) { const t = r(), xx = x0 - 2 + t * (w + 4), yTop = top + 2 - Math.sin(t * Math.PI) * 21, yy = yTop + r() * (top + 2 - yTop); R(b, xx, yy, 0.5, 2 + r() * 3, r() < 0.5 ? '#a8823e' : '#ecc884'); }
    for (let xx = x0 - 6; xx < x0 + w + 6; xx += 1.5) R(b, xx, top + 4 + r() * 2, 0.6, 3 + r() * 2, '#a8823e'); // 처마 끝 짚 술
    b.strokeStyle = '#6b4a2a'; b.lineWidth = 0.6; for (let k = 1; k < 4; k++) { b.beginPath(); b.moveTo(x0 - 4, top + 4 - k * 0.5); b.quadraticCurveTo(x0 + w / 2, top - 46 + k * 9, x0 + w + 4, top + 4 - k * 0.5); b.stroke(); } // 새끼줄
    for (const px of [x0 + 3, x0 + w - 6]) { R(b, px, top, 3, G - top, '#5a3a22'); R(b, px + 0.6, top, 0.6, G - top, '#7a5236'); }
    // 밧줄에 매단 판자 간판
    const sx = x0 + w / 2 - 26, sy = top + 6; b.strokeStyle = '#8a6a3a'; b.lineWidth = 0.6; b.beginPath(); b.moveTo(sx + 6, sy - 6); b.lineTo(sx + 4, sy); b.moveTo(sx + 46, sy - 6); b.lineTo(sx + 48, sy); b.stroke();
    R(b, sx, sy, 52, 17, '#8a5a34'); for (let k = 0; k < 3; k++) R(b, sx, sy + 5.5 * k, 52, 0.5, '#6b4224'); R(b, sx + 1, sy + 1, 50, 15, '#a8744a');
    PT('고 짚', sx + 26, sy + 8.5, 11, '#3a2010', { shadow: '#d9a874', glow: '#ffe2a0' });
    PT('막걸리 · 전', sx + 26, sy + 21, 7, '#5a3a22');
    for (const lx of [x0 + 12, x0 + w - 12, x0 + w / 2 - 34, x0 + w / 2 + 34]) lantern(lx, top + 10, '#f6e6b8', 1.1);
    storefront(x0 + 8, G - 44, w - 16, 44, { frame: '#5a3a22', inside: '#e8c89a', tint: 'rgba(255,190,110,.3)', base: true, baseC: '#5a3a22', panes: 5, draw: (x, y, w2, h) => { for (let k = 0; k < 4; k++) R(b, x, y + 2 + k * 10, w2, 0.8, '#c9a06a'); R(b, x + w2 / 2 - 3, y + h - 12, 6, 2, '#5a3a22'); ell(b, x + w2 / 2, y + h - 13, 2, 1, '#f2e6c9'); } }); // 창호지 문살
    for (let i = 0; i < 3; i++) { const ox = x0 + 10 + i * 9; ell(b, ox, G - 5, 4, 5, '#6b3e24'); ell(b, ox, G - 9, 3, 1.2, '#4a2a18'); ell(b, ox - 1.3, G - 6, 0.8, 2, 'rgba(255,255,255,.25)'); } // 옹기
    R(b, x0 + w - 30, G - 3, 24, 3, '#d6b26a'); for (let k = 0; k < 8; k++) R(b, x0 + w - 30 + k * 3, G - 3, 0.5, 3, '#a8823e'); // 짚 멍석
    return { glow: [[x0 + w / 2, top + 12, 70, '255,215,140'], [x0 + w / 2, G - 22, 60, '255,190,110']] };
  };
  SHOP.starre = (x0, w) => { // 흰 라이트박스 빨간 글씨 2줄 · 반쯤 내린 셔터 · 매물 전단
    const top = G - 132; body(x0, w, top, 'stone', '#ece3d4');
    for (let f = 0; f < 2; f++) { const fy = top + 8 + f * 32; for (let i = 0; i < 2; i++) { const wx = x0 + 8 + i * ((w - 16) / 2), ww = (w - 16) / 2 - 8; win(wx, fy, ww, 16, { frame: '#7a6a58', glass: '#86a3b5', curtain: r() < 0.5 ? '#d8e8f4' : null }); } }
    pot(x0 + 10, top - 3, 2, 1.2); pot(x0 + w - 12, top - 3, 0, 1.3);
    const sy = G - 70; R(b, x0 + 3, sy - 1, w - 6, 20, '#c0392b'); RB(x0 + 4, sy, w - 8, 18, '#fffaf2', true);
    PT('별빛', x0 + w / 2, sy + 5.5, 9, '#d63a2f', { glow: true }); PT('부동산 공인중개사', x0 + w / 2, sy + 13, 7, '#333', { glow: true, max: w - 12 });
    shutterBox(x0 + 3, G - 50, w - 6);
    storefront(x0 + 3, G - 45, w - 6, 45, { frame: '#2f3338', inside: '#f2f4f6', base: true, panes: 3, draw: (x, y, w2) => { for (let k = 0; k < 3; k++) for (let i = 0; i < Math.floor(w2 / 6); i++) { R(b, x + 1 + i * 6, y + 6 + k * 10, 5, 8, '#ffffff'); R(b, x + 1.5 + i * 6, y + 7 + k * 10, 4, 1.6, '#e2463c'); } for (let k = 0; k < 4; k++) R(b, x, y + k * 1.2, w2, 0.8, '#b8bec4'); } }); // 셔터 반쯤
    plate(x0 + 1, G - 40, '3Y');
    return { glow: [[x0 + w / 2, sy + 9, 50, '255,240,230'], [x0 + w / 2, G - 22, 40, '240,248,255']] };
  };
  function poly4(g, ax, ay, bx2, by2, cx, cy, c) { g.fillStyle = c; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx2, by2); g.lineTo(cx, cy); g.closePath(); g.fill(); }
  // 오피스텔 · 유리 타워 (화면 위로 넘어감)
  function tower(x0, w, o) {
    wall(x0, 0, w, G, o.kind || 'tile', o.wall);
    const fh = 26;
    for (let f = 0; f * fh < G - 50; f++) {
      const fy = G - 52 - (f + 1) * fh + 6, n = Math.max(1, Math.floor(w / 20));
      for (let i = 0; i < n; i++) { const wx = x0 + 4 + i * (w - 8) / n + 1.5, ww = (w - 8) / n - 3; win(wx, fy, ww, 14, { frame: o.frame || '#8a8478', glass: o.glass, curtain: r() < 0.35 ? '#f4e6d0' : null }); if (o.balcony) { R(b, wx - 1, fy + 15, ww + 2, 1.2, '#9aa3ad'); for (let k = 0; k < ww; k += 2) R(b, wx + k, fy + 15, 0.5, 4, '#9aa3ad'); R(b, wx - 1, fy + 19, ww + 2, 0.8, '#9aa3ad'); } }
    }
    R(b, x0, G - 50, w, 50, shade(o.wall, -0.06));
    if (o.lobby) o.lobby(x0, w);
    else storefront(x0 + 3, G - 44, w - 6, 44, { frame: '#3a3d42', inside: '#dfe6ea', lit: '#f0f6ff', panes: Math.max(2, Math.round(w / 30)), base: true });
  }
  SHOP.starlight = (x0, w, side) => {
    tower(x0, w, { wall: '#e6dccb', kind: 'stone', glass: '#55707f', frame: '#7d7568', balcony: true, lobby: (lx, lw) => {
      R(b, lx, G - 50, lw, 50, '#d8ccb6'); wall(lx, G - 50, lw, 50, 'stone', '#d8ccb6');
      const ex = lx + (side === 'E' ? (31 - 27) * CW : lw - (31 - 27 + 1) * CW); // 입구 위치 (y 31 칸)
      R(b, ex - 10, G - 46, CW + 20, 4, '#2a2f34'); R(b, ex - 10, G - 42, CW + 20, 1, '#111'); // 캐노피
      R(b, ex, G - 41, CW, 41, '#2a2f34'); R(b, ex + 1.5, G - 39, CW / 2 - 2, 39, '#9fc3d6'); R(b, ex + CW / 2 + 0.5, G - 39, CW / 2 - 2, 39, '#9fc3d6'); R(e, ex + 1.5, G - 39, CW - 3, 39, '#fff2c8');
      TB('STARLIGHT', ex + CW / 2, G - 50, 4, '#3a3f46', { glow: '#fff3d6', w: 900, max: CW + 16 });
      R(b, ex - 9, G - 30, 6, 8, '#cfd6dc'); for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) R(b, ex - 8.4 + j * 1.8, G - 29 + k * 2.3, 1.2, 1.6, '#6a7078'); // 공동현관 키패드
      for (const px of [ex - 18, ex + CW + 10]) pot(px, G, 3, 1.4);
      storefront(lx + 3, G - 40, Math.max(0, ex - 22 - lx), 40, { frame: '#3a3d42', inside: '#e9e2d4', lit: '#fff0d0', base: true });
      R(b, lx + 4, G - 48, 30, 6, '#3a3f46'); text(b, '별빛 아침', lx + 19, G - 45, 3.4, '#f3efe6');
    } });
  };
  SHOP.starlight2 = (x0, w) => tower(x0, w, { wall: '#e6dccb', kind: 'stone', glass: '#9fb6c4', frame: '#7d7568', balcony: true });
  SHOP.parang = (x0, w) => { tower(x0, w, { wall: '#9fb2c4', kind: 'panel', glass: '#6f9ccc', frame: '#5c7a99' }); RB(x0 + 6, G - 49, w - 12, 8, '#5c7a99', true); TB('파랑 오션오피스텔', x0 + w / 2, G - 45, 4.5, '#ffffff', { glow: true, max: w - 16 }); };
  // 사거리 (길이 안쪽으로 뻗어 나감) · 공원
  function crossing(x0, w) {
    R(b, x0, 0, w, G, 'rgba(0,0,0,0)');
    // 멀리 보이는 건물들
    for (let i = 0; i < 5; i++) { const bx = x0 + 4 + i * (w - 8) / 5, bw = (w - 8) / 5 - 2, bh = 40 + r() * 50; R(b, bx, G - 30 - bh, bw, bh, ['#c9c2b6', '#b7c1cb', '#d8cfc0', '#aab4bd'][i % 4]); for (let k = 0; k < 4; k++) for (let j = 0; j < 2; j++) { R(b, bx + 2 + j * bw / 2, G - 30 - bh + 6 + k * 10, bw / 2 - 4, 5, '#7f97a8'); if (r() < 0.5) R(e, bx + 2 + j * bw / 2, G - 30 - bh + 6 + k * 10, bw / 2 - 4, 5, '#ffd88a'); } }
    // 안쪽으로 뻗은 길 (사다리꼴)
    b.fillStyle = '#5c5f66'; b.beginPath(); b.moveTo(x0 + 8, G); b.lineTo(x0 + w - 8, G); b.lineTo(x0 + w * 0.62, G - 30); b.lineTo(x0 + w * 0.38, G - 30); b.closePath(); b.fill();
    for (let k = 0; k < 5; k++) { const t = k / 5, yy = G - t * 30, half = (w / 2 - 8) * (1 - t * 0.76); R(b, x0 + w / 2 - 0.6 * (1 - t), yy - 3, 1.2 * (1 - t * 0.7), 2.5 * (1 - t * 0.6), '#f2c230'); }
    R(b, x0 + 8, G - 30, w * 0.3 - 8, 30, '#a9a39a'); R(b, x0 + w * 0.7, G - 30, w * 0.3 - 8, 30, '#a9a39a');
    // 신호등
    R(b, x0 + 10, G - 60, 1.2, 60, '#4a4f58'); R(b, x0 + 7, G - 66, 7, 16, '#2b2f38'); circ(b, x0 + 10.5, G - 62, 1.6, '#e8343a'); circ(e, x0 + 10.5, G - 62, 1.6, '#ff5040'); circ(b, x0 + 10.5, G - 58, 1.6, '#444'); circ(b, x0 + 10.5, G - 54, 1.6, '#444');
    R(b, x0 + w - 18, G - 52, 12, 9, '#2f5fb3'); text(b, '물결로', x0 + w - 12, G - 47.5, 2.8, '#fff');
  }
  function park(x0, w) {
    R(b, x0, 0, w, G, 'rgba(0,0,0,0)');
    for (let i = 0; i < 4; i++) { const bx = x0 + i * w / 4, bh = 60 + r() * 40; R(b, bx + 2, G - 20 - bh, w / 4 - 4, bh, '#d4ccbf'); for (let k = 0; k < 5; k++) win(bx + 6, G - 14 - bh + k * 14, w / 4 - 12, 8, { glass: '#8fa6b5', frame: '#9a948a' }); }
    R(b, x0, G - 24, w, 24, '#6fa35a'); for (let i = 0; i < w; i += 3) ell(b, x0 + i, G - 24, 3, 2.2, i % 2 ? '#5f9a4a' : '#7cb866'); // 화단 울타리
    for (let i = 0; i < w; i += 6) { R(b, x0 + i, G - 12, 1, 12, '#f4f4f0'); } R(b, x0, G - 10, w, 1, '#f4f4f0');
    // 벤치
    R(b, x0 + w * 0.6, G - 8, 18, 2, '#8a5a34'); R(b, x0 + w * 0.6, G - 13, 18, 1.5, '#8a5a34'); R(b, x0 + w * 0.6 + 1, G - 6, 1, 6, '#333'); R(b, x0 + w * 0.6 + 16, G - 6, 1, 6, '#333');
    // 주차된 차
    const cx = x0 + 18; ell(b, cx + 20, G, 22, 2, 'rgba(0,0,0,.2)'); R(b, cx, G - 13, 40, 9, '#1f2126'); b.fillStyle = '#2c2f36'; b.beginPath(); b.moveTo(cx + 8, G - 13); b.lineTo(cx + 13, G - 21); b.lineTo(cx + 29, G - 21); b.lineTo(cx + 34, G - 13); b.closePath(); b.fill();
    R(b, cx + 14, G - 20, 7, 6, '#7d93a8'); R(b, cx + 22, G - 20, 7, 6, '#7d93a8'); circ(b, cx + 9, G - 4, 4, '#111'); circ(b, cx + 31, G - 4, 4, '#111'); circ(b, cx + 9, G - 4, 1.8, '#9aa3ad'); circ(b, cx + 31, G - 4, 1.8, '#9aa3ad'); R(b, cx + 38, G - 11, 2, 2, '#fff7c2'); R(e, cx + 38, G - 11, 2, 2, '#fff7c2');
  }

  // ---------- 거리 소품 (인도) ----------
  function tree(x, autumn) { // 가로수: 간판을 가리지 않게 낮고 동그랗게
    R(b, x - 1.2, G - 30, 2.4, 30, '#6b4a35'); R(b, x - 2.5, G - 2, 5, 2, '#5a3a22');
    const cols = autumn ? ['#f08a4b', '#f6b25a', '#e8693a', '#ffd27a', '#d9572c'] : ['#3f8f45', '#5fae4e', '#2e6b33', '#7cc36a'];
    for (let i = 0; i < 34; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 12; ell(b, x + Math.cos(a) * d * 1.1, G - 36 + Math.sin(a) * d * 0.75, 3.4 + r() * 2.4, 2.6 + r() * 1.6, cols[i % cols.length]); }
    for (let i = 0; i < 8; i++) R(b, x - 10 + r() * 20, G - 44 + r() * 14, 1.2, 1.2, 'rgba(255,255,255,.35)');
    R(b, x - 4, G - 1, 8, 1, '#8a8478');
  }
  function streetlamp(x) { R(b, x - 0.8, G - 70, 1.6, 70, '#4a4f58'); R(b, x - 0.8, G - 70, 8, 1.4, '#4a4f58'); R(b, x + 4, G - 70, 6, 3, '#3a3d42'); R(b, x + 4.5, G - 67, 5, 1.6, '#f4f0d0'); R(e, x + 4.5, G - 67, 5, 1.6, '#fff3b0'); return [x + 7, G - 66]; }
  function pole(x) { // 전봇대 + 변압기 + 빨강·흰 띠 + 광고지
    R(b, x - 2, 4, 4, G - 4, '#9a958c'); R(b, x - 2, 4, 1, G - 4, '#b5b0a6');
    for (let k = 0; k < 8; k++) R(b, x - 2, G - 30 + k * 3.6, 4, 1.8, k % 2 ? '#e8e3d6' : '#e8343a');
    R(b, x - 10, 18, 20, 1.6, '#6b665e'); R(b, x - 8, 28, 16, 1.4, '#6b665e'); R(b, x + 2.5, 32, 6, 9, '#7d8790'); R(b, x + 3, 33, 5, 1, '#9aa3ad');
    R(b, x - 2.5, G - 48, 5, 8, '#fff7e0'); R(b, x - 2, G - 47, 4, 1.4, '#e8343a');
    return [x, 19];
  }
  function bins(x) { for (const [dx, c, c2] of [[-5, '#2f5fb3', '#3f74cc'], [0.5, '#2e9e5b', '#3cb96b']]) { R(b, x + dx, G - 11, 5, 11, c); R(b, x + dx, G - 11, 5, 1.6, '#2b2f38'); R(b, x + dx + 1, G - 7.5, 3, 4, c2); text(b, '♻', x + dx + 2.5, G - 5.5, 2.6, '#fff'); } }
  function banner(x, c1, c2) { R(b, x - 0.4, G - 34, 0.8, 34, '#666'); R(b, x, G - 33, 6, 22, c1); R(b, x, G - 18, 6, 6, c2); R(b, x + 1, G - 30, 4, 1, c2); R(b, x + 1, G - 27, 4, 1, c2); }
  function stool(x) { R(b, x - 3, G - 8, 6, 1.4, '#f4f4f0'); R(b, x - 2.5, G - 6.6, 0.9, 6.6, '#d6d6d0'); R(b, x + 1.6, G - 6.6, 0.9, 6.6, '#d6d6d0'); }
  function pallet(x) { R(b, x - 6, G - 4, 12, 4, '#b08a5a'); for (let k = 0; k < 3; k++) R(b, x - 6 + k * 5, G - 4, 2, 4, '#8a6a3a'); R(b, x - 5, G - 10, 10, 6, '#e8e3d6'); }
  function cone(x) { b.fillStyle = '#ff7a2b'; b.beginPath(); b.moveTo(x - 3, G); b.lineTo(x, G - 9); b.lineTo(x + 3, G); b.closePath(); b.fill(); R(b, x - 1.6, G - 5, 3.2, 1.2, '#fff'); R(b, x - 4, G - 1, 8, 1, '#333'); }
  function scooterParked(x) { circ(b, x - 5, G - 3, 2.8, '#222'); circ(b, x + 5, G - 3, 2.8, '#222'); b.fillStyle = '#9fb6c4'; b.beginPath(); b.moveTo(x - 7, G - 6); b.lineTo(x + 1, G - 6); b.lineTo(x + 5, G - 12); b.lineTo(x + 6.5, G - 12); b.lineTo(x + 6, G - 3); b.lineTo(x - 7, G - 4); b.closePath(); b.fill(); R(b, x - 7, G - 8.5, 6, 2, '#2b2b30'); R(b, x + 3.5, G - 14, 4, 1, '#2b2b30'); }
  function fishtankOut(x) { R(b, x - 6, G - 16, 12, 12, '#2a3a44'); R(b, x - 5, G - 15, 10, 9, '#2f7fc0'); R(e, x - 5, G - 15, 10, 9, '#3aa0ff'); ell(b, x - 1, G - 11, 2, 1, '#f08a5d'); ell(b, x + 2, G - 13, 1.6, 0.8, '#ffd23a'); R(b, x - 6, G - 4, 1, 4, '#333'); R(b, x + 5, G - 4, 1, 4, '#333'); }

  const PROPS = {
    W: { // 서쪽 인도 (x 5~6)
      tree: [[6, 20], [6, 35.05], [6, 46.2], [6, 4.05]], lamp: [[6, 27], [6, 50]], pole: [[6, 23], [6, 52]], bins: [[6, 46]],
      banner: [[5, 18, '#e8336d', '#ffd1dc'], [5, 24, '#f2c230', '#e74c3c']], fishtank: [[5, 30]], plant: [[5, 36], [5, 37]],
    },
    E: { // 동쪽 인도 (x 13~14)
      tree: [[13, 23.3], [13, 30], [13, 42], [13, 51], [13, 4]], lamp: [[13, 26], [13, 47]], pole: [[13, 40]], bins: [[13, 34]],
      banner: [[14, 21, '#c0392b', '#ffcc2e'], [14, 22, '#1f1f1f', '#ff7043']], pallet: [[14, 36.5]], cone: [[14, 38]], scooter: [[13, 44]], stool: [[14, 18], [14, 19]],
    },
  };
  const LINE = {
    W: [['olive', 0, 4], ['freshmart', 4, 9], ['cross', 9, 17], ['sunny', 17, 23], ['peach', 23, 29], ['tuna', 29, 35], ['hanwoo', 35, 40], ['straw', 40, 46], ['park', 46, 56]],
    E: [['parang', 0, 9], ['cross', 9, 17], ['jumak', 17, 23], ['starre', 23, 27], ['starlight', 27, 39], ['starlight2', 39, 56]],
  };
  // 거리 y(칸) → 그림 x(px). 서쪽을 볼 땐 북쪽(y 0)이 오른쪽
  const xOf = (side, y) => (side === 'W' ? (H - y) * CW : y * CW);

  function build(side) {
    const W = H * CW;
    const [bc, bg] = mk(W, SH), [ec, eg] = mk(W, SH);
    b = bg; e = eg; r = rnd(side === 'W' ? 11 : 29);
    const regions = [], glows = [];
    for (const [id, y0, y1] of LINE[side]) {
      const a = xOf(side, y0), z = xOf(side, y1), x0 = Math.min(a, z), w = Math.abs(a - z);
      if (id === 'cross') crossing(x0, w); else if (id === 'park') park(x0, w);
      else { const o = SHOP[id](x0, w, side); if (o && o.glow) glows.push(...o.glow); }
      if (id !== 'cross' && id !== 'park' && id !== 'starlight2') regions.push({ id, x0, x1: x0 + w, y0, y1 });
      if (id !== 'cross' && id !== 'park') R(b, x0, G - 64, 0.6, 64, 'rgba(0,0,0,.12)'); // 건물 사이 그림자
    }
    // 인도 (블록 + 점자 블록) · 연석 · 도로
    const sw = b.createLinearGradient(0, G, 0, G + 32); sw.addColorStop(0, '#d9cfbf'); sw.addColorStop(1, '#cbbfad'); R(b, 0, G, W, 32, sw);
    for (let yy = G; yy < G + 32; yy += 4) R(b, 0, yy, W, 0.5, '#bfb3a0');
    for (let j = 0, yy = G; yy < G + 32; yy += 4, j++) for (let xx = (j % 2) * 4; xx < W; xx += 8) R(b, xx, yy, 0.5, 4, '#bfb3a0');
    R(b, 0, G + 14, W, 5, '#e9b92c'); for (let xx = 0; xx < W; xx += 3) R(b, xx, G + 14.5, 1.6, 1, '#f6d35a'); for (let xx = 0; xx < W; xx += 3) R(b, xx + 1.5, G + 17, 1.6, 1, '#f6d35a');
    R(b, 0, G + 32, W, 4, '#b3ada3'); R(b, 0, G + 32, W, 1, '#d8d2c8');
    R(b, 0, G + 36, W, SH - G - 36, '#5c5f66'); for (let xx = 0; xx < W; xx += 26) R(b, xx, G + 44, 12, 1.4, '#f4f4f4');
    for (const reg of LINE[side].filter((l) => l[0] === 'cross')) { const a = xOf(side, reg[1]), z = xOf(side, reg[2]); R(b, Math.min(a, z) + 6, G, Math.abs(a - z) - 12, 36, '#5c5f66'); for (let xx = Math.min(a, z) + 10; xx < Math.max(a, z) - 10; xx += 6) R(b, xx, G + 4, 3.5, 28, '#f6f6f2'); }
    // 소품: 따로 앞 레이어에 (밤에 창문 불빛이 나무·전봇대를 덮지 않게)
    const [fc, fg] = mk(W, SH), [fec, feg] = mk(W, SH);
    b = fg; e = feg;
    const P = PROPS[side], px = (y) => xOf(side, y + 0.5);
    const poles = [];
    for (const [, y, c1, c2] of P.banner || []) banner(px(y), c1, c2);
    for (const [, y] of P.fishtank || []) fishtankOut(px(y));
    for (const [, y] of P.plant || []) pot(px(y), G + 2, Math.floor(y), 1.6);
    for (const [, y] of P.bins || []) bins(px(y));
    for (const [, y] of P.pallet || []) pallet(px(y));
    for (const [, y] of P.cone || []) cone(px(y));
    for (const [, y] of P.scooter || []) scooterParked(px(y));
    for (const [, y] of P.stool || []) stool(px(y));
    for (const [, y] of P.tree || []) tree(px(y), y % 2 === 0 || side === 'W');
    for (const [, y] of P.lamp || []) { const [lx, ly] = streetlamp(px(y)); glows.push([lx, ly, 40, '255,236,170']); }
    for (const [, y] of P.pole || []) poles.push(pole(px(y)));
    // 전선: 전봇대 사이를 늘어지게
    const pts = [[-10, 22], ...poles.sort((p, q) => p[0] - q[0]), [W + 10, 22]];
    b.strokeStyle = 'rgba(35,35,40,.8)'; b.lineWidth = 0.5;
    for (const off of [0, 3, 9]) { b.beginPath(); for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [cx, cy] = pts[i + 1]; b.moveTo(ax, ay + off); b.quadraticCurveTo((ax + cx) / 2, Math.max(ay, cy) + off + 14, cx, cy + off); } b.stroke(); }
    // 밤용: 앞 레이어를 어둡게 칠한 복사본
    const [dc, dg] = mk(W, SH); dg.setTransform(1, 0, 0, 1, 0, 0); dg.drawImage(fc, 0, 0); dg.globalCompositeOperation = 'source-atop'; dg.fillStyle = 'rgba(16,20,56,.6)'; dg.fillRect(0, 0, dc.width, dc.height);
    return { base: bc, emit: ec, fore: fc, foreDark: dc, foreEmit: fec, w: W, h: SH, G, regions, glows, side };
  }

  window.TOWN_FRONT = { build, CW, G, SH, H, RES, xOf };
})();
