// README 스크린샷 다시 찍기 (로컬 서버 + 샘플 데이터)
// 1) SUPABASE_URL= SUPABASE_SECRET_KEY= CRON_SECRET=localtest node server.js   ← 로컬 저장소로 실행
// 2) node tools/readme_shots.mjs
import { rmSync, readdirSync } from 'node:fs';
import { openBrowser } from './cdp.mjs';

const OUT = new URL('../docs/screenshots/', import.meta.url).pathname;
const API = 'http://127.0.0.1:5500';
const j = (p, o = {}) => fetch(API + p, { headers: { 'Content-Type': 'application/json', ...(o.h || {}) }, ...o }).then((r) => r.json());

// ---- 샘플 데이터 ----
await j('/api/settings', { method: 'PUT', body: JSON.stringify({ dday: '2026-11-27T10:00:00Z', place: '우리집 (별빛)', round: 3, start_date: '2025-03-01' }) });
await j('/api/location', { method: 'POST', body: JSON.stringify({ avatar: 'girl', name: '지민', area: '서울특별시 마포구', lat: 37.56, lng: 126.92 }) });
await j('/api/location', { method: 'POST', body: JSON.stringify({ avatar: 'boy', name: '준호', area: '대구광역시 달빛구', lat: 35.87, lng: 128.6 }) });
await j('/api/location', { method: 'POST', body: JSON.stringify({ avatar: 'boy', name: '준호', area: '대전광역시 별빛구', lat: 36.36, lng: 127.36 }) }); // 가까워진 상태
const menus = (await j('/api/menus')).menus;
if (menus.length && !menus[1].memo) await j(`/api/menus/${menus[1].id}`, { method: 'PATCH', body: JSON.stringify({ name: menus[1].name, memo: '두부는 바삭하게!' }) });
for (const [food, msg, st, name, av, n] of [
  [['🥩 무화과 스테이크'], '이번엔 내가 요리할게!', '🌹', '준호', 'boy', 0],
  [['🍝 토마토 미트볼', '🥓 삼겹살말이 두부부침'], '한 달 동안 너무 보고 싶었어', '💖', '지민', 'girl', 3],
]) await j('/api/responses', { method: 'POST', body: JSON.stringify({ foods: food, message: msg, sticker: st, noAttempts: n, profileName: name, profileAvatar: av }) });
const had = (await j('/api/recipes')).recipes;
if (!had.some((r) => r.title === '일요일의 비빔밥')) {
  await j('/api/recipes', { method: 'POST', body: JSON.stringify({ title: '일요일의 비빔밥', category: '한식', minutes: 25, servings: 2, favorite: true,
    ingredients: '밥 2공기\n계란 2개\n시금치·콩나물·당근\n고추장 2큰술\n참기름 1큰술', steps: '1. 나물을 데쳐 무친다\n2. 계란 프라이를 한다\n3. 밥 위에 나물·계란을 올리고 고추장·참기름으로 비빈다', memo: '참기름은 넉넉하게! 다음엔 소고기 볶음도 추가' }) });
}
if (had.length < 4) {
  for (const [t, c, m, s] of [['금요일 마르게리타 피자', '양식', 40, 4], ['엄마의 김치찌개', '한식', 40, 3], ['혼밥 돈코츠 라멘', '일식', 75, 2], ['아침 계란말이', '한식', 15, 2], ['간장 양념 치킨', '한식', 45, 3]])
    await j('/api/recipes', { method: 'POST', body: JSON.stringify({ title: t, category: c, minutes: m, servings: s }) });
}

// ---- 촬영 (README 용 · 이름·위치는 모두 예시) ----
for (const f of readdirSync(OUT)) if (f.endsWith('.png')) rmSync(OUT + f);
const b = await openBrowser();
const go = (expr, ms = 1200) => b.js(`(${expr}, new Promise(r => setTimeout(r, ${ms})))`);
const top = () => b.js('window.scrollTo(0,0); true');

