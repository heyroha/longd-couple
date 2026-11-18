// 우리 동네 3D 화면 (Three.js)
// - 게임 로직(걷기·실시간·마트·요리·펫·탈것·채팅)은 town.js 그대로, 여기서는 그리기와 손 조작만 함
// - 벽·바닥·가구: town.js 의 그리기 도구(상자·윗면·벽면)를 받아 적어 3D 상자로 만듦
// - 둥근 소품(나무·화분·고양이·자전거 …)과 사람·펫: 픽셀 그림을 늘 카메라를 보는 판으로 세움
// - 거리 건물: town-front.js 가게 앞모습 그림을 붙인 3D 건물
// - 손 조작: 화면 아무 데나 끌면 360° 회전(관성), 두 손가락 = 확대·회전, 톡 = 걷기·누르기, 왼쪽 아래 조이스틱 = 이동
import * as THREE from 'three';

const API = window.T3API;
const FR = window.TOWN_FRONT;
if (!API) throw new Error('town.js 가 먼저 필요해요');

// ---------- 캔버스 · 렌더러 ----------
const ui = document.getElementById('town');                 // 위: 이름표·말풍선 + 손 입력
const gl = document.createElement('canvas'); gl.id = 'town3d';
ui.parentNode.insertBefore(gl, ui);
ui.classList.add('over3d');
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8478, 1.2);
const sunL = new THREE.DirectionalLight(0xffffff, 1.3); sunL.position.set(20, 40, 30);
const ZY = 1 / 16; // 그림 높이 1px = 1/16 칸
const SHADOW_Y = 0.07; // 발밑 그림자: 바닥 무늬·러그(겹겹이 조금씩 뜬 면, 최대 ~0.06)보다 위

// ---------- 색 ----------
const colCache = new Map();
function parseCol(c) {
  if (typeof c !== 'string') return [0.6, 0.6, 0.6, 1];
  if (colCache.has(c)) return colCache.get(c);
  let a = 1; const m = c.match(/rgba?\(([^)]+)\)/);
  const col = new THREE.Color();
  if (m) { const p = m[1].split(',').map((v) => parseFloat(v)); col.setRGB(p[0] / 255, p[1] / 255, p[2] / 255, THREE.SRGBColorSpace); if (p.length > 3) a = p[3]; }
  else { try { col.setStyle(c); } catch { col.setRGB(0.6, 0.6, 0.6); } }
  const out = [col.r, col.g, col.b, a]; colCache.set(c, out); return out;
}
const shadeHex = (hex, amt) => { if (typeof hex !== 'string' || hex[0] !== '#' || hex.length !== 7) return hex; const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * (amt > 0 ? 255 - v : v)))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join(''); };

// ---------- 받아 적은 면 → 3D 메시 ----------
// 같은 면 위에 겹쳐 그린 무늬는 순서대로 조금씩 앞으로 띄워서 깜빡임 없이
function primsToMeshes(prims, { splitWalls = false } = {}) {
  const groups = new Map(); // 그룹 키 → { opaque: {pos,col}, trans: {...} }
  const layer = new Map();
  const bump = (key) => { const n = (layer.get(key) || 0) + 1; layer.set(key, n); return n * 0.004; };
  const G = (g) => { const k = splitWalls && g && g[0] === 'w' ? g : ''; if (!groups.has(k)) groups.set(k, { o: { p: [], c: [] }, t: { p: [], c: [] } }); return groups.get(k); };
  const quad = (grp, a, b, c, d, col) => { // a b c d 반시계
    const [r, g, bl, al] = parseCol(col); const tgt = al < 0.98 ? grp.t : grp.o;
    for (const v of [a, b, c, a, c, d]) { tgt.p.push(v[0], v[1], v[2]); tgt.c.push(r, g, bl, al); }
  };
  for (const p of prims) {
    const grp = G(p.g);
    if (p.k === 't') { const y = p.z * ZY + 0.002 + bump(`t${p.z}|${Math.floor(p.x)}|${Math.floor(p.y)}`); quad(grp, [p.x, y, p.y + p.d], [p.x + p.w, y, p.y + p.d], [p.x + p.w, y, p.y], [p.x, y, p.y], p.c); }
    else if (p.k === 's') { const z = p.y + bump(`s${p.y.toFixed(3)}|${Math.floor(p.x0)}`); quad(grp, [p.x0, p.z0 * ZY, z], [p.x1, p.z0 * ZY, z], [p.x1, p.z1 * ZY, z], [p.x0, p.z1 * ZY, z], p.c); }
    else if (p.k === 'e') { const x = p.x + bump(`e${p.x.toFixed(3)}|${Math.floor(p.y0)}`); quad(grp, [x, p.z0 * ZY, p.y1], [x, p.z0 * ZY, p.y0], [x, p.z1 * ZY, p.y0], [x, p.z1 * ZY, p.y1], p.c); }
    else if (p.k === 'b') {
      const x0 = p.x, x1 = p.x + p.w, z0 = p.y, z1 = p.y + p.d, y0 = p.z * ZY, y1 = (p.z + p.h) * ZY;
      const side = p.c, dark = shadeHex(p.c, -0.1);
      quad(grp, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], p.t);                  // 위
      quad(grp, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], p.s || side);          // 남(앞)
      quad(grp, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], p.e || shadeHex(side, -0.18)); // 동
      quad(grp, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], dark);                  // 북
      quad(grp, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], dark);                  // 서
    }
  }
  const out = [];
  for (const [key, g] of groups) {
    for (const [kind, buf] of [['o', g.o], ['t', g.t]]) {
      if (!buf.p.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.p, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(buf.c, 4));
      geo.computeVertexNormals();
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: kind === 't' || Boolean(key), opacity: 1, depthWrite: kind !== 't' });
      const mesh = new THREE.Mesh(geo, mat); mesh.userData.wall = key || null;
      if (!key && kind === 't') mesh.renderOrder = -1; // 바닥의 반투명 무늬(대리석 광택 등)는 벽보다 먼저: 벽이 흐려질 때 순서가 뒤바뀌어 반짝이던 것
      if (key) { const b = new THREE.Box3().setFromBufferAttribute(geo.getAttribute('position')); mesh.userData.center = b.getCenter(new THREE.Vector3()); }
      out.push(mesh);
    }
  }
  return out;
}

