// 우리 동네: 男/女 픽셀 캐릭터 (인트로 영상 캐릭터를 본뜸, 옷만 현대식)
//  男: 웨이브 금발 · 흰 셔츠 · 베이지 슬랙스
//  女: 앞머리 있는 긴 검은 머리 · 흰 미니 원피스
// 16x24 로 그리고, 자동으로 1px 외곽선을 둘러 18x26 이 됨.
// 문자 = 색: . 투명 / h 머리 / H 머리 하이라이트 / s 피부 / b 볼터치 / e 눈 / E 눈 반짝 / m 입
//          w 흰 옷 / W 흰 옷 그늘 / p 바지 / f 벨트·구두 / r 여자 구두

const TOWN_SPRITES = (() => {
  const BASE = { s: '#ffe2cf', b: '#ffaab6', e: '#3a2a2e', E: '#ffffff', m: '#e06f7d', w: '#fdfdf8', W: '#dde2ea' };
  const PAL = {
    boy: { ...BASE, h: '#e8cd8a', H: '#f8e7b6', p: '#d8c29e', f: '#7a5642' },
    girl: { ...BASE, h: '#2b2326', H: '#55474f', r: '#f39cb2' },
  };
  const OUTLINE = '#3a2a2e';

  // ----- 男 -----
  const boyHair = [
    '....hh.hh.hh....',
    '...hhhhhhhhhh...',
    '..hhhHhhhhHhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
  ];
  const boyDown = [
    ...boyHair,
    '..hhsshhhhsshh..',
    '..hsEessssEesh..',
    '..hseesssseesh..',
    '..hbbssmmssbbh..',
    '...ssssssssss...',
    '......ssss......',
    '....wwWssWww....',
    '...wwwwwwwwww...',
    '..wwwwwwwwwwww..',
    '..wwwwwwwwwwww..',
    '..wwWwwwwwwWww..',
    '..sswwwwwwwwss..',
    '....ffffffff....',
    '....pppppppp....',
  ];
  const boyUp = [
    ...boyHair,
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '...hhhhhhhhhh...',
    '......ssss......',
    '....wwwwwwww....',
    '...wwwwwwwwww...',
    '..wwwwwwwwwwww..',
    '..wwwwwwwwwwww..',
    '..wwWwwwwwwWww..',
    '..sswwwwwwwwss..',
    '....ffffffff....',
    '....pppppppp....',
  ];
  const boySide = [
    '....h.hhh.h.....',
    '...hhhhhhhhhh...',
    '..hhhHhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhhh.',
    '..hhhhhhhhhhshh.',
    '..hhhhhhsssssss.',
    '..hhhhhssssEes..',
    '..hhhhhssssees..',
    '...hhhssssbssss.',
    '....hssssssmss..',
    '......ssss......',
    '....wwwwwwww....',
    '....wwwwwwww....',
    '....wwwwwwww....',
    '....wwwWwwww....',
    '....wwwwwwww....',
    '....wwwsswww....',
    '....ffffffff....',
    '....pppppppp....',
  ];
  const boyLegs = {
    stand: ['....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '...fff....fff...'],
    a: ['....ppp..ppp....', '....ppp..ppp....', '....ppp..fff....', '...fff..........'],
    b: ['....ppp..ppp....', '....ppp..ppp....', '....fff..ppp....', '..........fff...'],
  };
  const boySideLegs = {
    stand: ['.....pppppp.....', '.....pppppp.....', '.....pppppp.....', '.....fffffff....'],
    a: ['....pppppppp....', '...ppp....ppp...', '..ppp......ppp..', '..ff.......fff..'],
    b: ['....pppppppp....', '....ppp.ppp.....', '.....pppppp.....', '....fff.fff.....'],
  };

  // ----- 女 -----
  const girlHair = [
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhHhhhhhhhHh..',
    '..hhhhhhhhhhhh..',
  ];
  const girlDown = [
    ...girlHair,
    '..hssssssssssh..',
    '..hsEessssEesh..',
    '..hseesssseesh..',
    '..hbbssmmssbbh..',
    '..hhsssssssshh..',
    '..hhh.ssss.hhh..',
    '..hhwwwwwwwwhh..',
    '..hhwwwwwwwwhh..',
    '..hswwwwwwwwsh..',
    '..hswwwWWwwwsh..',
    '..hswwwwwwwwsh..',
    '...swwwwwwwws...',
    '...wwwwwwwwww...',
    '..wwwwwwwwwwww..',
    '..WwwwwwwwwwwW..',
  ];
  const girlUp = [
    ...girlHair,
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..shhhhhhhhhhs..',
    '..shhhhhhhhhhs..',
    '..shhhhhhhhhhs..',
    '...whhhhhhhhw...',
    '...wwwwwwwwww...',
    '..wwwwwwwwwwww..',
    '..WwwwwwwwwwwW..',
  ];
  const girlSide = [
    '....hhhhhhh.....',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhhh.',
    '..hhhhhHhhhhhhh.',
    '..hhhhhhhhhhhhh.',
    '..hhhhhhhssssss.',
    '..hhhhhhssssEe..',
    '..hhhhhhssssee..',
    '..hhhhhhsssbsss.',
    '..hhhhhhssssms..',
    '..hhhhhh.ss.....',
    '..hhhhhwwwwww...',
    '..hhhhhwwwwww...',
    '..hhhhwwwwwww...',
    '...hhhwwwsww....',
    '...hhhwwwwww....',
    '....hhwwwwww....',
    '....wwwwwwwww...',
    '....wwwwwwwww...',
    '....Wwwwwwwww...',
  ];
  const girlLegs = {
    stand: ['....ss....ss....', '....ss....ss....', '...rrr....rrr...'],
    a: ['....ss....ss....', '....ss....rr....', '...rrr..........'],
    b: ['....ss....ss....', '....rr....ss....', '..........rrr...'],
  };
  const girlSideLegs = {
    stand: ['.....ss.ss......', '.....ss.ss......', '....rrr.rrr.....'],
    a: ['....ss...ss.....', '...ss.....ss....', '..rrr.....rrr...'],
    b: ['.....ss.ss......', '.....ss.ss......', '....rrr.rrr.....'],
  };

  const DEF = {
    boy: { down: boyDown, up: boyUp, side: boySide, legs: boyLegs, sideLegs: boySideLegs },
    girl: { down: girlDown, up: girlUp, side: girlSide, legs: girlLegs, sideLegs: girlSideLegs },
  };

  function toCanvas(rows, pal, flip) {
    const W = 16, H = 24;
    rows.forEach((r, i) => { if (r.length !== W) console.warn('[sprite] 줄 길이', i, r.length, r); });
    if (rows.length !== H) console.warn('[sprite] 줄 수', rows.length);
    const grid = rows.map((r) => (flip ? [...r].reverse() : [...r]));
    const c = document.createElement('canvas');
    c.width = W + 2; c.height = H + 2;
    const g = c.getContext('2d');
    const opaque = (x, y) => y >= 0 && y < H && x >= 0 && x < W && grid[y][x] !== '.';
    for (let y = -1; y <= H; y++) {
      for (let x = -1; x <= W; x++) {
        if (opaque(x, y)) { g.fillStyle = pal[grid[y][x]] || '#f0f'; g.fillRect(x + 1, y + 1, 1, 1); }
        else if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) { g.fillStyle = OUTLINE; g.fillRect(x + 1, y + 1, 1, 1); }
      }
    }
    return c;
  }

  // ---------- 의상 (장롱에서 갈아입기) ----------
  // pal: 색 바꾸기, mod: 무늬·소품 (stripe 줄무늬 · skirt 위아래 투톤 · tie 넥타이 · strings 후드끈)
  const OUTFITS = {
    boy: [
      { id: 'shirt', name: '흰 셔츠 · 베이지 슬랙스', pal: {} },
      { id: 'hoodie', name: '회색 후드 · 청바지', pal: { w: '#a9afba', W: '#8b919c', p: '#4f6f9f', f: '#f1f1ec', y: '#f1f1ec' }, mod: 'strings' },
      { id: 'suit', name: '네이비 수트', pal: { w: '#2d4069', W: '#22314f', p: '#2d4069', f: '#1f1a1c', y: '#fdfdf8', x: '#c8344a' }, mod: 'tie' },
      { id: 'stripe', name: '마린 스트라이프 · 검정 바지', pal: { w: '#f6f3e6', W: '#dcd8c6', z: '#2f5d9a', p: '#33363d', f: '#e9e4d6' }, mod: 'stripe' },
      { id: 'pajama', name: '하늘색 잠옷', pal: { w: '#a9d6ef', W: '#8cc0de', z: '#ffffff', p: '#a9d6ef', f: '#f4f4f0' }, mod: 'stripe' },
    ],
    girl: [
      { id: 'dress', name: '흰 미니 원피스', pal: {} },
      { id: 'pink', name: '핑크 원피스', pal: { w: '#f7b8ca', W: '#e398ae', r: '#fdfdf8' } },
      { id: 'red', name: '빨간 데이트 원피스', pal: { w: '#d8434f', W: '#b23541', r: '#2b2326' } },
      { id: 'knit', name: '베이지 니트 · 검정 미니스커트', pal: { w: '#ead6b3', W: '#cfb990', u: '#2b2b30', U: '#1b1b20', r: '#3a2a22' }, mod: 'skirt' },
      { id: 'denim', name: '흰 티 · 청치마', pal: { u: '#6f90c2', U: '#58779f', r: '#fdfdf8' }, mod: 'skirt' },
      { id: 'pajama', name: '분홍 잠옷', pal: { w: '#ffd3df', W: '#f6b9c9', z: '#ffffff', r: '#ffd3df' }, mod: 'stripe' },
    ],
  };
  const setAt = (row, i, ch) => row.slice(0, i) + ch + row.slice(i + 1);
  function dress(rows, mod, view) {
    const n = rows.length;
    return rows.map((r, i) => {
      if (i < 12) return r; // 머리·얼굴은 그대로
      if (mod === 'stripe' && i % 2 === 0) r = r.replace(/w/g, 'z');
      if (mod === 'skirt' && i >= n - 3) r = r.replace(/w/g, 'u').replace(/W/g, 'U');
      if (mod === 'tie' && view === 'down') { if (i === 12) r = setAt(setAt(r, 7, 'y'), 8, 'y'); if (i >= 13 && i <= 15) r = setAt(setAt(r, 7, 'x'), 8, 'x'); }
      if (mod === 'strings' && view === 'down' && (i === 13 || i === 14)) r = setAt(setAt(r, 6, 'y'), 9, 'y');
      return r;
    });
  }
  const outfitOf = (who, id) => OUTFITS[who].find((o) => o.id === id) || OUTFITS[who][0];

  // 캐릭터별 { down:[stand,a,b], up:[...], left:[...], right:[...] }
  function build(who, outfitId) {
    const d = DEF[who], o = outfitOf(who, outfitId);
    const pal = { ...PAL[who], y: '#fdfdf8', x: '#c8344a', z: '#ffffff', u: PAL[who].w, U: PAL[who].W, ...o.pal };
    const withLegs = (body, legs) => [...body, ...legs];
    const frames = (body, legs, view, flip) => ['stand', 'a', 'b'].map((k) => toCanvas(withLegs(dress(body, o.mod, view), legs[k]), pal, flip));
    return {
      down: frames(d.down, d.legs, 'down'),
      up: frames(d.up, d.legs, 'up'),
      right: frames(d.side, d.sideLegs, 'side'),
      left: frames(d.side, d.sideLegs, 'side', true),
    };
  }
  // ---------- NPC: 기본 틀(男/女/묶은 머리 女)에 머리·옷·소품을 바꿔 끼움 ----------
  // 묶은 머리 여자 (알바): 옆머리 없이 뒤로 묶음, 뒤에서 보면 포니테일
  const tiedHair = [
    '....hhhhhhhh....',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhHhhhhhhhHh..',
  ];
  const tiedFace = [
    '..hssssssssssh..',
    '..hsEessssEesh..',
    '..hseesssseesh..',
    '..hbbssmmssbbh..',
    '...ssssssssss...',
    '......ssss......',
  ];
  const teeBody = [
    '....wwWssWww....',
    '..wwwwwwwwwwww..',
    '..swwwwwwwwwws..',
    '..swwwwwwwwwws..',
    '..swwwwwwwwwws..',
    '...swwwwwwwws...',
    '....pppppppp....',
    '....pppppppp....',
  ];
  const teeBack = [
    '....wwwwwwww....',
    '..wwwwwwwwwwww..',
    '..swwgwwwwgwws..',
    '..swwggggggwws..',
    '..swgGggggGgws..',
    '...swgwwwwgws...',
    '....pppppppp....',
    '....pppppppp....',
  ];
  const tiedDown = (bangs) => [...tiedHair, bangs, ...tiedFace, ...teeBody];
  const tiedUp = [
    ...tiedHair,
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '...hhhhhhhhhh...',
    '......hHhh......',
    '......hhhh......',
    ...teeBack,
  ];
  const tiedSide = [
    '....hhhhhhh.....',
    '...hhhhhhhhhh...',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhhh.',
    '..hhhhhHhhhhhhh.',
    '..hhhhhhhhhhhhh.',
    'hhhhhhhhhssssss.',
    'hhhhhhhhssssEe..',
    '.hhhhhhhssssee..',
    '.hh.hhhhsssbsss.',
    '....hhhhssssms..',
    '......ssss......',
    '....wwwwwwww....',
    '...wwwwwwwww....',
    '....wwwwwwww....',
    '....wwwsswww....',
    '....wwwwwwww....',
    '....wwwsswww....',
    '....pppppppp....',
    '....pppppppp....',
  ];
  const BANGS = {
    full: '..hhhhhhhhhhhh..',
    see: '..hhshshhshshh..',   // 시스루 앞머리
    none: '..hhhsssssshhh..',  // 앞머리 없음 (이마)
  };
  // 男 응용: 머리 모양 바꾸기
  const dandyHair = [
    '.....hhhhhh.....',
    '...hhhhhhhhhh...',
    '..hhhHHhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hsssshhhhhhh..',
  ];
  const capHair = [
    '................',
    '....cccccccc....',
    '...cccCcccccc...',
    '..cccccccccccc..',
    '..cccccccccccc..',
    '.cccccccccccccc.',
    '..hssssssssssh..',
  ];
  const beardFace = [
    '..hsEessssEesh..',
    '..hseesssseesh..',
    '..hkkssmmsskkh..',
    '...kkkkkkkkkk...',
    '......kkkk......',
  ];
  function maleDown(hair, face) {
    const base = boyDown;
    return [...hair, ...(face || base.slice(7, 12)), ...base.slice(12)].map((r) => r);
  }
  function npc(kind, o = {}) {
    const pal = {
      ...BASE, h: o.hair || '#3b2a24', H: o.hairHi || '#5a4238', w: o.top || '#1c1c1f', W: o.topShade || '#34343a',
      p: o.pants || '#2e3440', f: o.shoes || '#3a2a22', r: o.shoes || '#3a2a22', g: '#56c271', G: '#2f8a4a',
      c: o.cap || '#3d4a3a', C: o.capHi || '#5a6a55', k: o.beard || '#4a3a30', s: o.skin || BASE.s,
    };
    const frog = (rows) => rows; // (뒷모습에 이미 개구리 포함)
    let down, up, side, legs = boyLegs, sideLegs = boySideLegs;
    if (kind === 'tied') {
      down = tiedDown(BANGS[o.bangs || 'full']); up = tiedUp; side = tiedSide;
    } else if (kind === 'dandy') {
      down = maleDown(dandyHair); up = [...boyUp.slice(0, 12), ...teeBack.slice(0, 6), ...boyUp.slice(18)];
      side = boySide;
      down = down.map((r, i) => (i >= 12 && i <= 17 ? teeBody[i - 12] : r));
      side = side.map((r, i) => (i >= 12 && i <= 17 ? '....wwwwwwww....'.replace(/w/g, (m, j) => (i >= 14 && (j === 4 || j === 11) ? 's' : 'w')) : r));
    } else if (kind === 'beard') {
      down = [...capHair, ...beardFace, ...boyDown.slice(12)];
      up = [...capHair.slice(0, 6), '..cccccccccccc..', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '..hhhhhhhhhhhh..', '...hhhhhhhhhh...', '......ssss......', ...boyUp.slice(12)];
      side = [...capHair.slice(0, 5), '..ccccccccccccc.', '..hhhhhhsssssss.', '..hhhhhssssEes..', '..hhhhhssssees..', '...hhhkkkkkkkks.', '....hkkkkkkkks..', '......kkkk......', ...boySide.slice(12)];
    } else if (kind === 'boy') {
      down = boyDown; up = boyUp; side = boySide;
    } else { // girl (긴 머리)
      down = girlDown; up = girlUp; side = girlSide; legs = girlLegs; sideLegs = girlSideLegs;
    }
    const withLegs = (body, l) => [...body, ...l];
    const frames = (body, l, flip) => ['stand', 'a', 'b'].map((k) => toCanvas(withLegs(frog(body), l[k]), pal, flip));
    return { down: frames(down, legs), up: frames(up, legs), right: frames(side, sideLegs), left: frames(side, sideLegs, true) };
  }

  return { build, npc, OUTFITS };
})();