await b.device(390, 844);
await b.geo(37.56, 126.92); // 예시 위치로 고정 (이 컴퓨터의 진짜 위치를 쓰지 않게)
await b.load({ skipIntro: false });
await b.sleep(1500);
await b.js("localStorage.setItem('kk_profile', JSON.stringify({ name: '지민', avatar: 'girl' })); true");
await b.load(); await b.sleep(1500); await top();
await b.shot(OUT + '01-home.png');
await go('handleAttend()', 4800); await top();
await b.shot(OUT + '02-agenda.png');
await go("document.querySelector('#menuList').scrollIntoView({block:'start'})", 800);
await b.shot(OUT + '03-agenda-menu.png');
await go('scrollToRecipes()', 1200);
await b.shot(OUT + '04-agenda-recipes.png');
await go('(userMsg.value = "금요일에 만나!", submitAgenda())', 4500);
await b.shot(OUT + '05-submitted.png');
await go('(closeModal(), showHistory())', 1500); await top();
await b.shot(OUT + '06-history.png');
// 대화하기: 예시 대화 (실제 대화 아님)
const now = Date.now();
const talk = [
  ['user', '오늘 뭐해?'], ['model', '뭐하긴~\n방금 운동 끝났어\n너는 점심 먹었어?'],
  ['user', '나 오늘 너무 피곤해ㅠㅠ'], ['model', '에고 ㅠㅠ\n오늘 고생 많았네\n이따 전화할까?'],
  ['user', '주말에 뭐 먹을까?'], ['model', '음 고기?\n아니면 너 좋아하는 파스타'],
].map(([role, text], i) => ({ role, text, at: now - (6 - i) * 60e3 }));
await b.js(`localStorage.setItem('kk_talk', ${JSON.stringify(JSON.stringify(talk))}); true`);
await b.load({ path: '?view=talk' }); await b.sleep(1800);
await b.shot(OUT + '07-talk.png');
await go('openMenu()', 800);
await b.shot(OUT + '08-side-menu.png');

const rid = (await j('/api/recipes')).recipes.find((r) => r.title === '일요일의 비빔밥').id;
// ---- 우리 동네 (낮 13시로 고정 · ?t=13) ----
await j('/api/town/state', { method: 'POST', body: JSON.stringify({ me: 'girl', op: 'buy', items: { rice: 2, egg: 2, spinach: 1, bean: 1, carrot: 2, gochujang: 1, sesame: 1, chicken: 2, porkbelly: 1, salmon: 1, onion: 2, garlic: 1, tomato: 2, apple: 2, milk: 1, butter: 1, cheese: 1, tofu: 1, ramen: 2, soju: 2, beer: 2, wine: 1 } }) });
const town = async (scene, ms = 5500) => { await b.load({ path: `town.html?as=girl&scene=${scene}&t=13` }); await b.sleep(ms); await b.js("document.getElementById('modal').hidden = true; document.getElementById('say') && (document.getElementById('say').hidden = true); true"); };
const T = (expr, ms = 1500) => b.js(`(window.__town.${expr}, new Promise(r => setTimeout(r, ${ms})))`);
await town('street');
await T('setZoom(0.75)', 800); await T('scene && (window.__town.player.x = 10.5 * 16, window.__town.player.y = 22 * 16)', 1200);
await b.shot(OUT + '09-town-street.png');
await T('setTilt(1)', 2500);
await b.shot(OUT + '10-town-front.png');
await town('yunseul');
await T('setZoom(0.7)', 600); await T('scene && (window.__town.player.x = 10.5 * 16, window.__town.player.y = 14 * 16)', 1500);
await b.shot(OUT + '11-town-station.png');
await town('beach');
await T('setZoom(0.75)', 600); await T('scene && (window.__town.player.x = 20.5 * 16, window.__town.player.y = 24 * 16)', 2000);
await b.shot(OUT + '12-town-beach.png');
await town('home', 7000);
await b.shot(OUT + '13-town-home.png');
await T('openFridge()', 1800);
await b.shot(OUT + '14-town-fridge.png');
await T('openCook()', 2500);
await b.shot(OUT + '15-town-recipe-note.png');
await T(`openCook('${rid}')`, 2500);
await b.shot(OUT + '16-town-cook-start.png');
await b.js("document.getElementById('cookGo') && document.getElementById('cookGo').click(); true"); await b.sleep(2500);
await b.shot(OUT + '17-town-cook-game.png');
await b.js("document.getElementById('modal').hidden = true; true");
await T('openPet()', 2500);
await b.shot(OUT + '18-town-pet.png');
await b.close();
console.log('done');