// ---------- 판(빌보드): 픽셀 그림을 세움 ----------
const BILL = new Set(['tree', 'plant', 'monstera', 'cat', 'bike', 'moto', 'scooter', 'guitar', 'floorlamp', 'moodlamp', 'umbrella', 'cone', 'banner', 'lamp', 'pole', 'stool', 'pendant', 'produce']);
function makeBill(w, h, res, anchorY) {
  const cv = document.createElement('canvas'); cv.width = w * res; cv.height = h * res;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.25 }));
  spr.center.set(0.5, 1 - anchorY / h); spr.scale.set(w * ZY, h * ZY, 1);
  return { cv, g, tex, spr, w, h, res, anchorY };
}
function paintItemBill(b, f, time) {
  const cx = f.x + (f.w || 1) / 2, cy = f.y + (f.h || 1) / 2;
  b.g.setTransform(1, 0, 0, 1, 0, 0); b.g.clearRect(0, 0, b.cv.width, b.cv.height);
  b.g.setTransform(b.res, 0, 0, b.res, 0, 0);
  API.setOrigin(b.w / 2 - (cx - cy) * 16, b.anchorY - (cx + cy) * 8);
  try { API.drawFurniture(b.g, f, time); } catch {}
  b.tex.needsUpdate = true;
}
const alphaAt = (cv, uv) => { if (!uv) return 255; try { return cv.getContext('2d').getImageData(Math.floor(uv.x * cv.width), Math.floor((1 - uv.y) * cv.height), 1, 1).data[3]; } catch { return 255; } };

// ---------- 거리 건물 (가게 앞모습) ----------
const facadeMats = [];
function streetBuildings(root, colliders, shopPlanes) {
  const PX = 1 / FR.CW, WALL_H = FR.G * PX;
  const pixTex = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const crop = (cv, clear) => {
    let src = cv;
    if (clear) { src = document.createElement('canvas'); src.width = cv.width; src.height = cv.height; const g = src.getContext('2d'); g.drawImage(cv, 0, 0); for (const [a, b] of clear) g.clearRect(a * FR.RES, 0, (b - a) * FR.RES, src.height); }
    const t = pixTex(src); t.repeat.set(1, FR.G / FR.SH); t.offset.set(0, (FR.SH - FR.G) / FR.SH); return t;
  };
  const colTop = (cv, x) => { const d = cv.getContext('2d').getImageData(Math.round(x * FR.RES), 0, 1, cv.height).data; for (let y = 0; y < cv.height; y++) if (d[y * 4 + 3] > 200) return y / FR.RES; return FR.G; };
  for (const side of ['W', 'E']) {
    const st = FR.build(side), faceX = side === 'W' ? 5 : 15, rot = side === 'W' ? Math.PI / 2 : -Math.PI / 2;
    const cross = side === 'W' ? [[FR.xOf('W', 17), FR.xOf('W', 9)]] : [[FR.xOf('E', 9), FR.xOf('E', 17)]];
    const plane = (map, emit, x, alphaTest) => {
      const m = new THREE.MeshLambertMaterial({ map, emissiveMap: emit, emissive: 0xffffff, emissiveIntensity: 0, transparent: true, alphaTest, side: THREE.DoubleSide });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(FR.H, WALL_H), m); p.rotation.y = rot; p.position.set(x, WALL_H / 2, FR.H / 2); root.add(p); facadeMats.push(m); return p;
    };
    const fp = plane(crop(st.base, cross), crop(st.emit, cross), side === 'W' ? faceX + 0.01 : faceX - 0.01, 0.5);
    fp.userData.facade = { side, regions: st.regions }; shopPlanes.push(fp);
    const spans = side === 'W' ? [[0, 4], [4, 9], [17, 23], [23, 29], [29, 35], [35, 40], [40, 46], [46, 56]] : [[0, 9], [17, 23], [23, 27], [27, 39], [39, 56]];
    for (const [y0, y1] of spans) {
      const top = colTop(st.base, (FR.xOf(side, y0) + FR.xOf(side, y1)) / 2), h = (FR.G - top) * PX - 0.05;
      if (h <= 0.2) continue;
      const box = new THREE.Mesh(new THREE.BoxGeometry(4.96, h, y1 - y0 - 0.02), new THREE.MeshLambertMaterial({ color: 0xd2c9b9 }));
      box.position.set(side === 'W' ? 2.47 : 17.53, h / 2, (y0 + y1) / 2); root.add(box); colliders.push(box);
    }
  }
  // 바깥 땅 · 옆으로 뻗은 길 · 먼 건물
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x9a968c })); outer.rotation.x = -Math.PI / 2; outer.position.set(10, -0.03, 28); root.add(outer);
  for (const [x0, x1] of [[-60, 0], [20, 80]]) { const r = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 6), new THREE.MeshLambertMaterial({ color: 0x5c5f66 })); r.rotation.x = -Math.PI / 2; r.position.set((x0 + x1) / 2, -0.01, 13); root.add(r); }
  let s = 5; const rr = () => ((s = (s * 16807) % 2147483647) / 2147483647); const cols = [0xc9c2b6, 0xb7c1cb, 0xd8cfc0, 0xaab4bd, 0xe0d8ca];
  for (let i = 0; i < 46; i++) { const z = -8 + rr() * 74, w = 3 + rr() * 5, d = 3 + rr() * 5, h = 6 + rr() * 22; if (z > 7 && z < 19) continue; const x = i % 2 ? 29 + rr() * 22 : -9 - rr() * 22; const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: cols[i % 5] })); m.position.set(x, h / 2, z); root.add(m); }
}

