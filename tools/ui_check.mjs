// 화면 동작 확인 (로컬 서버): 메뉴 동기화 · 프로필 공유 · 동네 표시 · 새 레시피 버튼
// node tools/ui_check.mjs [스크린샷 폴더]
import { openBrowser } from './cdp.mjs';
const API = 'http://127.0.0.1:5500';
const OUT = process.argv[2] || '/tmp';
const j = (p, o = {}) => fetch(API + p, { headers: { 'Content-Type': 'application/json' }, ...o }).then((r) => r.json());
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) process.exitCode = 1; };

await j('/api/location', { method: 'POST', body: JSON.stringify({ avatar: 'girl', name: '지민', area: '하늘구 구름동', lat: 37.48, lng: 126.99 }) });
await j('/api/location', { method: 'POST', body: JSON.stringify({ avatar: 'boy', name: '자기', area: '달빛구 물결동', lat: 35.87, lng: 128.6 }) });
await j('/api/profile', { method: 'PUT', body: JSON.stringify({ avatar: 'boy', name: '자기' }) });

const b = await openBrowser();
await b.device(390, 844);
await b.load();
await b.js(`localStorage.setItem('kk_profile', JSON.stringify({name:'지민', avatar:'girl'})); true`);
await b.load(); await b.sleep(1500);
await b.js('window.skipIntro && window.skipIntro(); true'); await b.sleep(1200);
const label = await b.js(`document.getElementById('distanceLabel').innerText`);
ok(/男 .+(동|읍|면)/.test(label) && /女 .+(동|읍|면)/.test(label), `홈 거리 막대 동네 표시: ${label.replace(/\n/g, ' / ')}`);
await b.shot(`${OUT}/home.png`);

// 이 폰(지민)의 프로필이 서버에 자동 등록됐는지
const prof = await j('/api/profile');
ok(prof.profiles.girl?.name === '지민', `내 프로필 서버 공유: ${JSON.stringify(prof.profiles)}`);

// 메뉴 화면 보는 중에 "상대방"이 메뉴 추가 → 5초 안에 보이는지
await b.js(`showPage('page2'); true`); await b.sleep(1500);
const { menu } = await j('/api/menus', { method: 'POST', body: JSON.stringify({ name: '상대방이 추가한 메뉴', memo: '' }) });
await b.sleep(6500);
ok(await b.js(`document.getElementById('menuList').innerText.includes('상대방이 추가한 메뉴')`), '상대방이 추가한 메뉴가 내 화면에 자동 반영');
await j(`/api/menus/${menu.id}`, { method: 'DELETE' });
await b.sleep(6500);
ok(!(await b.js(`document.getElementById('menuList').innerText.includes('상대방이 추가한 메뉴')`)), '상대방이 삭제한 메뉴가 내 화면에서도 사라짐');

// 프로필 화면: 우리 둘 + 내 동네
await b.js(`showPage('pageSettings'); true`); await b.sleep(1500);
const pair = await b.js(`document.getElementById('profilePair').innerText`);
ok(/자기/.test(pair) && /지민/.test(pair), `우리 둘: ${pair.replace(/\n/g, ' ')}`);
const loc = await b.js(`document.getElementById('locationStatus').innerText`);
ok(/[가-힣]+(구|군|시) [가-힣0-9]+(동|읍|면)/.test(loc), `내 위치 칸: ${loc}`);
await b.shot(`${OUT}/profile.png`, { full: true });

// 이름 바꾸면 예전 의결서 이름도
const { response } = await j('/api/responses', { method: 'POST', body: JSON.stringify({ foods: ['검증'], profileName: '지민', profileAvatar: 'girl' }) });
await b.js(`document.getElementById('profileName').value='지민공주'; saveProfile(); true`); await b.sleep(1500);
await b.js(`showHistory(); true`); await b.sleep(1500);
const card = await b.js(`document.querySelector('.history-card[data-id="${response.id}"] .history-author-text b')?.innerText`);
ok(card === '지민공주', `예전 의결서 이름 → ${card}`);
const raw = (await j('/api/responses')).responses.find((r) => r.id === response.id);
ok(raw.profile_name === '지민공주', `DB에 저장된 이름도 변경: ${raw.profile_name}`);
await j(`/api/responses/${response.id}`, { method: 'DELETE' });

// 레시피 노트: 새 레시피(돋보기) 버튼
await b.js(`showPage('pageRecipes'); true`); await b.sleep(1200);
ok(await b.js(`document.querySelector('.chat-open img').src.endsWith('search.svg')`), '새 레시피 찾기 버튼 = 돋보기 아이콘');
await b.shot(`${OUT}/recipes.png`);
await b.close();