// ---------- 장면 만들기 ----------
const built = new Map(); // scene 객체 → 3D
function build(s) {
  const root = new THREE.Group(), colliders = [], shopPlanes = [];
  const prims = API.capture((g) => { API.setOrigin(s.ox, s.oy); s.paint(g, s); if (s.drawExtra && s.key !== 'lobby') s.drawExtra(g); });
  const meshes = primsToMeshes(prims, { splitWalls: s.key !== 'street' });
  meshes.forEach((m) => root.add(m));
  const walls = meshes.filter((m) => m.userData.wall);
  const floors = meshes.filter((m) => !m.userData.wall);
  if (s.key === 'street') streetBuildings(root, colliders, shopPlanes);
  // 움직이는 가구 · 소품
  const items = [];
  for (const f of s.dyn || []) {
    if (f.kind === 'tower') continue;
    const it = { f, key: '', group: null, bill: null };
    items.push(it);
  }
  const lights = [];
  for (let i = 0; i < 8; i++) { const l = new THREE.PointLight(0xffe2b0, 0, 8, 1.4); root.add(l); lights.push(l); }
  // 바닥 판 (아무 데나 눌러 걷기용, 안 보임)
  const pick = new THREE.Mesh(new THREE.PlaneGeometry(s.w + 40, s.h + 40), new THREE.MeshBasicMaterial({ visible: false })); pick.rotation.x = -Math.PI / 2; pick.position.set(s.w / 2, 0, s.h / 2); root.add(pick);
  const b = { s, root, walls, floors, items, colliders, shopPlanes, lights, pick, people: new Map() };
  built.set(s, b);
  return b;
}
function itemKey(f) { return `${f.x},${f.y},${f.w},${f.h},${f.rot || 0}|${f.kind === 'tv' ? API.tvOn : ''}|${f.kind === 'fridge' ? 1 : ''}|${f.kind === 'speaker' ? (typeof TOWN_MUSIC !== 'undefined' && TOWN_MUSIC.current ? Math.floor(performance.now() / 500) % 2 : 'off') : ''}`; }
function syncItems(b, time) {
  const objs = b.s.objects || [];
  for (const it of b.items) {
    const f = it.f;
    if (f.ride) { const ridden = API.player.ride === f.ride || (API.other.visible && API.other.ride === f.ride); if (it.bill) it.bill.spr.visible = !ridden; if (ridden) continue; }
    if (BILL.has(f.kind)) {
      if (!it.bill) { const tall = ['pole', 'lamp', 'tree', 'floorlamp', 'pendant'].includes(f.kind), wide = Math.max(96, ((f.w || 1) + (f.h || 1)) * 16 + 40); it.bill = makeBill(wide, tall ? 112 : 64, 2, tall ? 100 : 52); it.bill.spr.userData.item = it; b.root.add(it.bill.spr); it.lastPaint = 0; }
      const k = itemKey(f);
      if (k !== it.key || time - it.lastPaint > 0.16) { paintItemBill(it.bill, f, time); it.lastPaint = time; it.key = k; }
      it.bill.spr.position.set(f.x + (f.w || 1) / 2, 0, f.y + (f.h || 1) / 2);
      it.obj = objs.find((o) => o.furn === f || (o.id && o.id === f.id));
      continue;
    }
    const k = itemKey(f);
    if (k === it.key) continue;
    it.key = k;
    if (it.group) { b.root.remove(it.group); it.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
    const prims = API.capture((g) => { API.setOrigin(b.s.ox, b.s.oy); API.drawFurniture(g, f, time); });
    it.group = new THREE.Group(); primsToMeshes(prims).forEach((m) => { m.userData.item = it; it.group.add(m); });
    b.root.add(it.group);
    it.obj = objs.find((o) => o.furn === f || (o.id && o.id === f.id));
  }
}

// ---------- 캐릭터를 가리는 소품·가구는 투명하게 ----------
function fadeBlockers(b, dt) {
  const cx = camera.position.x, cz = camera.position.z;
  for (const it of b.items) {
    const f = it.f, ix = f.x + (f.w || 1) / 2, iz = f.y + (f.h || 1) / 2, rad = Math.max(f.w || 1, f.h || 1) / 2 + 0.55;
    let block = false;
    for (const [px, pz] of focus) {
      const vx = px - cx, vz = pz - cz, L2 = vx * vx + vz * vz || 1, t = ((ix - cx) * vx + (iz - cz) * vz) / L2;
      if (t < 0.02 || t > 1.02) continue;
      const qx = cx + vx * t - ix, qz = cz + vz * t - iz;
      if (qx * qx + qz * qz < rad * rad && Math.hypot(px - ix, pz - iz) > 0.35) { block = true; break; }
    }
    const want = block ? 0.28 : 1;
    const mats = it.bill ? [it.bill.spr.material] : it.group ? it.group.children.map((m) => m.material) : [];
    for (const m of mats) { if (!m) continue; if (want < 1) m.transparent = true; m.opacity += (want - m.opacity) * Math.min(1, dt * 4); m.depthWrite = m.opacity > 0.95; if (it.bill) m.alphaTest = m.opacity < 0.95 ? 0.05 : 0.25; }
  }
}

// ---------- 탈것 3D 모델: 가는 방향으로 부드럽게 돌고 바퀴가 굴러감 ----------
function vehicleModel(kind) {
  const g = new THREE.Group(), L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  const wheels = [];
  const wheel = (z, r, tube) => { const w = new THREE.Group(); const t = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 20), L(0x2b2b30)); t.rotation.y = Math.PI / 2; w.add(t); for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.015, r * 2, 0.015), L(0x9aa3ad)); sp.rotation.x = (i * Math.PI) / 4; w.add(sp); } w.position.set(0, r + tube, z); g.add(w); wheels.push(w); return w; };
  const bar = (len, col, x, y, z, rx = 0, th = 0.04) => { const m = new THREE.Mesh(new THREE.BoxGeometry(th, th, len), L(col)); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  if (kind === 'm') { // 노란 스쿠터형 오토바이
    wheel(0.36, 0.17, 0.06); wheel(-0.36, 0.17, 0.06);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.62), L(0xffd21f)); body.position.set(0, 0.36, -0.05); g.add(body);
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.14), L(0xffd21f)); front.position.set(0, 0.5, 0.3); front.rotation.x = -0.25; g.add(front);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.42), L(0x3a2a22)); seat.position.set(0, 0.5, -0.12); g.add(seat);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.3), L(0x2b2b30)); floor.position.set(0, 0.27, 0.12); g.add(floor);
    bar(0.42, 0x2b2b30, 0, 0.74, 0.34, 0, 0.03).rotation.y = Math.PI / 2;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.03), L(0xfff7c2, { emissive: 0xfff2a0, emissiveIntensity: 0.6 })); lamp.position.set(0, 0.62, 0.39); g.add(lamp);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.02), L(0xe8343a, { emissive: 0xe8343a, emissiveIntensity: 0.5 })); tail.position.set(0, 0.42, -0.37); g.add(tail);
  } else { // 공유 자전거
    const col = kind === 'b1' ? 0x7fd3c6 : 0xf2c230;
    wheel(0.33, 0.2, 0.025); wheel(-0.33, 0.2, 0.025);
    bar(0.5, col, 0, 0.36, 0, 0); bar(0.36, col, 0, 0.42, -0.12, -1.0); bar(0.4, col, 0, 0.44, 0.2, 0.9); bar(0.3, col, 0, 0.3, -0.22, 0.6);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.16), L(0x2b2b30)); seat.position.set(0, 0.58, -0.16); g.add(seat);
    bar(0.36, 0x2b2b30, 0, 0.66, 0.3, 0, 0.03).rotation.y = Math.PI / 2;
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.16), L(col)); basket.position.set(0, 0.6, 0.42); g.add(basket);
  }
  const S = kind === 'm' ? 1.3 : 1.35; g.scale.setScalar(S); // 사람 판 크기에 맞춤
  g.userData.wheels = wheels; g.userData.r = (kind === 'm' ? 0.23 : 0.225) * S;
  return g;
}
const rides = new Map(); // 사람 id → { model, heading, x, z }
function updateRide(b, id, c, wx, wz, dt) {
  let st = rides.get(id);
  if (!c.ride) { if (st) { st.model.parent?.remove(st.model); rides.delete(id); } return; }
  if (!st || st.kind !== c.ride || st.root !== b.root) {
    if (st) st.model.parent?.remove(st.model);
    st = { kind: c.ride, model: vehicleModel(c.ride), heading: null, x: wx, z: wz, root: b.root }; b.root.add(st.model); rides.set(id, st);
  }
  const vx = wx - st.x, vz = wz - st.z, d = Math.hypot(vx, vz);
  const faceAng = { up: Math.PI, down: 0, left: -Math.PI / 2, right: Math.PI / 2 }[c.face] ?? 0;
  const want = d > 0.004 ? Math.atan2(vx, vz) : st.heading ?? faceAng;
  if (st.heading == null) st.heading = want;
  let diff = ((want - st.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  st.heading += diff * Math.min(1, dt * 9); // 부드럽게 방향 틀기
  st.model.rotation.set(0, st.heading, Math.max(-0.18, Math.min(0.18, -diff * 0.35))); // 돌 때 살짝 기울기
  st.model.position.set(wx, 0, wz);
  for (const w of st.model.userData.wheels) w.rotation.x += d / st.model.userData.r;
  st.x = wx; st.z = wz;
  return st;
}

// ---------- 사람 · 펫 판 ----------
const camDir = new THREE.Vector3();
function viewFace(face) { // 세상 방향 → 카메라에서 보이는 모습
  camera.getWorldDirection(camDir);
  const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[face] || [0, 1];
  const n = Math.hypot(camDir.x, camDir.z) || 1, fx = camDir.x / n, fz = camDir.z / n;
  const dot = v[0] * fx + v[1] * fz, right = v[0] * -fz + v[1] * fx;
  return dot < -0.5 ? 'down' : dot > 0.5 ? 'up' : right > 0 ? 'right' : 'left';
}
function personBill(b, id) {
  let p = b.people.get(id);
  if (!p) {
    p = makeBill(64, 72, 3, 60); p.spr.scale.multiplyScalar(0.88);
    p.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    p.shadow.rotation.x = -Math.PI / 2; p.shadow.scale.set(1, 0.6, 1); p.shadow.renderOrder = 2; // 바닥 무늬(반투명 포함)보다 늘 나중에 그려서 걸을 때 반짝이지 않게
    b.root.add(p.spr); b.root.add(p.shadow); b.people.set(id, p);
    if (id === 'me' || id === 'partner' || id === 'buddy') { // 가려져도 보이는 반투명 실루엣 (안 가려지면 겹쳐서 티 안 남)
      p.ghost = new THREE.Sprite(new THREE.SpriteMaterial({ map: p.tex, transparent: true, opacity: 0.4, depthTest: false, depthWrite: false }));
      p.ghost.center.copy(p.spr.center); p.ghost.scale.copy(p.spr.scale); p.ghost.renderOrder = 999; b.root.add(p.ghost);
    }
  }
  p.seen = true; return p;
}
const sprIds = new WeakMap(); let sprN = 0; const sprId = (o) => { if (!sprIds.has(o)) sprIds.set(o, ++sprN); return sprIds.get(o); };
const NUDGE = 0.32; // 사람 판을 카메라 쪽으로 살짝 → 벽·건물과 겹치지 않게
const focus = []; // 이번 프레임 가리면 안 되는 사람 위치
function drawPeople(b, time) {
  focus.length = 0;
  for (const p of b.people.values()) p.seen = false;
  const { people, animOn, phase } = API.peopleNow();
  const tags = [];
  const T = API.T;
  camera.getWorldDirection(camDir);
  let i = 0;
  for (const c of people) {
    const id = c.me ? 'me' : c.partner ? 'partner' : c.buddy ? 'buddy' : c.npc ? `n${b.s.npcs.indexOf(c.npc)}` : `x${i}`; i++;
    const p = personBill(b, id);
    const face = c.pose === 'lie' ? 'down' : viewFace(c.face);
    const hop = Math.round(c.hop || 0), dx = Math.round(c.dx || 0);
    const frameIdx = c.moving ? Math.floor((c.step || 0) / 0.14) % 4 : 0;
    const em = c.emote ? Math.floor((performance.now() - c.emote.start) / 90) : -1;
    const key = `${face}|${frameIdx}|${hop}|${dx}|${c.ride || ''}|${c.pillion ? 1 : 0}|${c.pose || ''}|${c.sit ? 1 : 0}|${c.guitar ? Math.floor(performance.now() / 160) % 2 : ''}|${c.smoking ? 1 : 0}|${em}|${c.arms || ''}|${c.biteMark ? 1 : 0}|${c.who ? sprId(API.sprOf(c.who)) : ''}|${c.hold ? c.hold.id + (c.hold.sip && Math.floor(performance.now() / 650) % 3 === 0 ? 'u' : '') : ''}`;
    if (key !== p.key) {
      p.key = key;
      p.g.setTransform(1, 0, 0, 1, 0, 0); p.g.clearRect(0, 0, p.cv.width, p.cv.height); p.g.setTransform(p.res, 0, 0, p.res, 0, 0);
      const cv = { ...c, face, dx: 0, dy: 0, noVehicle: true };
      try {
        const bb = API.drawAt(p.g, cv, 32 + dx, 60);
        if (c.emote) API.drawEmote(p.g, cv, bb, time);
        if (c.biteMark) { const mx = (bb[0] + bb[2]) / 2 + 3, my = bb[1] + 14; for (const k of [0, 3]) { p.g.fillStyle = '#fff'; p.g.fillRect(mx + k, my, 2, 1); p.g.fillStyle = '#e06f7d'; p.g.fillRect(mx + k, my + 1, 1, 1); } }
      } catch {}
      p.tex.needsUpdate = true;
    }
    const wx = c.x / T, wz = c.y / T;
    updateRide(b, id, c, wx, wz, Math.min(0.05, time - (drawPeople.lt || time)));
    p.spr.position.set(wx - camDir.x * NUDGE * (c.ride || c.pillion ? 0.4 : 1), c.ride ? (c.ride === 'm' ? 0.05 : 0.08) : 0, wz - camDir.z * NUDGE * (c.ride || c.pillion ? 0.4 : 1));
    if (p.ghost) p.ghost.position.copy(p.spr.position);
    if (c.me || c.partner || c.buddy) focus.push([wx, wz]);
    p.spr.userData.person = c;
    p.shadow.visible = !c.sit && !c.pose && !c.ride && !c.pillion; p.shadow.position.set(wx, SHADOW_Y, wz);
    // 이름표 · 말풍선
    const head = new THREE.Vector3(wx, c.pose === 'lie' ? 2.2 : c.sit || c.pose ? 1.55 : 1.85, wz);
    const tag = c.me ? [API.names[API.me], '#ff6b81'] : c.partner || c.buddy ? [API.names[API.partner], '#6f86c9'] : c.npc && c.npc.name ? [c.npc.name, '#2f8a4a'] : null;
    const bub = c.me ? API.fx.bubbles[API.me] : c.partner ? API.fx.bubbles[API.partner] : c.buddy ? API.buddy.bubble : c.npc ? c.npc.bubble : null;
    if (tag || bub) tags.push({ v: head, tag: tag && tag[0], color: tag && tag[1], bub });
    // 안기·뽀뽀 중에는 머리 위에 큰 하트
    if (animOn && phase >= 1.2 && (c.me || c.partner || c.buddy) && API.anim && API.anim.type !== 'bite') tags.push({ v: head.clone().add(new THREE.Vector3(0, 1.0, 0)), fxHeart: true, big: true });
  }
  // 펫
  const P = API.townSt.pet, pe = API.petE;
  let pp = b.people.get('pet');
  if (P && pe.show) {
    pp = personBill(b, 'pet');
    p2: {
      pp.g.setTransform(1, 0, 0, 1, 0, 0); pp.g.clearRect(0, 0, pp.cv.width, pp.cv.height); pp.g.setTransform(pp.res, 0, 0, pp.res, 0, 0);
      try { API.drawPet(pp.g, 32, 60, P, time, pe.react); } catch {}
      pp.tex.needsUpdate = true;
    }
    pp.spr.position.set(pe.x / T - camDir.x * NUDGE, 0, pe.y / T - camDir.z * NUDGE); pp.spr.userData.pet = true; pp.shadow.position.set(pe.x / T, SHADOW_Y, pe.y / T);
    if (pe.bubble) tags.push({ v: new THREE.Vector3(pe.x / T, 1.2, pe.y / T), bub: pe.bubble });
    const gg = API.petGrow(P); if (gg != null) tags.push({ v: new THREE.Vector3(pe.x / T, 1.05, pe.y / T), gauge: gg });
  }
  for (const [k, p] of b.people) { p.spr.visible = p.seen; if (p.ghost) p.ghost.visible = p.seen; p.shadow.visible = p.seen && p.shadow.visible; if (!p.seen && k.startsWith('x')) { b.root.remove(p.spr); b.root.remove(p.shadow); b.people.delete(k); } }
  drawPeople.lt = time;
  for (const [id, st] of rides) if (!b.people.get(id)?.seen || st.root !== b.root) { st.model.parent?.remove(st.model); rides.delete(id); }
  // 2D 화면 좌표로 만든 하트·음표 → 3D 위치로 옮겨서 (머리 높이에서 위로 둥실)
  const back = (x, y) => { const a = (x - b.s.ox) / 16, c2 = (y + 30 - b.s.oy) / 8; return [(a + c2) / 2, (c2 - a) / 2]; };
  for (const h of API.fx.hearts) { const k = 1 - h.t / h.life, [gx, gz] = back(h.x, h.y); tags.push({ v: new THREE.Vector3(gx + Math.sin(k * 6 + h.s) * 0.15, 2.15 + k * 1.2, gz), fxHeart: true, a: Math.min(1, h.t * 1.5) }); }
  for (const n of API.fx.notes) { const k = 1 - n.t / n.life, [gx, gz] = back(n.x, n.y - 4); tags.push({ v: new THREE.Vector3(gx + Math.sin(k * 5) * 0.2, 1.6 + k * 1.1, gz), note: String(n.ch).replace(/\p{Extended_Pictographic}/gu, '♪'), a: Math.min(1, n.t * 1.5) }); }
  if (b.s.catBub && b.s.catBub.until > Date.now()) tags.push({ v: new THREE.Vector3(b.s.catBub.gx, 0.9, b.s.catBub.gy), bub: b.s.catBub });
  if (b.s.entrance) tags.push({ v: new THREE.Vector3(b.s.entrance.gx, 3.2 + Math.abs(Math.sin(time * 3)) * 0.25, b.s.entrance.gy), tag: '🏠 우리집 입구', color: '#e8902a' });
  return tags;
}

// ---------- 카메라 (끌어서 360° · 관성 · 두 손가락 확대) ----------
const camS = { yaw: Math.PI / 4, pitch: 0.62, dist: 10, vy: 0, vp: 0, tx: 0, tz: 0, tyaw: Math.PI / 4, tpitch: 0.62, tdist: 10 };
const DIST = { street: [13, 1.4, 45], home: [18, 1.4, 40], jumak: [15, 1.4, 34], mart: [15, 1.4, 34], lobby: [13, 1.4, 30], hall: [14, 1.4, 34] }; // 장면 바뀔 때 적당히 떨어져서 시작
function baseYaw(key) { return key === 'street' && API.player && API.player.x / API.T > 10 ? -Math.PI / 4 : Math.PI / 4; } // 거리: 길 가운데 쪽에서 바라봄
function resetCam(key) { const d = DIST[key] || [9, 3, 18]; camS.tyaw = camS.yaw = baseYaw(key); camS.tpitch = camS.pitch = key === 'street' ? 0.55 : 0.82; camS.tdist = camS.dist = d[0]; }
const ray = new THREE.Raycaster();
function updateCamera(b, dt) {
  // 관성
  if (!drag) { camS.tyaw += camS.vy * dt; camS.tpitch += camS.vp * dt; const k = Math.pow(0.002, dt); camS.vy *= k; camS.vp *= k; } // 차분하게: 관성 짧게
  const lim = DIST[b.s.key] || [9, 3, 18];
  camS.tpitch = Math.max(0.38, Math.min(1.15, camS.tpitch)); camS.tdist = Math.max(lim[1], Math.min(lim[2], camS.tdist));
  const s = 1 - Math.pow(0.012, dt); // 천천히 부드럽게 따라감
  camS.yaw += (camS.tyaw - camS.yaw) * s; camS.pitch += (camS.tpitch - camS.pitch) * s; camS.dist += (camS.tdist - camS.dist) * (pinch ? 1 : 1 - Math.pow(0.0004, dt)); // 확대·축소는 손가락에 바로
  const px = API.player.x / API.T, pz = API.player.y / API.T, f = 1 - Math.pow(API.player.ride ? 0.0004 : 0.01, dt); // 탈것은 빨라서 더 꽉 따라감
  camS.tx += (px - camS.tx) * f; camS.tz += (pz - camS.tz) * f;
  const target = new THREE.Vector3(camS.tx, 0.9, camS.tz);
  const dir = new THREE.Vector3(Math.cos(camS.pitch) * Math.sin(camS.yaw), Math.sin(camS.pitch), Math.cos(camS.pitch) * Math.cos(camS.yaw));
  let d = camS.dist;
  if (b.colliders.length) { // 거리: 건물에 부딪히면 카메라를 앞으로 당김 (건물 속으로 안 들어감)
    ray.set(target, dir); ray.far = d;
    const hit = ray.intersectObjects(b.colliders, false)[0];
    if (hit) d = Math.max(1.2, hit.distance - 0.3);
  }
  camera.position.copy(target).addScaledVector(dir, d);
  camera.lookAt(target);
  // 집·가게 안: 나와 카메라 사이(카메라 쪽)에 있는 벽은 투명하게
  if (b.walls.length) {
    const cdx = dir.x, cdz = dir.z, n = Math.hypot(cdx, cdz) || 1;
    for (const w of b.walls) {
      const c = w.userData.center, vx = c.x - camS.tx, vz = c.z - camS.tz;
      const along = (vx * cdx + vz * cdz) / n, perp = Math.abs(vx * -cdz + vz * cdx) / n;
      const hide = along > 0.2 && perp < 3.2 + along * 0.35;
      const want = hide ? 0.12 : 1; w.material.opacity += (want - w.material.opacity) * Math.min(1, dt * 4);
      w.material.depthWrite = w.material.opacity > 0.9;
    }
  }
}

// ---------- 손 입력 ----------
const ptrs = new Map(); let drag = null, pinch = null, pressT = null;
ui.style.touchAction = 'none';
ui.addEventListener('pointerdown', (e) => {
  if (!active || !document.getElementById('modal').hidden) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { ui.setPointerCapture(e.pointerId); } catch {}
  camS.vy = camS.vp = 0;
  if (ptrs.size === 2) { const [a, c] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - c.x, a.y - c.y), ang: Math.atan2(c.y - a.y, c.x - a.x), dist: camS.tdist, yaw: camS.tyaw }; drag = null; clearTimeout(pressT); return; }
  drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false, lt: performance.now() };
  clearTimeout(pressT);
  pressT = setTimeout(() => { // 집 가구 꾹 → 옮기기
    if (!drag || drag.moved || cur?.s.key !== 'home') return;
    const h = pickAt(drag.x, drag.y); if (h && h.obj && h.obj.move) { drag.long = true; API.startEdit(h.obj); }
  }, 550);
});
ui.addEventListener('pointermove', (e) => {
  if (!active || !ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && ptrs.size >= 2) {
    const [a, c] = [...ptrs.values()], d = Math.hypot(a.x - c.x, a.y - c.y), ang = Math.atan2(c.y - a.y, c.x - a.x);
    camS.tdist = pinch.dist * pinch.d / Math.max(20, d);
    // 두 손가락 비틀기 = 회전 (살짝 비튼 건 무시해서 확대할 때 흔들리지 않게)
    let da = ang - pinch.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
    const DEAD = 0.14; if (Math.abs(da) > DEAD) camS.tyaw = pinch.yaw - (da - Math.sign(da) * DEAD);
    return;
  }
  if (!drag) return;
  const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly, now = performance.now(), dtm = Math.max(1, now - drag.lt) / 1000;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) { drag.moved = true; clearTimeout(pressT); }
  if (drag.moved && !drag.long) {
    const ky = 0.0062, kp = 0.0026; // 화면을 두세 번 쓸면 한 바퀴 (위아래는 차분하게)
    camS.tyaw -= dx * ky; camS.tpitch += dy * kp;
    camS.vy = Math.max(-1.6, Math.min(1.6, camS.vy * 0.6 + (-dx * ky / dtm) * 0.15)); camS.vp = Math.max(-0.8, Math.min(0.8, camS.vp * 0.6 + (dy * kp / dtm) * 0.1));
  }
  drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = now;
});
function ptrEnd(e) {
  if (!active) return;
  ptrs.delete(e.pointerId); clearTimeout(pressT);
  if (pinch) { if (ptrs.size < 2) pinch = null; drag = null; return; }
  const d = drag; drag = null;
  if (!d || e.type === 'pointercancel') return;
  if (performance.now() - d.lt > 80) { camS.vy = 0; camS.vp = 0; } // 멈췄다 뗐으면 관성 없음
  if (d.moved || d.long || API.editing) return;
  API.tap3D(pickAt(d.x, d.y));
}
ui.addEventListener('pointerup', ptrEnd); ui.addEventListener('pointercancel', ptrEnd);
ui.addEventListener('wheel', (e) => { if (!active) return; e.preventDefault(); camS.tdist *= Math.exp(e.deltaY * 0.0018); }, { passive: false });
const ndc = new THREE.Vector2();
function pickAt(clientX, clientY) {
  if (!cur) return null;
  const r = gl.getBoundingClientRect(); ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera); ray.far = 300;
  const hits = ray.intersectObjects(cur.root.children, true);
  for (const h of hits) {
    const o = h.object;
    if (o.isSprite) {
      const bill = o.userData.person ? [...cur.people.values()].find((p) => p.spr === o) : o.userData.pet ? cur.people.get('pet') : o.userData.item ? o.userData.item.bill : null;
      if (!bill || alphaAt(bill.cv, h.uv) < 40) continue;
      if (o.userData.pet) return { pet: true };
      const c = o.userData.person;
      if (c) return { kind: c.me ? 'me' : c.partner ? 'partner' : c.buddy ? 'buddy' : 'npc', npc: c.npc };
      if (o.userData.item && o.userData.item.obj) return { obj: o.userData.item.obj };
      continue;
    }
    if (o.userData.item) { if (o.userData.item.obj) return { obj: o.userData.item.obj }; return { grid: [h.point.x, h.point.z] }; }
    if (o.userData.facade) {
      const { side, regions } = o.userData.facade, gz = h.point.z, y = h.point.y;
      const reg = regions.find((g) => gz >= g.y0 && gz < g.y1);
      if (reg && y < 6) return { shop: { ...reg, side } };
      return { grid: [side === 'W' ? 5.5 : 14.5, gz] };
    }
    if (o.userData.wall && o.material.opacity < 0.5) continue; // 투명해진 벽은 통과
    return { grid: [h.point.x, h.point.z] };
  }
  return null;
}

// ---------- 조이스틱 (왼쪽 아래) ----------
const joyEl = document.createElement('div'); joyEl.className = 'joy'; joyEl.innerHTML = '<i></i>';
document.body.appendChild(joyEl);
const knob = joyEl.querySelector('i');
let joyP = null;
joyEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); joyP = { id: e.pointerId, cx: 0, cy: 0 }; const r = joyEl.getBoundingClientRect(); joyP.cx = r.left + r.width / 2; joyP.cy = r.top + r.height / 2; try { joyEl.setPointerCapture(e.pointerId); } catch {} joyMoveTo(e); });
joyEl.addEventListener('pointermove', (e) => { if (joyP && e.pointerId === joyP.id) joyMoveTo(e); });
const joyEnd = (e) => { if (!joyP || e.pointerId !== joyP.id) return; joyP = null; API.joy.on = false; API.joy.x = API.joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); };
joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
let joyScreen = [0, 0];
function joyMoveTo(e) {
  const R = 44; let dx = e.clientX - joyP.cx, dy = e.clientY - joyP.cy; const n = Math.hypot(dx, dy);
  if (n > R) { dx *= R / n; dy *= R / n; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`; joyEl.classList.add('on');
  joyScreen = n < 12 ? [0, 0] : [dx / R, dy / R];
}
function applyJoy() { // 화면 위쪽 = 카메라가 보는 쪽
  const [sx, sy] = joyScreen;
  if (!joyP || (!sx && !sy)) { if (joyP) { API.joy.on = false; } return; }
  if (!active) { // 2D 거리: 비스듬한 화면 방향 → 칸 방향 (정면 보기일 땐 그 줄을 따라)
    const fv = API.fv;
    if (fv && fv.t > 0.6) { if (fv.side === 'W') { API.joy.x = sy; API.joy.y = -sx; } else { API.joy.x = -sy; API.joy.y = sx; } }
    else { const wx = sx / 16 + sy / 8, wy = sy / 8 - sx / 16, n = Math.hypot(wx, wy) || 1, m = Math.min(1, Math.hypot(sx, sy)); API.joy.x = (wx / n) * m; API.joy.y = (wy / n) * m; } // 미는 세기만큼
    API.joy.on = true; return;
  }
  const fx = -Math.sin(camS.yaw), fz = -Math.cos(camS.yaw), rx = -fz, rz = fx;
  API.joy.x = rx * sx + fx * -sy; API.joy.y = rz * sx + fz * -sy; API.joy.on = true;
}

// ---------- 낮 · 밤 · 불빛 ----------
function lightsFor(b, dark) {
  const s = b.s, st = API.townSt;
  const homeDark = s.key === 'home' && !st.lights;
  const bg = new THREE.Color(s.key === 'street' ? 0xbfe6f7 : 0xf3efe9).lerp(new THREE.Color(0x151a3c), dark);
  scene3.background = bg;
  scene3.fog = s.key === 'street' ? new THREE.Fog(bg, 40, 130) : null;
  hemi.intensity = (s.key === 'street' ? 1.15 : 1.25) - (homeDark ? 1.1 : s.key === 'street' ? 0.85 : 0.6) * dark;
  sunL.intensity = 1.3 * (1 - dark);
  facadeMats.forEach((m) => (m.emissiveIntensity = 0.95 * dark));
  // 장면 불빛 + 무드등 (가까운 8개)
  const L = [];
  for (const l of s.lights || []) if (!homeDark || l.always) L.push({ x: l.gx, y: (l.z || 30) * ZY, z: l.gy, c: l.c, a: l.a, r: (l.r || 60) / 12 });
  if (s.key === 'home') for (const f of s.furniture || []) { const md = f.kind === 'moodlamp' && (st.lamps || {})[f.id]; if (md) L.push({ x: f.x + 0.5, y: 0.9, z: f.y + 0.5, c: API.LAMP_COL[md][1], a: 1.4, r: 5 }); }
  const px = API.player.x / API.T, pz = API.player.y / API.T;
  L.sort((a, c) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(c.x - px, c.z - pz));
  b.lights.forEach((pl, i) => {
    const l = L[i];
    if (!l || dark < 0.05) { pl.intensity = 0; return; }
    const [r, g, bl] = l.c.split(',').map(Number); pl.color.setRGB(r / 255, g / 255, bl / 255, THREE.SRGBColorSpace);
    pl.position.set(l.x, l.y, l.z); pl.distance = Math.max(4, l.r); pl.intensity = 3.2 * l.a * dark;
  });
}

// ---------- 루프 ----------
const scene3 = new THREE.Scene(); scene3.add(hemi); scene3.add(sunL);
let cur = null, lastT = performance.now();
const tapRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.34, 20), new THREE.MeshBasicMaterial({ color: 0xff6b81, transparent: true, depthWrite: false }));
tapRing.rotation.x = -Math.PI / 2; scene3.add(tapRing);
const editBox = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), new THREE.MeshBasicMaterial({ color: 0xff6b81, transparent: true, opacity: 0.5 })); scene3.add(editBox);
function resize() {
  const w = gl.clientWidth, h = gl.clientHeight;
  if (gl.width !== Math.round(w * renderer.getPixelRatio()) || gl.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
}
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.max(0, Math.min(0.05, (now - lastT) / 1000)); lastT = now;
  const s = API.scene; if (!s) return;
  const want = THREE_SCENES.has(s.key); // 거리는 예전 2D (🏙️ 버튼으로 정면 보기), 집·가게 안은 3D
  if (want !== active) setActive(want);
  if (!active) return; // 거리(2D)는 예전 조작 그대로
  try {
    if (!cur || cur.s !== s) {
      if (cur) scene3.remove(cur.root);
      cur = built.get(s) || build(s); scene3.add(cur.root);
      if (!cur.camInit || lastKey !== s.key) { resetCam(s.key); camS.tx = API.player.x / API.T; camS.tz = API.player.y / API.T; cur.camInit = true; }
      lastKey = s.key;
    }
    resize(); applyJoy();
    const time = now / 1000;
    syncItems(cur, time);
    updateCamera(cur, dt);
    const tags = drawPeople(cur, time);
    fadeBlockers(cur, dt);
    lightsFor(cur, API.sky().dark);
    const tm = API.tapMark; tapRing.visible = Boolean(tm); if (tm) { tapRing.position.set(tm.x + 0.5, 0.03, tm.y + 0.5); tapRing.material.opacity = tm.t / 0.6; }
    const ed = API.editing; editBox.visible = Boolean(ed); if (ed) { editBox.scale.set(ed.w, 1, ed.h); editBox.position.set(ed.x + ed.w / 2, 0.04, ed.y + ed.h / 2); editBox.material.opacity = 0.35 + 0.25 * Math.sin(time * 8); }
    renderer.render(scene3, camera);
    // 이름표 · 말풍선
    const k = API.dprNow(), W = gl.clientWidth, H = gl.clientHeight, out = [];
    for (const t of tags) { const v = t.v.clone().project(camera); if (v.z > 1 || v.x < -1.3 || v.x > 1.3 || v.y < -1.3 || v.y > 1.3) continue; out.push({ x: (v.x * 0.5 + 0.5) * W * k, y: (-v.y * 0.5 + 0.5) * H * k, tag: t.tag, color: t.color, bub: t.bub, heart: t.fxHeart, big: t.big, a: t.a, note: t.note, gauge: t.gauge }); }
    API.overlay3D(out);
  } catch (err) { if (!loop.err) { loop.err = 1; console.error(err); } }
}
let lastKey = '';

// ---------- 2D ↔ 3D 바꾸기 (장면마다) ----------
const THREE_SCENES = new Set(['home', 'jumak', 'mart', 'lobby', 'hall', ...(/[?&]street3d\b/.test(location.search) ? ['street'] : [])]); // 거리 3D 는 ?street3d 로 미리보기만
let active = false;
const zi = document.getElementById('zoomIn'), zo = document.getElementById('zoomOut'), cr = document.getElementById('camReset');
const vb = document.getElementById('viewBtn'), tb = document.getElementById('turnBtn');
const orig = { zi: zi && zi.onclick, zo: zo && zo.onclick, cr: cr && cr.onclick };
const rotBtn = document.createElement('button'); rotBtn.type = 'button'; rotBtn.id = 'rotBtn'; rotBtn.setAttribute('aria-label', '시점 돌리기 (45도씩)'); rotBtn.innerHTML = '<img src="icons/town/turn.svg" alt="">';
rotBtn.onclick = () => { camS.tyaw += Math.PI / 4; camS.vy = 0; };
document.getElementById('camCtl')?.appendChild(rotBtn);
function setActive(on) {
  active = on;
  rotBtn.style.display = on ? '' : 'none';
  gl.style.display = on ? '' : 'none'; joyEl.style.display = on ? '' : 'none';
  ui.classList.toggle('over3d', on);
  API.joy.on = false; API.joy.x = API.joy.y = 0; ptrs.clear(); drag = null; pinch = null; joyP = null; knob.style.transform = ''; joyEl.classList.remove('on');
  if (vb) vb.style.display = on ? 'none' : '';
  if (tb) tb.style.display = on ? 'none' : '';
  if (on) {
    if (zi) zi.onclick = () => (camS.tdist /= 1.5);
    if (zo) zo.onclick = () => (camS.tdist *= 1.5);
    if (cr) { cr.hidden = false; cr.onclick = () => { camS.tyaw = baseYaw(cur?.s.key); camS.tpitch = cur && cur.s.key === 'street' ? 0.55 : 0.72; camS.tdist = (DIST[cur?.s.key] || [9])[0]; }; }
  } else {
    if (zi) zi.onclick = orig.zi; if (zo) zo.onclick = orig.zo; if (cr) { cr.onclick = orig.cr; cr.hidden = true; }
    const c2 = ui.getContext('2d'); c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, ui.width, ui.height);
    lastKey = ''; // 다시 3D 장면에 들어오면 카메라 새로
  }
}

window.T3D = { get ready() { return active; }, setActive, camS, renderer, scene3, get cur() { return cur; }, pickAt, camera };
setActive(false); // 첫 장면이 정해지면 loop 가 맞게 켬
requestAnimationFrame(loop);
