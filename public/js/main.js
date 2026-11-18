// ===== 앱 디자인 확인·안내 창 (기본 confirm/alert 대신) =====
// uiConfirm('이 의결서를 삭제할까요?', { sub: '되돌릴 수 없어요', ok: '삭제', danger: true }) → Promise<boolean>
let dialogQueue = Promise.resolve();
function showDialog({ title = '', message = '', sub = '', ok = '확인', cancel = '', danger = false, icon = 'bell' }) {
  const run = () => new Promise((resolve) => {
    const box = document.getElementById('uiDialog');
    const okBtn = document.getElementById('uiDialogOk');
    const cancelBtn = document.getElementById('uiDialogCancel');
    document.getElementById('uiDialogIco').src = `icons/doodle/${icon}.svg`;
    document.getElementById('uiDialogTitle').textContent = title;
    document.getElementById('uiDialogTitle').hidden = !title;
    const msg = document.getElementById('uiDialogMsg');
    msg.textContent = message;
    if (sub) { const s = document.createElement('span'); s.className = 'sub'; s.textContent = sub; msg.appendChild(s); }
    okBtn.textContent = ok;
    cancelBtn.textContent = cancel || '취소';
    cancelBtn.hidden = !cancel;
    box.classList.toggle('danger', danger);
    box.hidden = false;
    const done = (v) => {
      box.hidden = true;
      okBtn.onclick = cancelBtn.onclick = box.onclick = null;
      document.removeEventListener('keydown', onKey);
      resolve(v);
    };
    const onKey = (e) => { if (e.key === 'Escape') done(false); if (e.key === 'Enter') { e.preventDefault(); done(true); } };
    okBtn.onclick = () => done(true);
    cancelBtn.onclick = () => done(false);
    box.onclick = (e) => { if (e.target === box) done(false); }; // 바깥 누르면 취소
    document.addEventListener('keydown', onKey);
    setTimeout(() => okBtn.focus({ preventScroll: true }), 30);
  });
  const p = dialogQueue.then(run);
  dialogQueue = p.catch(() => {});
  return p;
}
const uiConfirm = (message, o = {}) => showDialog({ message, ok: o.ok || '확인', cancel: o.cancel || '취소', icon: o.icon || (o.danger ? 'trash' : 'bell'), title: o.title || '', sub: o.sub || '', danger: !!o.danger });
const uiAlert = (message, o = {}) => showDialog({ message, ok: '확인', icon: o.icon || 'bell', title: o.title || '', sub: o.sub || '' });

// ===== 인트로(로딩) 비디오 =====
(function setupIntro() {
  const overlay = document.getElementById('introOverlay');
  const video = document.getElementById('introVideo');
  const skipBtn = document.getElementById('introSkip');
  const soundBtn = document.getElementById('introSound');
  const startScreen = document.getElementById('introStart');
  const progress = document.getElementById('introProgress');
  let finished = false;

  window.skipIntro = () => finishIntro();

  // 인트로는 앱을 처음 열 때 한 번만. 뒤로가기로 예전 화면이 다시 열리거나, 새로고침·업데이트로
  // 다시 불러온 경우에는 건너뜀 (예전엔 이때마다 인트로가 전체 화면으로 다시 떴음)
  const navType = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]?.type) || 'navigate';
  let seen = false;
  try { seen = sessionStorage.getItem('kk_intro_seen') === '1'; sessionStorage.setItem('kk_intro_seen', '1'); } catch {}
  if (seen || navType !== 'navigate' || new URLSearchParams(location.search).get('view')) {
    finished = true;
    video.removeAttribute('autoplay');
    video.pause();
    overlay.remove();
    document.body.classList.remove('intro-active');
    return;
  }

  function finishIntro() {
    if (finished) return;
    finished = true;
    overlay.classList.add('hide');
    document.body.classList.remove('intro-active');
    setTimeout(() => {
      video.pause();
      overlay.remove();
    }, 800);
  }

  video.addEventListener('ended', finishIntro);
  video.addEventListener('error', finishIntro); // 비디오 못 읽으면 바로 본편으로
  const sources = video.querySelectorAll('source');
  if (sources.length) sources[sources.length - 1].addEventListener('error', finishIntro);
  video.addEventListener('timeupdate', () => {
    if (video.duration) progress.style.width = (video.currentTime / video.duration) * 100 + '%';
  });

  skipBtn.addEventListener('click', finishIntro);

  // 화면 아무 데나 터치하면 넘어가기 (소리 버튼만 예외)
  overlay.addEventListener('click', (e) => {
    if (e.target.closest('#introSound')) return;
    finishIntro();
  });

  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.muted = !video.muted;
    soundBtn.innerHTML = video.muted ? '<img class="ico" src="icons/doodle/sound-off.svg" alt=""> 소리 켜기' : '<img class="ico" src="icons/doodle/sound-on.svg" alt=""> 소리 끄기';
  });

  // 자동재생이 막힌 환경(저전력 모드 등)이면 "눌러서 열기" 화면 표시
  const tryPlay = video.play();
  if (tryPlay && tryPlay.catch) {
    tryPlay.catch(() => {
      startScreen.classList.add('show');
      startScreen.addEventListener('click', (e) => {
        e.stopPropagation(); // 이 터치는 "재생 시작"용 (넘기기 아님)
        startScreen.classList.remove('show');
        video.muted = false;
        soundBtn.innerHTML = '<img class="ico" src="icons/doodle/sound-on.svg" alt=""> 소리 끄기';
        video.play().catch(finishIntro);
      }, { once: true });
    });
  }

  // 안전장치: 어떤 이유로든 15초 넘게 멈춰 있으면 본편으로
  setTimeout(() => { if (!startScreen.classList.contains('show')) finishIntro(); }, 15000);
})();

// ===== 배경 하트 =====
const bgHeartsContainer = document.getElementById('bgHearts');
const heartSymbols = ['heart', 'hearts', 'blossom', 'sparkle', 'heart'];
for (let i = 0; i < 15; i++) {
  const heart = document.createElement('div');
  heart.className = 'bg-heart';
  heart.innerHTML = `<img src="icons/doodle/${heartSymbols[Math.floor(Math.random() * heartSymbols.length)]}.svg" alt="" width="22" height="22">`;
  heart.style.left = Math.random() * 100 + 'vw';
  heart.style.animationDuration = (Math.random() * 6 + 8) + 's';
  heart.style.animationDelay = (Math.random() * 5) + 's';
  bgHeartsContainer.appendChild(heart);
}

// ===== 불참 버튼 도망 =====
const noBtn = document.getElementById('noBtn');
const noMessages = [
  '불참 불가! <img class="ico" src="icons/doodle/blush.svg" alt="">',
  '어라? 손이 미끄러졌나?',
  '롱디 커플 불참 금지!',
  '한 달에 한 번인데? <img class="ico" src="icons/doodle/drop.svg" alt="">',
  '참석 누르기! <img class="ico" src="icons/doodle/hearts.svg" alt="">'
];

let noAttempts = 0; // 불참 시도 횟수 (응답과 함께 저장)

function moveNoButton() {
  noAttempts++;
  // 화면 폭(Z폴드 커버 ~344px ~ 펼친 화면 ~880px)에 맞춰 도망 범위를 조절해서 화면 밖으로 안 나가게
  const box = document.getElementById('mainContainer').getBoundingClientRect();
  const rangeX = Math.max(60, Math.min(240, box.width - noBtn.offsetWidth - 40));
  const rangeY = Math.min(110, window.innerHeight * 0.12);
  const randomX = (Math.random() - 0.5) * rangeX;
  const randomY = (Math.random() - 0.5) * rangeY;
  noBtn.style.transform = `translate(${randomX}px, ${randomY}px)`;
  noBtn.innerHTML = noMessages[Math.floor(Math.random() * noMessages.length)];
}

// 폴드를 접거나 펼쳐서 화면 크기가 바뀌면 불참 버튼 제자리로
window.addEventListener('resize', () => { noBtn.style.transform = ''; });

noBtn.addEventListener('mouseenter', moveNoButton);
noBtn.addEventListener('click', moveNoButton);
noBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  moveNoButton();
});

// ===== 참석 클릭 =====
function handleAttend() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ff6b81', '#ff4757', '#ffd700', '#ffffff']
  });

  setTimeout(() => showPage('page2'), 400);
}

// ===== D-day 타이머 (설정한 디데이 기준 자동 카운트) =====
let timerHandle = null;

function startDdayTimer() {
  const el = document.getElementById('ddayTimer');
  const pad = (n) => String(n).padStart(2, '0');

  function updateTimer() {
    const target = new Date(appSettings.dday);
    const now = new Date();
    const diff = target - now;
    const sameDay = target.toDateString() === now.toDateString();

    if (diff <= 0) {
      el.innerHTML = sameDay ? `D-DAY! 오늘 만나는 날 ${ico('sparkle')}` : `이번 월례 끝! ☰ → 설정에서 다음 날짜를 정해주세요`;
      return;
    }
    const days = Math.floor(diff / 864e5);
    const hours = Math.floor((diff / 36e5) % 24);
    const mins = Math.floor((diff / 6e4) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    const label = sameDay ? 'D-DAY' : `D-${Math.max(days, 1)}`;
    el.innerText = `${label} (${pad(hours)}:${pad(mins)}:${pad(secs)})`;
  }

  clearInterval(timerHandle);
  updateTimer();
  timerHandle = setInterval(updateTimer, 1000);
}

// ===== API 공통 =====
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    cache: 'no-store',
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || data.ok === false) throw new Error(data.error || '서버와 연결이 안 돼요. 와이파이를 확인해주세요.');
  return data;
}

// ===== 메뉴 목록 (복수 선택 · 추가 ＋ · 삭제 － · 수정 ✏️ · 요청사항 메모) =====
const ico = (name, cls = 'ico') => `<img class="${cls}" src="icons/doodle/${name}.svg" alt="">`;
const menuListEl = document.getElementById('menuList');   // 식사 메뉴
const drinkListEl = document.getElementById('drinkList'); // 주류 및 음료
const kindOf = (m) => (m.kind === 'drink' ? 'drink' : 'food');
let menus = [];
let menuDragging = false;
const selectedMenuIds = new Set();
let menuTouched = false; // 사용자가 직접 고른 적이 없으면 첫 메뉴를 기본 선택
let editingMenuId = null;

function renderMenus() {
  for (const id of [...selectedMenuIds]) if (!menus.some(m => m.id === id)) selectedMenuIds.delete(id);
  const foods = menus.filter(m => kindOf(m) === 'food');
  if (!menuTouched && !selectedMenuIds.size && foods.length) selectedMenuIds.add(foods[0].id);
  renderMenuList(menuListEl, foods, '식사 메뉴가 없어요. 아래에서 ＋로 추가해주세요!');
  renderMenuList(drinkListEl, menus.filter(m => kindOf(m) === 'drink'), '주류·음료가 없어요. 아래에서 ＋로 추가해 보세요!');
}

function renderMenuList(listEl, list, emptyText) {
  if (!list.length) {
    listEl.innerHTML = `<div class="menu-status">${emptyText}</div>`;
    return;
  }
  listEl.innerHTML = '';
  list.forEach(menu => {
    const row = document.createElement('div');
    const on = selectedMenuIds.has(menu.id);
    row.className = 'option-item' + (on ? ' checked' : '');
    row.dataset.id = menu.id;

    if (menu.id === editingMenuId) {
      row.classList.add('editing');
      row.innerHTML = `
        <div class="menu-edit-fields">
          <input type="text" class="menu-edit-input" maxlength="40" value="${escapeHtml(menu.name)}" aria-label="메뉴 이름">
          <input type="text" class="menu-edit-input memo" maxlength="100" value="${escapeHtml(menu.memo || '')}" placeholder="요청사항 메모 (선택사항)" aria-label="요청사항 메모">
        </div>
        <button type="button" class="icon-btn save" aria-label="저장">${ico('check')}</button>
        <button type="button" class="icon-btn" aria-label="취소">${ico('close')}</button>`;
      const [nameIn, memoIn] = row.querySelectorAll('input');
      const [saveBtn, cancelBtn] = row.querySelectorAll('button');
      const save = () => saveMenu(menu.id, nameIn.value, memoIn.value);
      saveBtn.onclick = save;
      cancelBtn.onclick = () => { editingMenuId = null; renderMenus(); };
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { editingMenuId = null; renderMenus(); }
      });
      listEl.appendChild(row);
      setTimeout(() => { nameIn.focus(); nameIn.select(); }, 0);
      return;
    }

    row.innerHTML = `
      <label class="option-label">
        <input type="checkbox" name="food" value="${escapeHtml(menu.name)}" ${on ? 'checked' : ''}>
        <span class="check-box" aria-hidden="true">${on ? ico('check') : ''}</span>
        <span class="option-text">${escapeHtml(menu.name)}${menu.memo ? `<small class="menu-memo">${ico('pencil')} ${escapeHtml(menu.memo)}</small>` : ''}</span>
      </label>
      <button type="button" class="icon-btn" aria-label="메뉴 수정">${ico('pencil')}</button>
      <button type="button" class="icon-btn remove" aria-label="메뉴 삭제">${ico('minus')}</button>`;
    row.querySelector('input').onchange = (e) => {
      menuTouched = true;
      if (e.target.checked) selectedMenuIds.add(menu.id); else selectedMenuIds.delete(menu.id);
      renderMenus();
    };
    const [editBtn, delBtn] = row.querySelectorAll('.icon-btn');
    editBtn.onclick = () => { editingMenuId = menu.id; renderMenus(); };
    delBtn.onclick = () => deleteMenu(menu);
    listEl.appendChild(row);
  });
}

async function loadMenus({ quiet = false } = {}) {
  try {
    const next = (await api('/api/menus')).menus;
    // 수정 중이거나 바뀐 게 없으면 다시 그리지 않음
    if (quiet && (editingMenuId || menuDragging || JSON.stringify(next) === JSON.stringify(menus))) return;
    menus = next;
    renderMenus();
  } catch (e) {
    if (quiet) return;
    menuListEl.innerHTML = `<div class="menu-status">${escapeHtml(e.message)} <button type="button" class="retry-btn" onclick="loadMenus()">다시 시도</button></div>`;
  }
}

async function saveMenu(id, name, memo = '') {
  name = name.trim();
  if (!name) return uiAlert('메뉴 이름을 적어주세요.', { icon: 'pencil' });
  try {
    const { menu } = await api(`/api/menus/${id}`, { method: 'PATCH', body: JSON.stringify({ name, memo: memo.trim() }) });
    menus = menus.map(m => (m.id === id ? menu : m));
    editingMenuId = null;
    renderMenus();
  } catch (e) {
    uiAlert(e.message);
    loadMenus();
  }
}

async function deleteMenu(menu) {
  if (!(await uiConfirm(`"${menu.name}" 메뉴를 삭제할까요?`, { title: '메뉴 삭제', ok: '삭제', danger: true, sub: '상대방 화면에서도 같이 지워져요' }))) return;
  try {
    await api(`/api/menus/${menu.id}`, { method: 'DELETE' });
  } catch (e) {
    uiAlert(e.message);
  }
  loadMenus();
}

// 메뉴 추가: 식사(menuAddForm) / 주류·음료(drinkAddForm)
for (const [formId, kind] of [['menuAddForm', 'food'], ['drinkAddForm', 'drink']]) {
  const form = document.getElementById(formId);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const input = form.querySelector('.menu-name-input');
    const memoIn = form.querySelector('.menu-memo-input');
    const name = input.value.trim();
    if (!name) return input.focus();
    try {
      const { menu } = await api('/api/menus', { method: 'POST', body: JSON.stringify({ name, memo: memoIn.value.trim(), kind }) });
      menuTouched = true;
      selectedMenuIds.add(menu.id); // 방금 추가한 메뉴도 선택
      input.value = '';
      memoIn.value = '';
      await loadMenus(); // 상대방이 그 사이 추가·삭제한 것까지 같이 반영
    } catch (err) {
      uiAlert(err.message);
    }
  });
}

// ----- 메뉴를 꾹 눌러서(0.45초) 위아래로 옮기기: 순서는 서버에 저장되어 상대방 화면에도 반영 -----
function setupMenuDrag(listEl) {
  let timer = null, row = null, startX = 0, startY = 0, active = false, suppressClick = false;
  const reset = () => { clearTimeout(timer); timer = null; };
  listEl.addEventListener('pointerdown', (e) => {
    const r = e.target.closest('.option-item');
    if (!r || r.classList.contains('editing') || e.target.closest('.icon-btn') || listEl.querySelectorAll('.option-item').length < 2) return;
    row = r; startX = e.clientX; startY = e.clientY;
    reset();
    timer = setTimeout(() => {
      active = true; menuDragging = true;
      row.classList.add('dragging');
      listEl.classList.add('drag-on');
      if (navigator.vibrate) navigator.vibrate(15);
    }, 450);
  });
  listEl.addEventListener('pointermove', (e) => {
    if (!row) return;
    if (!active) {
      if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) { reset(); row = null; } // 스크롤하려는 것
      return;
    }
    // 손가락이 다른 메뉴의 가운데를 넘으면 자리 바꾸기
    const rows = [...listEl.querySelectorAll('.option-item')].filter(x => x !== row);
    const before = rows.find(x => { const b = x.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
    if (before) { if (row.nextElementSibling !== before) listEl.insertBefore(row, before); }
    else if (listEl.lastElementChild !== row) listEl.appendChild(row);
  });
  // 끄는 동안에는 화면이 스크롤되지 않게
  listEl.addEventListener('touchmove', (e) => { if (active) e.preventDefault(); }, { passive: false });
  const finish = async () => {
    reset();
    if (!active) { row = null; return; }
    active = false;
    row.classList.remove('dragging');
    listEl.classList.remove('drag-on');
    row = null;
    suppressClick = true; setTimeout(() => (suppressClick = false), 350);
    const ids = [...listEl.querySelectorAll('.option-item')].map(x => x.dataset.id);
    const order = new Map(ids.map((id, i) => [id, i]));
    menus = [...menus].sort((a, b) => (order.has(a.id) && order.has(b.id) ? order.get(a.id) - order.get(b.id) : 0));
    try {
      const data = await api('/api/menus/order', { method: 'PUT', body: JSON.stringify({ ids }) });
      menus = data.menus;
    } catch (err) { uiAlert(err.message); }
    menuDragging = false;
    renderMenus();
  };
  listEl.addEventListener('pointerup', finish);
  listEl.addEventListener('pointercancel', finish);
  listEl.addEventListener('contextmenu', (e) => { if (row || active) e.preventDefault(); });
  // 옮긴 직후 손을 뗄 때 체크가 바뀌지 않게
  listEl.addEventListener('click', (e) => { if (suppressClick) { e.preventDefault(); e.stopPropagation(); } }, true);
}
setupMenuDrag(menuListEl);
setupMenuDrag(drinkListEl);

loadMenus();
// 상대방이 추가·수정·삭제한 메뉴도 보이도록: 안건 화면을 보고 있는 동안 5초마다, 앱으로 돌아올 때마다 새로고침
const onAgenda = () => document.getElementById('page2')?.style.display === 'flex' && document.visibilityState === 'visible';
setInterval(() => { if (onAgenda()) loadMenus({ quiet: true }); }, 5000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { loadMenus({ quiet: true }); refreshProfiles(); refreshHintBadge(); }
});

// ===== 등록 내역 확인 =====
let historyReturnPage = 'page1';

let lastSubmittedId = null;

function showHistory(highlightId) {
  showPage('page3', { state: { highlight: highlightId || null } });
}

async function loadHistory(highlightId) {
  const listEl = document.getElementById('historyList');
  const countEl = document.getElementById('historyCount');
  listEl.innerHTML = '<div class="menu-status">불러오는 중...</div>';
  countEl.textContent = '';

  try {
    const { responses } = await api('/api/responses');
    countEl.textContent = `지금까지 ${responses.length}건의 의결서가 등록됐어요 · 회차를 눌러 펼쳐보세요`;
    if (!responses.length) {
      listEl.innerHTML = `<div class="menu-status">아직 등록된 의결서가 없어요 ${ico('letter')}</div>`;
      return;
    }
    const hl = highlightId || lastSubmittedId;
    const card = r => `
      <div class="agenda-card history-card${r.id === hl ? ' latest' : ''}" data-id="${escapeHtml(r.id)}">
        <button type="button" class="card-delete" aria-label="이 의결서 삭제" onclick="deleteResponse('${escapeHtml(r.id)}', this)">✕</button>
        <div class="history-author">
          ${avatarHtml(r.profile_avatar)}
          <div class="history-author-text">
            <b>${escapeHtml(displayName(r))}</b>
            <span>${escapeHtml(new Date(r.created_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }))}</span>
          </div>
        </div>
        <div class="history-food">${ico('plate')} ${escapeHtml(r.food)}</div>
        ${r.drinks ? `<div class="history-food">${ico('wine')} ${escapeHtml(r.drinks)}</div>` : ''}
        ${r.message ? `<div class="history-msg">${ico('chat')} ${escapeHtml(r.message)} ${stickerIco(r.sticker)}</div>` : `<div class="history-msg muted">${stickerIco(r.sticker)} 메시지 없음</div>`}
        <span class="history-tag">${r.no_attempts ? `불참 버튼 ${r.no_attempts}번 시도 ${ico('blush')}` : `망설임 없이 참석 ${ico('hearts')}`}</span>
      </div>`;

    // 회차별로 묶기 (최신 회차가 위, 회차 없는 예전 기록은 맨 아래)
    const groups = new Map();
    responses.forEach(r => {
      const key = r.round ? Number(r.round) : 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const keys = [...groups.keys()].sort((a, b) => (a === 0) - (b === 0) || b - a);
    const openKey = hl && responses.find(r => r.id === hl) ? (Number(responses.find(r => r.id === hl).round) || 0) : keys[0];

    listEl.innerHTML = keys.map(k => {
      const items = groups.get(k);
      const last = new Date(items[0].created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
      return `
      <details class="round-group"${k === openKey ? ' open' : ''}>
        <summary>
          <span class="round-title">${k ? `제 ${k}차 월례` : '회차 기록 없음'}</span>
          <span class="round-meta">${items.length}건 · ${escapeHtml(last)}</span>
          <span class="round-chevron" aria-hidden="true">›</span>
        </summary>
        <div class="round-items">${items.map(card).join('')}</div>
      </details>`;
    }).join('');
  } catch (e) {
    listEl.innerHTML = `<div class="menu-status">${escapeHtml(e.message)}</div>`;
  }
}

// 테스트용·실수로 등록한 의결서 삭제
async function deleteResponse(id, btn) {
  const card = btn.closest('.history-card');
  const who = card.querySelector('.history-author-text b')?.textContent || '';
  const food = card.querySelector('.history-food')?.textContent.trim() || '';
  if (!(await uiConfirm(`${who} · ${food}`, { title: '이 의결서를 삭제할까요?', ok: '삭제', danger: true, sub: '삭제하면 되돌릴 수 없어요' }))) return;

  btn.disabled = true;
  try {
    await api(`/api/responses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    btn.disabled = false;
    if (!/이미 삭제/.test(e.message)) return uiAlert(e.message);
  }

  // 화면에서 바로 빼고, 회차 묶음 건수와 전체 건수 갱신
  const group = card.closest('.round-group');
  card.classList.add('removing');
  setTimeout(() => {
    card.remove();
    if (group) {
      const left = group.querySelectorAll('.history-card').length;
      if (!left) group.remove();
      else {
        const meta = group.querySelector('.round-meta');
        meta.textContent = meta.textContent.replace(/^\d+건/, `${left}건`);
      }
    }
    const total = document.querySelectorAll('#historyList .history-card').length;
    document.getElementById('historyCount').textContent = total
      ? `지금까지 ${total}건의 의결서가 등록됐어요 · 회차를 눌러 펼쳐보세요`
      : '';
    if (!total) document.getElementById('historyList').innerHTML = `<div class="menu-status">아직 등록된 의결서가 없어요 ${ico('letter')}</div>`;
  }, 250);
}

function hideHistory() { goBack(); }

// 맨 처음 화면(참석/불참)으로
function goHome() {
  noBtn.style.transform = '';
  noBtn.innerHTML = `불참 ${ico('heart-broken')}`;
  showPage('page1');
}

// ===== 스티커 선택 =====
function selectSticker(btn) {
  document.querySelectorAll('.sticker-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

const STICKER_ICO = { '💖': 'heart', '🥰': 'blush', '🌹': 'rose', '🎁': 'gift' };
function stickerIco(st) { return STICKER_ICO[st] ? ico(STICKER_ICO[st]) : escapeHtml(st || ''); }

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ===== 의결 제출 (서버에 응답 저장) =====
async function submitAgenda() {
  // 프로필(이름·캐릭터)이 없으면 먼저 정하고, 저장하면 이어서 제출
  if (!myProfile) {
    openProfile('의결서에 남길 프로필을 먼저 정해주세요', submitAgenda);
    return;
  }

  const submitBtn = document.querySelector('.submit-btn');
  const foods = menus.filter(m => kindOf(m) === 'food' && selectedMenuIds.has(m.id)).map(m => m.name);
  const drinks = menus.filter(m => kindOf(m) === 'drink' && selectedMenuIds.has(m.id)).map(m => m.name);
  if (!foods.length) return uiAlert('식사 메뉴를 하나 이상 골라주세요!', { sub: '없으면 ＋로 추가할 수 있어요', icon: 'plate' });
  const selectedFood = foods.join(' · ');
  const userMsg = document.getElementById('userMsg').value;
  const sticker = document.querySelector('.sticker-btn.selected')?.dataset.sticker || '';

  submitBtn.disabled = true;
  submitBtn.innerHTML = `의결서 전달 중... ${ico('letter')}`;

  try {
    const { response } = await api('/api/responses', {
      method: 'POST',
      body: JSON.stringify({
        foods, drinks, message: userMsg, sticker, noAttempts,
        endpoint: await myPushEndpoint(),
        profileName: myProfile.name, profileAvatar: myProfile.avatar,
      }),
    });
    lastSubmittedId = response.id;
  } catch (e) {
    uiAlert(e.message, { title: '의결서 전달에 실패했어요', icon: 'heart-broken' });
    return;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `안건 최종 의결 및 확정 ${ico('sparkle')}`;
  }

  let descHtml = `<strong>[선택 안건]</strong> 메뉴: ${escapeHtml(selectedFood)}<br>${drinks.length ? `주류·음료: ${escapeHtml(drinks.join(' · '))}<br>` : ''}`;
  if (userMsg.trim() !== '') {
    descHtml += `${ico('chat')} "${escapeHtml(userMsg)}" ${stickerIco(sticker)}<br>`;
  }
  descHtml += `<br>제 ${appSettings.round}차 롱디's 월례 체결이 완료되었습니다! ${ico('hearts')}`;

  document.getElementById('modalDesc').innerHTML = descHtml;
  document.getElementById('modalOverlay').style.display = 'flex';

  confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

// =====================================================================
// 설정 (디데이 · 장소 · 회차) — 서버에 저장되어 두 사람 모두에게 같이 보임
// =====================================================================
let appSettings = {
  round: 3,
  place: '우리집 (별빛)',
  dday: new Date(Date.now() + 14 * 864e5).toISOString(),
};
let vapidPublicKey = '';

function formatDday(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit',
  });
}

function applySettings() {
  document.querySelectorAll('.round-n').forEach(el => (el.textContent = appSettings.round));
  document.title = `제 ${appSettings.round}차 롱디's 월례 초대장`;
  document.getElementById('ddayText').textContent = formatDday(appSettings.dday);
  document.getElementById('placeText').textContent = appSettings.place;
}

async function loadSettings() {
  try {
    const data = await api('/api/settings');
    appSettings = data.settings;
    vapidPublicKey = data.vapidPublicKey || '';
  } catch (e) {
    console.warn('설정 불러오기 실패, 기본값 사용', e);
  }
  applySettings();
  startDdayTimer();
}

// <input type="datetime-local"> 은 "YYYY-MM-DDTHH:mm" (내 폰 시간 기준)
function toLocalInputValue(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ----- 사이드 메뉴 (☰) : 프로필 + 설정 + 알림 + 앱 설치 -----
function fillSettings() {
  document.getElementById('setRound').value = appSettings.round;
  document.getElementById('setDday').value = toLocalInputValue(appSettings.dday);
  document.getElementById('setPlace').value = appSettings.place;
  document.getElementById('setStart').value = appSettings.start_date || '';
  refreshPushUI();
  refreshInstallUI();
}

function fillProfile() {
  document.getElementById('profileName').value = myProfile?.name || '';
  pickAvatar(myProfile?.avatar || null);
  renderPartners();
  renderLocationStatus();
}

function openMenu() {
  const me = document.getElementById('drawerMe');
  me.innerHTML = myProfile
    ? `${avatarHtml(myProfile.avatar)}<div><b>${escapeHtml(myProfile.name)}</b><small>${partnerName() ? `${escapeHtml(partnerName())}와(과) 함께 · ` : ''}제 ${appSettings.round}차 롱디's 월례</small></div>`
    : `${avatarHtml(null)}<div><b>프로필을 만들어주세요</b><small>내 프로필에서 男/女 캐릭터 선택</small></div>`;
  document.body.classList.add('menu-open');
  document.getElementById('sideMenu').setAttribute('aria-hidden', 'false');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'true');
  document.querySelector('#sideMenu .drawer-scroll').scrollTop = 0;
}

function partnerName() {
  if (!myProfile) return '';
  return sharedProfiles()[myProfile.avatar === 'boy' ? 'girl' : 'boy']?.name || '';
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  document.getElementById('sideMenu').setAttribute('aria-hidden', 'true');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
}

const openSettings = () => showPage('pageSettings');

// 사이드 메뉴 목록 → 해당 화면
function navTo(id) {
  closeMenu();
  setTimeout(() => showPage(id), 120);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
});

function stepRound(delta) {
  const input = document.getElementById('setRound');
  input.value = Math.min(999, Math.max(1, (Number(input.value) || 1) + delta));
}

document.getElementById('settingsForm').addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = document.getElementById('settingsSave');
  const ddayValue = document.getElementById('setDday').value;
  if (!ddayValue) return uiAlert('디데이 날짜와 시간을 골라주세요.', { icon: 'calendar' });

  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';
  try {
    const { settings } = await api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        round: Number(document.getElementById('setRound').value),
        dday: new Date(ddayValue).toISOString(),
        place: document.getElementById('setPlace').value.trim(),
        start_date: document.getElementById('setStart').value || '',
      }),
    });
    appSettings = settings;
    applySettings();
    startDdayTimer();
    goBack();
    confetti({ particleCount: 60, spread: 55, origin: { y: 0.4 } });
  } catch (err) {
    uiAlert(err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '설정 저장';
  }
});

// =====================================================================
// 앱 설치 (PWA) + 푸시 알림
// =====================================================================
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

let swRegistration = null;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    swRegistration = reg;
    syncSubscription();
  }).catch(err => console.warn('서비스워커 등록 실패', err));
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function currentSubscription() {
  if (!pushSupported() || !swRegistration) return null;
  try { return await swRegistration.pushManager.getSubscription(); } catch { return null; }
}

// 의결서 보낼 때 "내 기기는 알림 제외"용
async function myPushEndpoint() {
  const sub = await currentSubscription();
  return sub ? sub.endpoint : '';
}

// 이미 알림을 켠 기기면 서버에 구독 정보를 다시 알려줌 (DB 초기화 대비)
async function syncSubscription() {
  const sub = await currentSubscription();
  if (sub) api('/api/push', { method: 'POST', body: JSON.stringify({ ...sub.toJSON(), profileName: myProfile?.name || '', profileAvatar: myProfile?.avatar || '' }) }).catch(() => {});
}

async function refreshPushUI() {
  const status = document.getElementById('pushStatus');
  const btn = document.getElementById('pushBtn');
  btn.hidden = true;
  btn.onclick = null;

  if (isIOS && !isStandalone()) {
    status.innerHTML = '아이폰은 <b>홈 화면에 추가한 앱</b>에서만 알림을 받을 수 있어요.<br>아래 "앱으로 설치하기"를 먼저 해주세요!';
    return;
  }
  if (!pushSupported()) {
    status.textContent = '이 브라우저는 알림을 지원하지 않아요. 크롬이나 삼성 인터넷, 또는 설치한 앱에서 열어주세요.';
    return;
  }
  if (!vapidPublicKey) {
    status.textContent = '서버에 알림 설정이 아직 안 되어 있어요.';
    return;
  }
  if (Notification.permission === 'denied') {
    status.innerHTML = '알림이 <b>차단</b>되어 있어요. 폰 설정 → 알림에서 이 앱(또는 브라우저) 알림을 허용해주세요.';
    return;
  }

  const sub = await currentSubscription();
  btn.hidden = false;
  if (sub) {
    status.innerHTML = `${ico('check')} 이 기기로 <b>상대방의 의결서</b>, <b>매일 11:30 편지</b>, <b>업데이트 소식</b>이 와요.`;
    btn.textContent = '알림 끄기';
    btn.classList.add('ghost');
    btn.onclick = disablePush;
  } else {
    status.textContent = '상대방이 의결서를 등록하면 이 기기로 알림을 받아요.';
    btn.innerHTML = `${ico('bell')} 알림 켜기`;
    btn.classList.remove('ghost');
    btn.onclick = enablePush;
  }
}

async function enablePush() {
  const btn = document.getElementById('pushBtn');
  btn.disabled = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('알림 권한을 허용해야 받을 수 있어요.');
    const reg = swRegistration || (await navigator.serviceWorker.ready);
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await api('/api/push', { method: 'POST', body: JSON.stringify({ ...sub.toJSON(), profileName: myProfile?.name || '', profileAvatar: myProfile?.avatar || '' }) });
  } catch (e) {
    uiAlert(e.message, { title: '알림을 켜지 못했어요' });
  } finally {
    btn.disabled = false;
    refreshPushUI();
  }
}

async function disablePush() {
  const sub = await currentSubscription();
  if (sub) {
    await api('/api/push', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  refreshPushUI();
}

// 안드로이드 크롬: 설치 버튼 직접 띄우기
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  refreshInstallUI();
});
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  refreshInstallUI();
});

function refreshInstallUI() {
  const guide = document.getElementById('installGuide');
  const btn = document.getElementById('installBtn');
  btn.hidden = true;

  if (isStandalone()) {
    guide.innerHTML = `${ico('check')} 지금 앱으로 실행 중이에요.`;
  } else if (deferredInstallPrompt) {
    guide.textContent = '버튼을 누르면 홈 화면에 앱 아이콘이 생겨요.';
    btn.hidden = false;
    btn.onclick = async () => {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      refreshInstallUI();
    };
  } else if (isIOS) {
    guide.innerHTML = '<b>Safari</b>에서 하단 <b>공유 버튼(□↑)</b> → <b>"홈 화면에 추가"</b>를 누르고,<br>홈 화면의 앱 아이콘으로 열어서 알림을 켜주세요.';
  } else {
    guide.innerHTML = '브라우저 메뉴(<b>⋮</b>) → <b>"앱 설치"</b> 또는 <b>"홈 화면에 추가"</b>를 눌러주세요.';
  }
}

// 알림을 눌러 들어오면(/?view=history) 인트로 건너뛰고 등록 내역으로
async function init() {
  await Promise.resolve(); // 아래쪽 화면 이동 코드가 준비된 뒤 실행
  const q = new URLSearchParams(location.search); // 주소를 정리하기 전에 먼저 읽음 (알림 링크)
  const saved = history.state;
  if (saved && saved.page && saved.page !== 'page1' && document.getElementById(saved.page) && !location.search) {
    showPage(saved.page, { push: false, state: saved });
  } else {
    history.replaceState({ page: 'page1' }, '', location.pathname);
  }
  const view = q.get('view');
  if (view) window.skipIntro && window.skipIntro();
  const _show = showPage;
  if (q.get('from') === 'town') showPage = (id, o = {}) => { showPage = _show; return _show(id, { ...o, replace: true, state: { ...(o.state || {}), fromTown: true } }); }; // 첫 화면만 바꿔치기
  if (view === 'history') showPage('page3');
  if (view === 'letter') showPage('pageLetter', { state: { id: q.get('id') } });
  if (view === 'hints') showPage('pageHints');
  if (view === 'agenda') showPage('page2');
  if (view === 'inquiry') showPage('pageInquiry');
  if (view === 'recipe') showPage('pageRecipe', { state: { id: q.get('id') } });
  if (view === 'romance') openRomanceFromLink(q.get('day'));
  if (view === 'recipes') showPage('pageRecipes');
  if (view === 'talk') showPage('pageTalk');
  if (view === 'letters') showPage('pageLetters');
  await loadSettings();
  refreshProfiles();
  refreshHintBadge();
  updateDistance();
  checkStatus();
}
init();

// 알림을 눌렀는데 앱이 이미 열려 있는 경우 (서비스워커가 메시지로 알려줌)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'open') {
      const u = new URL(e.data.url, location.origin);
      if (u.pathname.startsWith('/town')) { location.href = u.href; return; } // 동네 알림 → 동네로
      const v = u.searchParams.get('view');
      if (v === 'history') showPage('page3');
      else if (v === 'letter') showPage('pageLetter', { state: { id: u.searchParams.get('id') } });
      else if (v === 'hints') showPage('pageHints');
      else if (v === 'agenda') showPage('page2');
      else if (v === 'inquiry') showPage('pageInquiry');
      else if (v === 'recipe') showPage('pageRecipe', { state: { id: u.searchParams.get('id') } });
      else if (v === 'romance') openRomanceFromLink(u.searchParams.get('day'));
      else if (v === 'recipes') showPage('pageRecipes');
      else if (v === 'talk') showPage('pageTalk');
      else if (v === 'letters') showPage('pageLetters');
      else location.reload();
    }
  });
}

// =====================================================================
// 내 프로필 (이름 + 캐릭터) — 폰마다 따로 저장
// =====================================================================
const PROFILE_KEY = 'kk_profile';
const AVATARS = { boy: 'assets/avatar-boy.jpg', girl: 'assets/avatar-girl.jpg' };

function loadProfile() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null');
    if (p && p.name && AVATARS[p.avatar]) return p;
  } catch {}
  return null;
}

let myProfile = loadProfile();
let draftAvatar = null;
let afterProfileSaved = null;

function avatarHtml(avatar, extraClass = '') {
  return AVATARS[avatar]
    ? `<img class="avatar ${extraClass}" src="${AVATARS[avatar]}" alt="">`
    : `<span class="avatar avatar-empty ${extraClass}">${ico('user')}</span>`;
}

function setAvatarEl(el, avatar) {
  if (AVATARS[avatar]) {
    el.classList.remove('avatar-empty');
    el.innerHTML = `<img src="${AVATARS[avatar]}" alt="">`;
  } else {
    el.classList.add('avatar-empty');
    el.innerHTML = ico('user');
  }
}

function pickAvatar(avatar) {
  draftAvatar = avatar;
  document.querySelectorAll('.avatar-option').forEach(btn => {
    const on = btn.dataset.avatar === avatar;
    btn.classList.toggle('selected', on);
    btn.setAttribute('aria-checked', on);
  });
  setAvatarEl(document.getElementById('profilePreview'), avatar);
  const nameIn = document.getElementById('profileName');
  const shared = sharedProfiles()[avatar];
  if (shared && !nameIn.value.trim()) nameIn.value = shared.name;
}

// 의결서 제출 전 프로필이 없을 때: 메뉴를 열고 프로필 칸을 강조
// 설정: 목록 → 항목을 눌러야 그 화면으로 (뒤로가기는 목록으로)
function openSetSec(sec) { showPage('pageSettings', { state: { sec } }); }
function showSetSec(sec) {
  const page = document.getElementById('pageSettings');
  page.classList.toggle('set-open', Boolean(sec));
  document.getElementById('setMenu').hidden = Boolean(sec);
  page.querySelectorAll('[data-sec]').forEach((el) => { el.hidden = el.dataset.sec !== sec; });
  const titles = { profile: '프로필', location: '위치 설정', common: '우리 둘 공통 설정', push: '알림', install: '앱으로 설치하기', versions: '업데이트 목록' };
  page.querySelector('.report-header h2').textContent = titles[sec] || '설정';
  if (!sec) {
    document.getElementById('setMenuProfile').textContent = myProfile ? myProfile.name : '';
    const mine = myProfile && lastDistance && lastDistance.people && lastDistance.people[myProfile.avatar];
    document.getElementById('setMenuLoc').textContent = mine && mine.area ? mine.area : '';
    getVersions().then((d) => { if (d) document.getElementById('setMenuVer').textContent = d.current; });
  }
}
function openProfile(note, onSaved) {
  showPage('pageSettings', { state: { sec: 'profile' } });
  setTimeout(() => document.getElementById('profileSection').scrollIntoView({ block: 'center', behavior: 'smooth' }), 150);
  afterProfileSaved = typeof onSaved === 'function' ? onSaved : null;
  if (typeof note === 'string') document.getElementById('profileNote').textContent = note;
  document.getElementById('profileSection').classList.add('attention');
}

// 두 사람 프로필 (서버 공유) — { boy: {name}, girl: {name} }
const sharedProfiles = () => (appSettings && appSettings.profiles) || {};
const displayName = (r) => sharedProfiles()[r.profile_avatar]?.name || r.profile_name || r.device || '익명';

async function refreshProfiles() {
  try {
    const { profiles } = await api('/api/profile');
    appSettings.profiles = profiles || {};
    // 이 폰 프로필이 서버에 아직 없으면 올려서 상대방도 보이게
    if (myProfile && !appSettings.profiles[myProfile.avatar]) await pushProfile(myProfile);
    renderPartners();
  } catch {}
  updateTalkLabel();
}

async function pushProfile(p, oldName = '') {
  const { profiles } = await api('/api/profile', { method: 'PUT', body: JSON.stringify({ avatar: p.avatar, name: p.name, oldName }) });
  appSettings.profiles = profiles;
  renderPartners();
}

function renderPartners() {
  const el = document.getElementById('profilePair');
  if (!el) return;
  const ps = sharedProfiles();
  el.innerHTML = ['boy', 'girl'].map((a) => {
    const p = ps[a];
    const me = myProfile && myProfile.avatar === a;
    return `<div class="pair-item${p ? '' : ' empty'}">${avatarHtml(a)}<b>${p ? escapeHtml(p.name) : '아직 없음'}</b><small>${me ? '나' : a === 'boy' ? '男' : '女'}</small></div>`;
  }).join(`<span class="pair-heart">${ico('hearts')}</span>`);
}

async function saveProfile() {
  const name = document.getElementById('profileName').value.trim();
  if (!draftAvatar) return uiAlert('男/女 캐릭터를 골라주세요!', { icon: 'user' });
  if (!name) return document.getElementById('profileName').focus();

  const oldName = myProfile && myProfile.avatar === draftAvatar ? myProfile.name : '';
  myProfile = { name, avatar: draftAvatar };
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(myProfile)); } catch {}
  try { await pushProfile(myProfile, oldName); } catch (e) { uiAlert(e.message, { title: '상대방 폰에 프로필을 알리지 못했어요', icon: 'user' }); }
  refreshHintBadge();
  syncSubscription(); // 알림 받는 기기 정보에도 이름 반영
  updateDistance();   // 거리 막대에 내 캐릭터 반영
  document.getElementById('profileSection').classList.remove('attention');

  const next = afterProfileSaved;
  afterProfileSaved = null;
  if (next) {
    goBack();
    setTimeout(next, 200);
  } else {
    const btn = document.querySelector('#profileSection .close-btn');
    btn.textContent = '저장됐어요 ✓';
    setTimeout(() => (btn.textContent = '프로필 저장'), 1500);
  }
}

document.getElementById('profileName').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveProfile(); }
});


// =====================================================================
// 우리들의 히스토리 (구글 시트 "여행 계획표" 정리본: data/ourstory.json)
// =====================================================================
const STORY_ICO = { 'trip-sample': 'wave', 'menu-sample': 'plate', food: 'noodle', cafe: 'coffee', bar: 'beer', exhibit: 'frame' };
let storyData = null;
let storyCurrent = null;

function showOurStory(pageId) {
  showPage('page4', { state: { story: pageId || null } });
}

async function loadOurStory(pageId) {
  const body = document.getElementById('storyBody');
  if (!storyData) {
    try {
      const res = await fetch('data/ourstory.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error();
      storyData = await res.json();
    } catch {
      body.innerHTML = '<div class="menu-status">히스토리를 불러오지 못했어요. 다시 시도해주세요.</div>';
      return;
    }
  }
  renderStoryTabs();
  selectStory(pageId || storyCurrent || storyData.pages[0].id);
}

function renderStoryTabs() {
  const nav = document.getElementById('storyTabs');
  nav.innerHTML = storyData.pages.map(p => `
    <button type="button" role="tab" class="story-tab" data-id="${p.id}" aria-selected="false" onclick="selectStory('${p.id}')">
      ${ico(STORY_ICO[p.id] || 'diary')}${escapeHtml(p.tab)}
    </button>`).join('');
}

function selectStory(id) {
  const page = storyData.pages.find(p => p.id === id) || storyData.pages[0];
  storyCurrent = page.id;
  document.querySelectorAll('.story-tab').forEach(t => {
    const on = t.dataset.id === page.id;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on);
    if (on) t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  });

  const renderers = { trip: renderTrip, menu: renderMenuPage, places: renderPlaces, events: renderEvents };
  const body = document.getElementById('storyBody');
  body.innerHTML = `<h3 class="story-title">${ico(STORY_ICO[page.id] || 'diary')} ${escapeHtml(page.title)}</h3>` + (renderers[page.type] || (() => ''))(page);
  body.classList.remove('fade-in');
  void body.offsetWidth;
  body.classList.add('fade-in');
}

function moveStory(step) {
  if (!storyData) return;
  const i = storyData.pages.findIndex(p => p.id === storyCurrent);
  const next = storyData.pages[i + step];
  if (!next) return;
  selectStory(next.id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

(function setupStorySwipe() {
  const el = document.getElementById('page4');
  let sx = 0, sy = 0, on = false;
  el.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    on = t.clientX > 36 && !e.target.closest('.story-tabs'); // 왼쪽 끝은 뒤로가기, 탭 줄은 자체 스크롤
    sx = t.clientX; sy = t.clientY;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!on) return;
    on = false;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) moveStory(dx < 0 ? 1 : -1);
  });
})();

const nl2br = (t) => escapeHtml(t).replace(/\n/g, '<br>');
const mapLink = (name, addr) => `https://map.naver.com/p/search/${encodeURIComponent(`${addr} ${name}`)}`;

function renderTrip(p) {
  const head = `
    <div class="trip-summary">
      <div>${ico('calendar')}${escapeHtml(p.period)}</div>
      <div>${ico('pin')}${escapeHtml(p.place)}</div>
      <div>${ico('people')}${p.travelers.map(escapeHtml).join(' · ')}</div>
      ${p.stay ? `<div>${ico('home')}${escapeHtml(p.stay.name)} · ${escapeHtml(p.stay.nights)}</div>` : ''}
    </div>`;
  const days = p.days.map((d, i) => `
    <details class="trip-day"${i === 0 ? ' open' : ''}>
      <summary>
        <span class="trip-day-num">DAY ${i + 1}</span>
        <span class="trip-day-date">${escapeHtml(d.date)}</span>
        ${d.title ? `<span class="trip-day-title">${escapeHtml(d.title)}</span>` : ''}
        <span class="round-chevron" aria-hidden="true">›</span>
      </summary>
      <ol class="timeline">
        ${d.items.map(it => `
          <li>
            <span class="tl-time">${it.time ? escapeHtml(it.time) : ''}</span>
            <div class="tl-body">
              <div class="tl-title">${escapeHtml(it.title)}</div>
              ${it.memo ? `<div class="tl-memo">${nl2br(it.memo)}</div>` : ''}
            </div>
          </li>`).join('')}
      </ol>
    </details>`).join('');
  const notes = p.notes ? `
    <div class="agenda-card story-note">
      <div class="agenda-num">MEMO</div>
      <div class="agenda-title">${ico('pencil')} ${escapeHtml(p.notes.title)}</div>
      <ul>${p.notes.items.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
    </div>` : '';
  return head + days + notes;
}

function renderMenuPage(p) {
  const groups = p.groups.map(g => `
    <div class="agenda-card">
      <div class="agenda-num">${escapeHtml(g.name)}</div>
      ${g.items.map(it => `
        <div class="menu-row">
          <div class="menu-row-main">
            <b>${escapeHtml(it.name)}</b>${it.top ? '<span class="pill top">上 우선</span>' : ''}
            <div class="menu-row-sub"><span class="pill">${escapeHtml(it.style)}</span> ${ico('wine')} ${escapeHtml(it.pairing)}</div>
            ${it.note ? `<div class="menu-row-note">${ico('chat')} ${escapeHtml(it.note)}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>`).join('');
  const recipes = p.recipes?.length ? `
    <div class="agenda-card">
      <div class="agenda-num">RECIPE</div>
      ${p.recipes.map(r => `
        <div class="recipe">
          <b>${ico('chef')} ${escapeHtml(r.name)}</b>
          <ol>${r.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
        </div>`).join('')}
    </div>` : '';
  const extra = p.extra ? `
    <div class="agenda-card"><div class="agenda-num">${escapeHtml(p.extra.title)}</div>
    ${p.extra.items.map(x => `<div>${ico('sparkle')} ${escapeHtml(x)}</div>`).join('')}</div>` : '';
  return (p.comment ? `<p class="story-comment">${escapeHtml(p.comment)}</p>` : '') + groups + recipes + extra;
}

function renderPlaces(p) {
  return `<p class="story-count">${p.items.length}곳</p>` + p.items.map((it, i) => `
    <div class="agenda-card place-card">
      <div class="place-head">
        <span class="place-num">${i + 1}</span>
        <b class="place-name">${escapeHtml(it.name)}</b>
        ${it.category ? `<span class="pill">${escapeHtml(it.category)}</span>` : ''}
      </div>
      ${(it.pros || []).length || (it.cons || []).length ? `
        <div class="place-tags">
          ${(it.pros || []).map(t => `<span class="tag good">${ico('heart')} ${escapeHtml(t)}</span>`).join('')}
          ${(it.cons || []).map(t => `<span class="tag bad">${ico('drop')} ${escapeHtml(t)}</span>`).join('')}
        </div>` : ''}
      ${it.tip ? `<div class="place-tip">${ico('bulb')} ${escapeHtml(it.tip)}</div>` : ''}
      <a class="place-addr" href="${it.link || mapLink(it.name, it.addr)}" target="_blank" rel="noopener">${ico('pin')} ${escapeHtml(it.addr)} <span>지도 ›</span></a>
    </div>`).join('');
}

function renderEvents(p) {
  const today = new Date(new Date().toDateString());
  const status = (it) => {
    if (!it.end) return '';
    const end = new Date(it.end + 'T23:59:59');
    const start = it.start ? new Date(it.start + 'T00:00:00') : null;
    if (end < today) return '<span class="pill ended">종료</span>';
    if (start && start > today) return '<span class="pill soon">오픈 예정</span>';
    return '<span class="pill live">진행 중</span>';
  };
  const fmt = (d) => d.replaceAll('-', '.');
  return p.items.map(it => `
    <div class="agenda-card event-card">
      <div class="place-head">
        <span class="pill">${escapeHtml(it.category)}</span>
        <span class="pill">${ico('pin')} ${escapeHtml(it.area)}</span>
        ${status(it)}
      </div>
      <b class="place-name">${escapeHtml(it.name)}</b>
      ${it.start ? `<div class="event-period">${ico('calendar')} ${fmt(it.start)} ~ ${fmt(it.end)}</div>` : ''}
      ${it.hours ? `<div class="tl-memo">${nl2br(it.hours)}</div>` : ''}
      <div class="event-foot">
        <span>${ico('ticket')} ${escapeHtml(it.booking)}</span>
        ${it.review ? `<a href="${it.review}" target="_blank" rel="noopener">후기 보기 ›</a>` : ''}
      </div>
    </div>`).join('');
}

// =====================================================================
// 화면 이동 (브라우저 기록 사용 → 뒤로가기 버튼·제스처 지원)
// =====================================================================
const PAGE_ENTER = {
  page2: (st) => { startDdayTimer(); loadMenus({ quiet: true }); loadRecipes().then(() => { if (st.sec === 'recipes') scrollToRecipes(); }); },
  page3: (st) => loadHistory(st.highlight),
  page4: (st) => loadOurStory(st.story),
  pageSettings: (st) => { fillSettings(); fillProfile(); refreshProfiles(); loadVersions(); showSetSec(st.sec); },
  pageInquiry: () => loadInquiries(),
  pageRomance: () => loadRomance(),
  pageRecipe: (st) => loadRecipe(st.id),
  pageRecipeEdit: (st) => fillRecipeForm(st.id),
  pageChat: () => renderChat(),
  pageTalk: () => openTalk(),
  pageLetters: () => loadLetters(),
  pageLetter: (st) => loadLetter(st.id),
  pageHints: () => loadHints(),
};

function showPage(id, { push = true, state = {}, replace = false } = {}) {
  if (id === 'pageProfile') id = 'pageSettings'; // 내 프로필은 설정 화면으로 합쳐짐
  if (id === 'pageRecipes') { id = 'page2'; state = { ...state, sec: 'recipes' }; } // 레시피 노트는 의결서 AGENDA 02 맨 아래로 옮겨짐
  // 의결서의 레시피 노트에서 상세·쓰기·찾기로 갈 때: 뒤로 오면 다시 레시피 칸으로
  if (push && !replace && ['pageRecipe', 'pageRecipeEdit', 'pageChat'].includes(id) && history.state && history.state.page === 'page2') history.replaceState({ ...history.state, sec: 'recipes' }, '', location.pathname);
  const target = document.getElementById(id);
  if (!target) return;
  document.querySelectorAll('#mainContainer > .page').forEach(p => (p.style.display = p === target ? 'flex' : 'none'));
  document.getElementById('mainContainer').classList.toggle('is-sub', id !== 'page1');
  // 채팅방 모드: 화면 고정 (카톡처럼)
  const chatty = id === 'pageChat' || id === 'pageTalk';
  document.documentElement.classList.toggle('chat-mode', chatty);
  document.body.classList.toggle('chat-mode', chatty);
  if (chatty) fitAppHeight();
  if (id !== 'pageSettings') {
    document.getElementById('profileSection').classList.remove('attention');
    document.getElementById('profileNote').textContent = '의결서 · 알림 · 거리 막대에 이 프로필이 쓰여요';
  }
  const full = { page: id, ...state };
  if (replace) history.replaceState(full, '', location.pathname); // 동네에서 바로 들어온 화면: 뒤로 가면 동네로
  else if (push) history.pushState(full, '', location.pathname);
  window.scrollTo({ top: 0 });
  if (document.body.classList.contains('menu-open')) closeMenu();
  try { PAGE_ENTER[id] && PAGE_ENTER[id](full); } catch (e) { console.error(e); }
}

window.addEventListener('popstate', (e) => {
  const st = e.state || { page: 'page1' };
  if (document.body.classList.contains('menu-open')) closeMenu();
  showPage(st.page || 'page1', { push: false, state: st });
});

function goBack() {
  if (history.state && history.state.fromTown) { location.href = 'town.html'; return; }
  if (history.state && history.state.page && history.state.page !== 'page1' && history.length > 1) history.back();
  else showPage('page1');
}

// ---- 화면 왼쪽 끝에서 오른쪽으로 밀면 뒤로 ----
// 아이폰 사파리(브라우저)는 자체 뒤로 제스처가 있어서, 홈 화면 앱/안드로이드/PC에서만 직접 처리
(function setupSwipeBack() {
  const iosApp = /iPhone|iPad|iPod/i.test(navigator.userAgent) && (window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches);
  if (!iosApp) return; // 사파리·안드로이드·PC는 자체 뒤로 제스처/버튼 사용
  let sx = 0, sy = 0, tracking = false;
  const container = document.getElementById('mainContainer');
  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    tracking = t.clientX < 36 && !document.body.classList.contains('menu-open') && !document.body.classList.contains('intro-active');
    sx = t.clientX; sy = t.clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!tracking) return;
    const dx = e.touches[0].clientX - sx;
    const dy = Math.abs(e.touches[0].clientY - sy);
    if (dy > 40 && dy > dx) { tracking = false; container.style.transform = ''; return; }
    if (dx > 0) container.style.transform = `translateX(${Math.min(dx * 0.45, 90)}px)`;
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.changedTouches[0].clientX - sx;
    container.style.transition = 'transform 0.2s ease';
    container.style.transform = '';
    setTimeout(() => (container.style.transition = ''), 220);
    if (dx > 90 && history.state && history.state.page && history.state.page !== 'page1') goBack();
  });
})();

// =====================================================================
// 홈: 디데이 · 우리 N일째
// =====================================================================
function renderHomeDays() {
  const el = document.getElementById('homeDays');
  const today = new Date(new Date().toDateString());
  const d = new Date(new Date(appSettings.dday).toDateString());
  const left = Math.round((d - today) / 864e5);
  const parts = [];
  parts.push(left > 0 ? `${ico('calendar')} 다음 월례 <b>D-${left}</b>` : left === 0 ? `${ico('calendar')} <b>D-DAY</b> 오늘 만나요` : `${ico('calendar')} 다음 날짜를 정해주세요`);
  if (appSettings.start_date) {
    const start = new Date(appSettings.start_date + 'T00:00:00');
    const n = Math.floor((today - start) / 864e5) + 1;
    if (n > 0) parts.push(`${ico('hearts')} 우리 <b>${n.toLocaleString()}일째</b>`);
  }
  el.innerHTML = parts.map(p => `<span>${p}</span>`).join('');
}

const _applySettings = applySettings;
applySettings = function () { _applySettings(); renderHomeDays(); };
setInterval(renderHomeDays, 60 * 1000);

// =====================================================================
// 우리 사이 거리 (각자 위치 → km, 소수점 둘째 자리). 좌표는 서버에만 저장, 화면엔 거리와 구·동만
// =====================================================================
let lastDistance = null;

function areaLine(info) {
  const ppl = (info && info.people) || {};
  const parts = ['boy', 'girl'].filter((a) => ppl[a] && ppl[a].area)
    .map((a) => `<span>${a === 'boy' ? '男' : '女'} ${escapeHtml(ppl[a].area)}</span>`);
  return parts.length ? `<small class="distance-areas">${ico('location')} ${parts.join(' · ')}</small>` : '';
}

// 내 프로필 화면: 마지막으로 저장된 내 동네
function renderLocationStatus() {
  const el = document.getElementById('locationStatus');
  if (!el) return;
  const mine = myProfile && lastDistance && lastDistance.people && lastDistance.people[myProfile.avatar];
  if (!mine) { el.textContent = '위치를 허용하면 우리 사이 거리가 홈 화면에 보여요. 좌표는 서버에만 저장되고, 화면에는 거리와 구·동만 보여요.'; return; }
  const when = mine.updated_at ? new Date(mine.updated_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  el.innerHTML = `${ico('location')} 지금 내 동네: <b>${escapeHtml(mine.area || '이름을 찾지 못했어요')}</b>${when ? ` <small>(${escapeHtml(when)} 업데이트)</small>` : ''}`;
}

function renderDistance(info) {
  const label = document.getElementById('distanceLabel');
  const track = document.querySelector('.distance-track');
  const km = info ? info.km : null;
  const fmt = (n) => n.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'km';
  if (km == null) {
    track.style.setProperty('--p', 0);
    document.getElementById('distMaxL').textContent = '';
    document.getElementById('distMaxR').textContent = '';
    const mine = myProfile && info && info.people && info.people[myProfile.avatar];
    label.innerHTML = !myProfile
      ? `<button type="button" onclick="openProfile('거리 막대에 쓸 캐릭터를 먼저 골라주세요')">${ico('user')} 프로필 정하고 거리 보기</button>`
      : mine
        ? '상대방이 위치를 허용하면 거리가 보여요' + areaLine(info)
        : `<button type="button" onclick="shareLocation(true)">${ico('location')} 위치 허용하고 거리 보기</button>`;
    return;
  }
  const max = Math.max(info.maxKm || km, km, 0.1);
  const half = Math.min(50, (km / max) * 50);
  track.style.setProperty('--p', 50 - half);
  document.getElementById('distMaxL').textContent = fmt(max);
  document.getElementById('distMaxR').textContent = fmt(max);
  label.innerHTML = (km < 0.1 ? `우리 지금 <b>같이 있어요</b> ${ico('hearts')}` : `우리 사이 <b>${fmt(km)}</b>`) + areaLine(info);
}

async function updateDistance() {
  try {
    lastDistance = await api('/api/location');
    renderDistance(lastDistance);
    // 내 위치가 저장된 적 있으면 앱 열 때마다 조용히 갱신 (권한이 이미 허용된 경우만)
    if (myProfile) {
      // 아이폰(PWA)은 허용해 놓아도 'prompt'로 나올 때가 있어서, 이 기기에서 한 번이라도 위치를 보냈으면 그대로 켬
      const p = navigator.permissions ? await navigator.permissions.query({ name: 'geolocation' }).catch(() => null) : null;
      let had = false; try { had = localStorage.getItem('kk_geo_ok') === '1'; } catch {}
      if (!had && lastDistance?.people?.[myProfile.avatar]?.updated_at) had = true; // 예전에 보낸 적 있는 기기 (이 버전 전)
      if ((p && p.state === 'granted') || (had && (!p || p.state !== 'denied'))) { shareLocation(false); startLiveLocation(); }
      // 한 번 허용했는데 아이폰이 또 물어보는 상태 → '다음번에 묻기'로 되어 있는 것. 설정 바꾸는 법을 딱 한 번만 안내
      if (had && p && p.state === 'prompt' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        let shown = false; try { shown = localStorage.getItem('kk_geo_tip') === '1'; } catch {}
        if (!shown) {
          try { localStorage.setItem('kk_geo_tip', '1'); } catch {}
          setTimeout(() => uiAlert('설정 → 개인정보 보호 및 보안 → 위치 서비스 → Safari 웹 사이트 → "앱을 사용하는 동안"으로 바꾸고 "정확한 위치"를 켜 주세요. 그러면 업데이트 뒤에도 다시 묻지 않고 계속 허용돼요.', { title: '위치를 매번 물어보나요?', icon: 'location' }), 2500);
        }
      }
    }
  } catch { renderDistance(null); }
}

// 실시간 위치: 앱을 보고 있는 동안 움직이면 바로(80m 이상, 30초 간격), 가만히 있어도 10분마다 보고
// 상대 위치(거리)는 1분마다 새로 받음. 앱이 뒤로 가면 멈춤 (폰이 백그라운드 위치를 막음)
let geoWatch = null, geoSent = { t: 0, lat: 0, lng: 0 }, geoBusy = false;
const geoDist = (a1, o1, a2, o2) => { const R = 6371e3, r = Math.PI / 180, d1 = (a2 - a1) * r, d2 = (o2 - o1) * r; const h = Math.sin(d1 / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(d2 / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
async function postLocation(lat, lng) {
  if (!myProfile || geoBusy) return;
  geoBusy = true;
  try {
    lastDistance = await api('/api/location', { method: 'POST', body: JSON.stringify({ avatar: myProfile.avatar, name: myProfile.name, lat, lng, area: await areaName(lat, lng) }) });
    geoSent = { t: Date.now(), lat, lng };
    try { localStorage.setItem('kk_geo_ok', '1'); } catch {}
    renderDistance(lastDistance);
    renderLocationStatus();
  } finally { geoBusy = false; }
}
function startLiveLocation() {
  if (geoWatch != null || !myProfile || !('geolocation' in navigator) || document.visibilityState !== 'visible') return;
  geoWatch = navigator.geolocation.watchPosition((pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    const age = Date.now() - geoSent.t;
    if ((geoDist(lat, lng, geoSent.lat, geoSent.lng) > 80 && age > 30e3) || age > 10 * 60e3) postLocation(lat, lng).catch(() => {});
  }, () => {}, { enableHighAccuracy: true, maximumAge: 30e3, timeout: 30e3 });
}
function stopLiveLocation() { if (geoWatch != null) { navigator.geolocation.clearWatch(geoWatch); geoWatch = null; } }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') updateDistance(); else stopLiveLocation();
});
setInterval(async () => {
  if (document.visibilityState !== 'visible' || geoWatch == null) return;
  try { lastDistance = await api('/api/location'); renderDistance(lastDistance); } catch {}
  if (Date.now() - geoSent.t > 10 * 60e3) navigator.geolocation.getCurrentPosition((pos) => postLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {}), () => {}, { enableHighAccuracy: true, timeout: 20e3, maximumAge: 60e3 });
}, 60 * 1000);

async function areaName(lat, lng) {
  // 동네 이름 (무료, 키 없음) — 예: "하늘구 구름동", "달빛구 물결동". 영문 로마자 이름은 제외
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ko`);
    const d = await r.json();
    return areaFromGeocode(d);
  } catch { return ''; }
}

function areaFromGeocode(d) {
  const ko = (n) => Boolean(n) && /[가-힣]/.test(n) && !/[A-Za-z]/.test(n);
  const admin = (d.localityInfo?.administrative || []).filter((a) => ko(a.name));
  const info = (d.localityInfo?.informative || []).filter((a) => ko(a.name));
  const gu = admin.filter((a) => a.adminLevel >= 5 && a.adminLevel <= 7).sort((a, b) => b.adminLevel - a.adminLevel)[0]?.name;
  const dong = (ko(d.locality) && /(동|읍|면|가|리)$/.test(d.locality) ? d.locality : '')
    || admin.filter((a) => a.adminLevel >= 8).map((a) => a.name).pop()
    || info.find((a) => /(동|읍|면)$/.test(a.name))?.name || '';
  const top = ko(d.principalSubdivision) ? d.principalSubdivision : '';
  return [...new Set([gu || top, dong].filter(Boolean))].join(' ').slice(0, 40);
}

function shareLocation(ask = true) {
  if (!myProfile) return openProfile('거리 막대에 쓸 캐릭터를 먼저 골라주세요', () => shareLocation(true));
  if (!('geolocation' in navigator)) { if (ask) uiAlert('이 기기는 위치를 지원하지 않아요.', { icon: 'location' }); return; }
  const status = document.getElementById('locationStatus');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    try { await postLocation(lat, lng); startLiveLocation(); } catch (e) { if (ask) uiAlert(e.message); }
  }, (err) => {
    if (!ask) return;
    uiAlert(err.code === 1 ? '폰 설정에서 이 앱(브라우저)의 위치를 허용해주세요.' : '잠시 후 다시 해주세요.', { title: err.code === 1 ? '위치 권한이 꺼져 있어요' : '위치를 가져오지 못했어요', icon: 'location' });
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60 * 1000 }); // GPS로 정확하게 (1분 안의 위치는 재사용)
}

// =====================================================================
// 레시피 노트
// =====================================================================
let recipes = [];
let recipeCategory = '전체';
let currentRecipe = null;
let editingRecipeId = null;
let pendingPhoto = null; // { full, thumb } | '' (삭제) | null (변경 없음)

const recipeImg = (r) => r.image_thumb || r.image_url || '';

async function loadRecipes() {
  const grid = document.getElementById('recipeGrid');
  try {
    const data = await api('/api/recipes');
    recipes = data.recipes;
    renderRecipes();
  } catch (e) {
    grid.innerHTML = `<div class="menu-status">${escapeHtml(e.message)}</div>`;
  }
}

// 작성자: 男/女(boy|girl)로 저장 → 지금 프로필 이름으로 표시 (예전 레시피는 이름 그대로)
const authorKey = (r) => (r.author === 'boy' || r.author === 'girl') ? r.author
  : Object.keys(sharedProfiles()).find(a => sharedProfiles()[a]?.name === r.author) || '';
const authorName = (r) => sharedProfiles()[authorKey(r)]?.name || ((r.author === 'boy' || r.author === 'girl') ? '' : r.author) || '';

function renderRecipes() {
  const cats = ['전체', '♥', ...new Set(recipes.map(r => r.category).filter(Boolean))];
  // 작성자별 칩 (by. 지민 / by. 준호)
  const authors = ['girl', 'boy'].filter(a => recipes.some(r => authorKey(r) === a));
  const chip = (key, label) => `<button type="button" class="chip${key === recipeCategory ? ' on' : ''}" onclick="recipeCategory='${key}';renderRecipes()">${label}</button>`;
  document.getElementById('recipeChips').innerHTML =
    cats.map(c => chip(c, `${c === '♥' ? ico('heart') : escapeHtml(c)}${c === '전체' ? `(${recipes.length})` : ''}`)).join('') +
    authors.map(a => chip('@' + a, `by. ${escapeHtml(sharedProfiles()[a]?.name || (a === 'girl' ? '女' : '男'))}`)).join('');
  const q = document.getElementById('recipeFilter').value.trim().toLowerCase();
  const match = (r) => recipeCategory === '전체' ? true
    : recipeCategory === '♥' ? r.favorite
    : recipeCategory.startsWith('@') ? authorKey(r) === recipeCategory.slice(1)
    : r.category === recipeCategory;
  const list = recipes.filter(r =>
    match(r) &&
    (!q || r.title.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q) || authorName(r).toLowerCase().includes(q))
  );
  const grid = document.getElementById('recipeGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="menu-status">${recipes.length ? '찾는 레시피가 없어요' : `아직 레시피가 없어요.<br>${ico('plus')} 로 직접 쓰거나 위의 ${ico('search')} 새 레시피 찾기로 물어보세요!`}</div>`;
    return;
  }
  grid.innerHTML = list.map(r => `
    <button type="button" class="recipe-card" onclick="showPage('pageRecipe',{state:{id:'${r.id}'}})">
      <span class="recipe-thumb">${recipeImg(r) ? `<img src="${escapeHtml(recipeImg(r))}" alt="" loading="lazy">` : ico('plate', 'ico recipe-ph')}</span>
      ${r.favorite ? `<span class="recipe-fav">${ico('heart')}</span>` : ''}
      <span class="recipe-name">${escapeHtml(r.title)}</span>
      ${authorName(r) ? `<span class="recipe-by">by. ${escapeHtml(authorName(r))}</span>` : ''}
      <span class="recipe-meta">
        ${r.category ? `<span class="pill">${escapeHtml(r.category)}</span>` : ''}
        ${r.minutes ? `<span>${ico('clock')}${r.minutes}분</span>` : ''}
        ${r.servings ? `<span>${ico('people')}${r.servings}</span>` : ''}
      </span>
    </button>`).join('');
}
document.getElementById('recipeFilter').addEventListener('input', () => renderRecipes());

async function loadRecipe(id) {
  const hero = document.getElementById('recipeHero');
  const box = document.getElementById('recipeDetail');
  hero.innerHTML = ''; box.innerHTML = '<div class="menu-status">불러오는 중...</div>';
  try {
    const { recipe: r } = await api(`/api/recipes/${encodeURIComponent(id)}`);
    currentRecipe = r;
    const img = r.image_full || r.image_url;
    hero.innerHTML = img
      ? `<img src="${escapeHtml(img)}" alt="">${r.image_credit ? `<small>${escapeHtml(r.image_credit)}</small>` : ''}`
      : `<div class="recipe-hero-empty">${ico('plate', 'ico')}<button type="button" class="history-link" onclick="autoRecipeImage()">${ico('search')} 어울리는 그림 찾기</button></div>`;
    const lines = (t) => (t || '').split('\n').map(x => x.trim()).filter(Boolean);
    box.innerHTML = `
      <div class="recipe-title-row">
        <h2 class="recipe-title">${escapeHtml(r.title)}</h2>
        <button type="button" class="fav-btn${r.favorite ? ' on' : ''}" aria-label="즐겨찾기" onclick="toggleFavorite()">${ico('heart')}</button>
      </div>
      ${authorName(r) ? `<div class="recipe-by big">by. ${escapeHtml(authorName(r))}</div>` : ''}
      <div class="recipe-meta big">
        ${r.category ? `<span class="pill">${escapeHtml(r.category)}</span>` : ''}
        ${r.servings ? `<span class="pill">${ico('people')} ${r.servings}인분</span>` : ''}
        ${r.minutes ? `<span class="pill">${ico('clock')} ${r.minutes}분</span>` : ''}
      </div>
      ${lines(r.ingredients).length ? `<section class="agenda-card"><div class="agenda-num">INGREDIENTS</div><div class="agenda-title">재료</div>
        <ul class="ingredient-list">${lines(r.ingredients).map((x, i) => `<li><label><input type="checkbox"><span>${escapeHtml(x)}</span></label></li>`).join('')}</ul></section>` : ''}
      <a class="town-cook-btn" href="/town?scene=home&cook=${encodeURIComponent(r.id)}">🍳 우리 동네에서 요리하기 <small>(냉장고에 재료가 있어야 해요)</small></a>
      ${lines(r.steps).length ? `<section class="agenda-card"><div class="agenda-num">STEPS</div><div class="agenda-title">만드는 법</div>
        <ol class="step-list">${lines(r.steps).map(x => `<li>${escapeHtml(x.replace(/^\d+[.)]\s*/, ''))}</li>`).join('')}</ol></section>` : ''}
      ${r.memo ? `<section class="agenda-card"><div class="agenda-num">MEMO</div><div class="tl-memo">${nl2br(r.memo)}</div></section>` : ''}
      ${r.source ? `<p class="story-count">출처: ${escapeHtml(r.source)}</p>` : ''}`;
  } catch (e) {
    box.innerHTML = `<div class="menu-status">${escapeHtml(e.message)}</div>`;
  }
}

async function toggleFavorite() {
  if (!currentRecipe) return;
  const { recipe } = await api(`/api/recipes/${currentRecipe.id}`, { method: 'PATCH', body: JSON.stringify({ favorite: !currentRecipe.favorite }) });
  currentRecipe.favorite = recipe.favorite;
  document.querySelector('.fav-btn').classList.toggle('on', recipe.favorite);
}

async function autoRecipeImage() {
  if (!currentRecipe) return;
  try {
    await api(`/api/recipes/${currentRecipe.id}/auto-image`, { method: 'POST', body: '{}' });
    loadRecipe(currentRecipe.id);
  } catch (e) { uiAlert(e.message); }
}

async function removeRecipe() {
  if (!currentRecipe || !(await uiConfirm(`"${currentRecipe.title}"`, { title: '이 레시피를 삭제할까요?', ok: '삭제', danger: true, sub: '상대방 레시피 노트에서도 지워져요' }))) return;
  try { await api(`/api/recipes/${currentRecipe.id}`, { method: 'DELETE' }); goBack(); } catch (e) { uiAlert(e.message); }
}

function editRecipe(id) {
  showPage('pageRecipeEdit', { state: { id: id || null } });
}

let recipeDraft = null; // 채팅에서 저장할 때 미리 채울 값

function fillRecipeForm(id) {
  editingRecipeId = id || null;
  pendingPhoto = null;
  const r = id && currentRecipe && currentRecipe.id === id ? currentRecipe : (recipeDraft || {});
  recipeDraft = null;
  document.getElementById('recipeEditTitle').textContent = id ? '레시피 수정' : '새 레시피';
  document.getElementById('rTitle').value = r.title || '';
  document.getElementById('rCategory').value = r.category || '한식';
  document.getElementById('rMinutes').value = r.minutes || '';
  document.getElementById('rServings').value = r.servings || '';
  document.getElementById('rIngredients').value = r.ingredients || '';
  document.getElementById('rSteps').value = r.steps || '';
  document.getElementById('rMemo').value = r.memo || '';
  document.getElementById('recipeForm').dataset.source = r.source || '';
  showPhotoPreview(r.image_full || r.image_thumb || r.image_url || '');
}

function showPhotoPreview(src) {
  const box = document.getElementById('photoPreview');
  box.innerHTML = src ? `<img src="${escapeHtml(src)}" alt="">` : `${ico('camera')}<small>대표 사진 (갤러리에서 고르기)<br>안 고르면 자동으로 어울리는 사진을 찾아요</small>`;
  document.getElementById('photoClear').hidden = !src;
}

function clearRecipePhoto() { pendingPhoto = ''; showPhotoPreview(''); }

// 갤러리 사진 → 폰에서 줄여서 보냄 (상세 1080px, 목록 360px)
function resizeImage(file, max, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error('사진을 열 수 없어요.'));
    img.src = URL.createObjectURL(file);
  });
}

document.getElementById('recipePhoto').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const full = await resizeImage(file, 1080, 0.82);
    const thumb = await resizeImage(file, 360, 0.75);
    pendingPhoto = { full, thumb };
    showPhotoPreview(full);
  } catch (err) { uiAlert(err.message); }
  e.target.value = '';
});

document.getElementById('recipeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('recipeSave');
  const body = {
    title: document.getElementById('rTitle').value,
    category: document.getElementById('rCategory').value,
    minutes: document.getElementById('rMinutes').value || null,
    servings: document.getElementById('rServings').value || null,
    ingredients: document.getElementById('rIngredients').value,
    steps: document.getElementById('rSteps').value,
    memo: document.getElementById('rMemo').value,
    author: myProfile ? myProfile.avatar : '', // 男/女로 저장 → 이름은 지금 프로필 이름으로 표시
    source: document.getElementById('recipeForm').dataset.source || '',
  };
  if (pendingPhoto === '') { body.image_full = ''; body.image_thumb = ''; }
  else if (pendingPhoto) { body.image_full = pendingPhoto.full; body.image_thumb = pendingPhoto.thumb; }
  btn.disabled = true; btn.textContent = '저장 중...';
  try {
    const { recipe } = editingRecipeId
      ? await api(`/api/recipes/${editingRecipeId}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await api('/api/recipes', { method: 'POST', body: JSON.stringify({ ...body, endpoint: await myPushEndpoint() }) });
    currentRecipe = recipe;
    history.replaceState({ page: 'pageRecipe', id: recipe.id }, '', location.pathname);
    showPage('pageRecipe', { push: false, state: { id: recipe.id } });
  } catch (err) {
    uiAlert(err.message);
  } finally {
    btn.disabled = false; btn.textContent = '레시피 저장';
  }
});

// =====================================================================
// 새 레시피 찾기 (채팅) — Gemini 무료 + 구글 검색
// =====================================================================
// 대화 기록은 이 폰에 저장 → 앱을 껐다 켜도 위로 올리면 예전 대화가 그대로
const CHAT_KEY = 'kk_chat';
let chatMessages = (() => { try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; } })();
let chatBusy = false;
function saveChat() {
  chatMessages = chatMessages.slice(-120);
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatMessages)); } catch {}
}
const dayLabel = (t) => new Date(t).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

function openRecipeChat() { showPage('pageChat'); }

function renderChat() {
  const log = document.getElementById('chatLog');
  const partner = myProfile ? (myProfile.avatar === 'boy' ? 'girl' : 'boy') : 'boy';
  const bot = `<img class="chat-avatar" src="assets/avatar-${partner}.jpg" alt="">`;
  const items = chatMessages.length ? chatMessages : [{ role: 'model', text: '오늘 뭐 해 먹고 싶어? 재료나 분위기만 말해줘도 찾아볼게!' }];
  let lastDay = '';
  log.innerHTML = items.map((m, i) => {
    const day = m.at ? dayLabel(m.at) : '';
    const sep = day && day !== lastDay ? `<div class="chat-day">${escapeHtml(day)}</div>` : '';
    if (day) lastDay = day;
    return sep + (m.role === 'user'
    ? `<div class="bubble me">${nl2br(m.text)}</div>`
    : `<div class="bubble-row">${bot}<div class="bubble bot">${nl2br(m.text)}
        ${m.recipe ? `<div class="chat-recipe"><b>${ico('recipe')} ${escapeHtml(m.recipe.title)}</b>
          <span>${[m.recipe.category, m.recipe.minutes && m.recipe.minutes + '분', m.recipe.servings && m.recipe.servings + '인분'].filter(Boolean).join(' · ')}</span>
          <button type="button" class="close-btn" onclick="saveChatRecipe(${i})">${ico('plus')} 레시피 노트에 저장</button></div>` : ''}
        ${m.sources && m.sources.length ? `<div class="chat-sources">${m.sources.slice(0, 3).map(s => `<a href="${escapeHtml(s.uri)}" target="_blank" rel="noopener">${escapeHtml(s.title || '출처')}</a>`).join('')}</div>` : ''}
      </div></div>`);
  }).join('') + (chatBusy ? `<div class="bubble-row">${bot}<div class="bubble bot typing"><span></span><span></span><span></span></div></div>` : '');
  log.scrollTop = log.scrollHeight;
  if (!document.body.classList.contains('chat-mode')) window.scrollTo({ top: document.body.scrollHeight });
}

document.getElementById('chatForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('chatText');
  const text = input.value.trim();
  if (!text || chatBusy) return;
  chatMessages.push({ role: 'user', text, at: Date.now() });
  input.value = '';
  growChatInput();
  saveChat();
  chatBusy = true;
  renderChat();
  try {
    // AI에게는 최근 6시간 안의 대화만 이어서 보냄 (며칠 전 대화가 섞이지 않게)
    const recent = chatMessages.filter(m => !m.error && (!m.at || Date.now() - m.at < 6 * 3600e3)).slice(-12);
    const data = await api('/api/recipes/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: recent.map(({ role, text }) => ({ role, text })), profileAvatar: myProfile?.avatar || '', profileName: myProfile?.name || '' }),
    });
    chatMessages.push({ role: 'model', text: data.text || '찾은 내용을 정리했어!', recipe: data.recipe, sources: data.sources, at: Date.now() });
  } catch (err) {
    chatMessages.push({ role: 'model', text: err.message, error: true, at: Date.now() });
  } finally {
    chatBusy = false;
    saveChat();
    renderChat();
  }
});

// 채팅방 높이 = 실제로 보이는 화면 높이 (아이폰 키보드가 올라오면 그만큼 줄어서 입력창이 키보드 위에)
function fitAppHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-h', `${Math.round(h)}px`);
  if (document.body.classList.contains('chat-mode')) {
    window.scrollTo(0, 0);
    for (const id of ['chatLog', 'talkLog']) { const log = document.getElementById(id); if (log && log.offsetParent) log.scrollTop = log.scrollHeight; }
  }
}
if (window.visualViewport) {
  visualViewport.addEventListener('resize', fitAppHeight);
  visualViewport.addEventListener('scroll', () => { if (document.body.classList.contains('chat-mode')) window.scrollTo(0, 0); });
}
window.addEventListener('resize', fitAppHeight);

// 입력창: 줄이 넘어가면 다음 줄로, 입력창도 같이 커짐 (최대 약 5줄)
const chatTextEl = document.getElementById('chatText');
function growChatInput() {
  chatTextEl.style.height = 'auto';
  chatTextEl.style.height = Math.min(chatTextEl.scrollHeight + 2, 140) + 'px';
  chatTextEl.style.overflowY = chatTextEl.scrollHeight > 138 ? 'auto' : 'hidden';
}
chatTextEl.addEventListener('input', growChatInput);
// PC에서는 Enter = 보내기, Shift+Enter = 줄바꿈 / 폰은 Enter = 줄바꿈, 보내기 버튼으로 전송
chatTextEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    e.preventDefault();
    document.getElementById('chatForm').requestSubmit();
  }
});

function scrollToRecipes() {
  const el = document.getElementById('recipeEmbed');
  if (el) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'instant' }), 30);
}

// =====================================================================
// 상대랑 대화하기 (Beta) — LastTalk 방식: 서로가 여기서 한 말로 말투·이야기를 배워서 상대 창에서 그 사람처럼 대답
// =====================================================================
const TALK_KEY = 'kk_talk';
let talkMessages = (() => { try { return JSON.parse(localStorage.getItem(TALK_KEY) || '[]'); } catch { return []; } })();
let talkBusy = false;
const hasBatchim = (w) => { const c = (w || '').charCodeAt((w || '').length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 > 0; };
const talkPartner = () => (myProfile ? partnerOf(myProfile.avatar) : 'girl');
const talkPartnerName = () => sharedProfiles()[talkPartner()]?.name || (talkPartner() === 'girl' ? '지민' : '준호');
const callName = (n) => (hasBatchim(n) ? n + '이' : n); // 지민 → 지민이, 준호 → 준호
const withName = (n) => (hasBatchim(n) ? `${n}이랑` : `${n}랑`);
function updateTalkLabel() {
  const el = document.getElementById('navTalkLabel');
  if (el) el.textContent = `${withName(talkPartnerName())} 대화하기`;
}
function saveTalk() {
  talkMessages = talkMessages.slice(-200);
  try { localStorage.setItem(TALK_KEY, JSON.stringify(talkMessages)); } catch {}
}
async function openTalk() {
  const n = talkPartnerName();
  document.getElementById('talkTitle').innerHTML = `${escapeHtml(withName(n))} 대화하기 <small class="beta-tag">BETA</small>`;
  updateTalkLabel();
  renderTalk();
}
function renderTalk() {
  const log = document.getElementById('talkLog');
  const n = talkPartnerName();
  const bot = `<img class="chat-avatar" src="assets/avatar-${talkPartner()}.jpg" alt="">`;
  const items = talkMessages.length ? talkMessages : [{ role: 'model', text: `왔어? 뭐해~` }];
  let lastDay = '';
  log.innerHTML = items.map((m) => {
    const day = m.at ? dayLabel(m.at) : '';
    const sep = day && day !== lastDay ? `<div class="chat-day">${escapeHtml(day)}</div>` : '';
    if (day) lastDay = day;
    return sep + (m.role === 'user'
      ? `<div class="bubble me">${nl2br(m.text)}</div>`
      : m.error ? `<div class="bubble-row">${bot}<div class="bubble bot err">${nl2br(m.text)}</div></div>`
        // 카톡처럼 줄마다 따로 말풍선 (프로필 사진은 첫 말풍선에만)
        : String(m.text).split('\n').filter((l) => l.trim()).map((l, i) => `<div class="bubble-row${i ? ' cont' : ''}">${i ? '<span class="chat-avatar-gap"></span>' : bot}<div class="bubble bot">${escapeHtml(l)}</div></div>`).join(''));
  }).join('') + (talkBusy ? `<div class="bubble-row">${bot}<div class="bubble bot typing"><span></span><span></span><span></span></div></div>` : '');
  const chips = document.getElementById('talkChips');
  const ideas = [`${callName(n)}는 뭘 좋아해?`, '오늘 뭐하지?', '오늘 하루 어땠어?', '보고 싶어', '주말에 뭐 먹을까?'];
  chips.innerHTML = talkMessages.length > 1 ? '' : ideas.map((t) => `<button type="button" class="chip" data-t="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('');
  chips.querySelectorAll('.chip').forEach((b) => (b.onclick = () => { document.getElementById('talkText').value = b.dataset.t; document.getElementById('talkForm').requestSubmit(); }));
  log.scrollTop = log.scrollHeight;
}
document.getElementById('talkForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('talkText');
  const text = input.value.trim();
  if (!text || talkBusy) return;
  if (!myProfile) { uiAlert('설정에서 내 프로필(男/女)을 먼저 골라주세요.'); return; }
  talkMessages.push({ role: 'user', text, at: Date.now() });
  input.value = ''; growTalkInput(); saveTalk();
  talkBusy = true; renderTalk();
  try {
    // 최근 3시간 대화만 이어서 (며칠 전 대화가 섞이지 않게)
    const recent = talkMessages.filter((m) => !m.error && Date.now() - (m.at || 0) < 3 * 3600e3).slice(-16);
    const data = await api('/api/talk/chat', { method: 'POST', body: JSON.stringify({ messages: recent.map(({ role, text }) => ({ role, text })), profileAvatar: myProfile.avatar }) });
    // 카톡처럼 말풍선이 0.5초 간격으로 하나씩 도착 (사이에는 입력 중 표시)
    const lines = String(data.text || '').split('\n').filter((l) => l.trim());
    const m = { role: 'model', text: lines[0] || 'ㅎㅎ', at: Date.now() };
    talkMessages.push(m);
    for (let i = 1; i < lines.length; i++) {
      renderTalk();
      await new Promise((r) => setTimeout(r, 500));
      m.text += '\n' + lines[i];
    }
  } catch (err) {
    talkMessages.push({ role: 'model', text: err.message, error: true, at: Date.now() });
  } finally {
    talkBusy = false; saveTalk(); renderTalk();
  }
});
const talkTextEl = document.getElementById('talkText');
function growTalkInput() {
  talkTextEl.style.height = 'auto';
  talkTextEl.style.height = Math.min(talkTextEl.scrollHeight + 2, 140) + 'px';
  talkTextEl.style.overflowY = talkTextEl.scrollHeight > 138 ? 'auto' : 'hidden';
}
talkTextEl.addEventListener('input', growTalkInput);
talkTextEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    e.preventDefault();
    document.getElementById('talkForm').requestSubmit();
  }
});

function saveChatRecipe(i) {
  const m = chatMessages[i];
  if (!m || !m.recipe) return;
  recipeDraft = { ...m.recipe, source: (m.sources || []).map(s => s.uri).slice(0, 2).join(' ') };
  currentRecipe = null;
  editRecipe(null);
}

// =====================================================================
// 오늘의 편지 (매일 11:30)
// =====================================================================
const WEATHER_ICON = { sun: 'sun', cloud: 'cloud', rain: 'rain', snow: 'snow' };

const partnerOf = (a) => (a === 'boy' ? 'girl' : 'boy');

async function loadLetters() {
  const box = document.getElementById('letterList');
  try {
    const { letters } = await api('/api/letters');
    const me = myProfile?.avatar;
    const mine = me ? letters.filter(l => l.to_avatar === me || (l.kind === 'user' && l.from_avatar === me)) : letters;
    const date = (t) => new Date(t).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    box.innerHTML = mine.length ? mine.map(l => {
      const user = l.kind === 'user';
      const sent = user && l.from_avatar === me;
      return `
      <button type="button" class="agenda-card letter-item" onclick="showPage('pageLetter',{state:{id:'${l.id}'}})">
        ${user ? ico('letter', 'ico letter-ico') : ico(WEATHER_ICON[l.weather?.tag] || 'sun', 'ico letter-ico')}
        <span><b>${escapeHtml(user ? (sent ? `${l.to_name}에게 보낸 편지` : `${l.from_name}의 편지`) : `${date(l.created_at)} 날씨와 운세`)}${user ? `<i class="letter-from${sent ? ' sent' : ''}">${sent ? '보냄' : '받음'}</i>` : ''}</b>
        <small>${user ? '' : (l.fortune?.text ? ico('fortune') + ' ' : '')}${escapeHtml((user ? l.body.replace(/\s+/g, ' ').slice(0, 30) : (l.fortune?.text || l.title)).slice(0, 40))} · ${date(l.created_at)}</small></span>
      </button>`;
    }).join('') : '<div class="menu-status">아직 받은 편지가 없어요.</div>';
  } catch (e) { box.innerHTML = `<div class="menu-status">${escapeHtml(e.message)}</div>`; }
}

// =====================================================================
// 우체통 (매일 17:00 까치가 상대방의 오늘 레시피 검색을 귀띔)
// =====================================================================
let hintList = [];

let hintUnread = 0, inquiryOpen = 0;
function setBadge(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = !n;
  el.textContent = n > 99 ? '99+' : String(n);
}
function setHintBadge(n) {
  hintUnread = n;
  setBadge('hintBadgeNav', n);
  updateMenuBadge();
}
function updateMenuBadge() {
  const total = hintUnread + inquiryOpen;
  setBadge('hintBadge', total);
  document.getElementById('menuBtn').setAttribute('aria-label', total ? `메뉴 열기 (새 소식 ${total}개)` : '메뉴 열기');
}

async function refreshHintBadge() {
  refreshInquiryNav();
  if (!myProfile) return setHintBadge(0);
  try {
    const { unread } = await api(`/api/hints?avatar=${myProfile.avatar}`);
    setHintBadge(unread);
  } catch {}
}

// =====================================================================
// 버전 기록 (data/versions.json): 사이드바 아래 현재 버전 + 설정 → 업데이트 목록(버전별 토글)
let versionData = null;
async function getVersions() {
  if (!versionData) {
    try { versionData = await (await fetch('data/versions.json', { cache: 'no-cache' })).json(); }
    catch { versionData = null; }
  }
  return versionData;
}
async function showVersionLabel() {
  const d = await getVersions();
  const el = document.getElementById('drawerVersion');
  if (el && d) el.textContent = d.current;
}
async function loadVersions() {
  const box = document.getElementById('versionList');
  const d = await getVersions();
  if (!d) { box.innerHTML = '<p class="settings-desc">목록을 불러오지 못했어요.</p>'; return; }
  document.getElementById('verNow').textContent = `현재 ${d.current}`;
  box.innerHTML = d.versions.map((v, i) => `
    <details class="ver-item"${i === 0 ? ' open' : ''}>
      <summary><b>${escapeHtml(v.version)}</b><span>${escapeHtml(v.title)}</span><small>${escapeHtml(v.date.slice(5).replace('-', '.'))}</small></summary>
      <ul>${v.changes.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
    </details>`).join('');
}
showVersionLabel();

// 낭만찾기: 월별 낭만 리스트 달력 (data/romance.json)
// =====================================================================
let romanceData = null;
const ROM_FIRST_YEAR = 2026;
const romNow = new Date();
let romYear = romNow.getFullYear() < ROM_FIRST_YEAR ? ROM_FIRST_YEAR : romNow.getFullYear();
let romMonth = romYear === romNow.getFullYear() ? romNow.getMonth() + 1 : 11;
let romOpenDay = null;
let romPendingDay = null; // 알림으로 들어오면 그 날짜 팝업을 바로 엶

// 알림(/?view=romance&day=2026-11-06) → 낭만 리스트 그 달로 가서 그날 팝업
function openRomanceFromLink(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  if (m) { romYear = +m[1]; romMonth = +m[2]; romPendingDay = +m[3]; }
  showPage('pageRomance');
}
const romMonths = (y) => (y === ROM_FIRST_YEAR ? [11, 12] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); // 2026년은 11·12월부터
const romKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

async function loadRomance() {
  if (!romanceData) {
    try { romanceData = await (await fetch('data/romance.json', { cache: 'no-cache' })).json(); }
    catch { romanceData = {}; }
  }
  if (!romMonths(romYear).includes(romMonth)) romMonth = romMonths(romYear)[0];
  delete romMarks[romKey(romYear, romMonth)];
  renderRomance();
  if (romPendingDay) { const d = romPendingDay; romPendingDay = null; openRomance(d); }
}

function moveRomanceYear(step) {
  romYear += step;
  if (!romMonths(romYear).includes(romMonth)) romMonth = romMonths(romYear)[0];
  renderRomance();
}

function pickRomanceMonth(m) { romMonth = m; renderRomance(); }

function romMarkHtml(d) {
  const who = (romMarks[romKey(romYear, romMonth)] || {})[d] || [];
  return who.length ? `<span class="rom-marks">${['boy', 'girl'].filter((a) => who.includes(a)).map((a) => `<i class="${a}"></i>`).join('')}</span>` : '';
}

function renderRomance() {
  const data = (romanceData || {})[romKey(romYear, romMonth)] || {};
  const days = data.days || {};
  document.getElementById('romYear').textContent = romYear;
  document.getElementById('romTitle').textContent = `${romMonth}월 낭만찾기`;
  document.getElementById('romTheme').innerHTML = `${ico('hearts')} ${escapeHtml(data.theme && Object.keys(days).length ? data.theme : '우리만의 작은 낭만')}`;
  document.getElementById('romTabs').innerHTML = romMonths(romYear).map(m =>
    `<button type="button" class="rom-tab${m === romMonth ? ' on' : ''}" onclick="pickRomanceMonth(${m})">${m}</button>`).join('');
  document.querySelector('.rom-tab.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });

  const first = new Date(romYear, romMonth - 1, 1).getDay();
  const count = new Date(romYear, romMonth, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let html = '<span class="rom-cell empty"></span>'.repeat(first);
  for (let d = 1; d <= count; d++) {
    const it = days[String(d)];
    const date = new Date(romYear, romMonth - 1, d);
    const wd = date.getDay();
    const cls = ['rom-cell', wd === 0 ? 'sun' : wd === 6 ? 'sat' : '', it ? '' : 'blank',
      +date === +today ? 'today' : '', date < today ? 'past' : ''].filter(Boolean).join(' ');
    html += it
      ? `<button type="button" class="${cls}" onclick="openRomance(${d})" aria-label="${romMonth}월 ${d}일 ${escapeHtml(it.title)}"><span class="rom-num">${d}</span><img src="icons/romance/${escapeHtml(it.art)}.svg" alt="" loading="lazy"><small>${escapeHtml(it.title)}</small>${romMarkHtml(d)}</button>`
      : `<span class="${cls}"><span class="rom-num">${d}</span></span>`;
  }
  document.getElementById('romGrid').innerHTML = html;
  if (!romMarks[romKey(romYear, romMonth)]) fetchRomanceMarks(romKey(romYear, romMonth));
  document.getElementById('romNote').textContent = Object.keys(days).length
    ? '날짜를 누르면 그날의 낭만이 크게 보여요'
    : `${romMonth}월의 낭만 리스트는 곧 채워져요`;
}

function openRomance(day) {
  const days = ((romanceData || {})[romKey(romYear, romMonth)] || {}).days || {};
  const it = days[String(day)];
  if (!it) return;
  romOpenDay = day;
  romEditing = false;
  const date = new Date(romYear, romMonth - 1, day);
  const wrap = document.querySelector('.rom-art-wrap');
  wrap.style.animation = 'none'; void wrap.offsetWidth; wrap.style.animation = '';
  document.getElementById('romModalArt').src = `icons/romance/${it.art}.svg`;
  document.getElementById('romModalDate').textContent = date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });
  document.getElementById('romModalTitle').textContent = it.title;
  document.getElementById('romModalPrev').disabled = !days[String(day - 1)];
  document.getElementById('romModalNext').disabled = !days[String(day + 1)];
  document.getElementById('romModal').hidden = false;
  loadRomanceDay(day);
}
function stepRomance(step) { if (romOpenDay) openRomance(romOpenDay + step); }
function closeRomance() { document.getElementById('romModal').hidden = true; romOpenDay = null; romEditing = false; }

// ----- 낭만 기록: 각자 글 또는 사진 하나, 내가 써야 상대방 것이 열림 -----
let romDay = null;       // 서버에서 받은 그날 기록 { day, mine, partner, partnerDone, canWrite }
let romEditing = false;  // 내 기록 수정 중
let romPhoto = '';
const romDayStr = (d) => `${romKey(romYear, romMonth)}-${String(d).padStart(2, '0')}`;

async function loadRomanceDay(day) {
  const board = document.getElementById('romBoard');
  board.innerHTML = '<p class="rom-empty">불러오는 중...</p>';
  try {
    const me = myProfile?.avatar || '';
    const d = await api(`/api/romance/${romDayStr(day)}?me=${me}`);
    if (romOpenDay !== day) return;
    romDay = d;
    renderRomanceBoard();
  } catch (e) {
    if (romOpenDay === day) board.innerHTML = `<p class="rom-empty">${escapeHtml(e.message)}</p>`;
  }
}

function romEntryHtml(e) { // 사진 · 글 둘 다 있으면 사진 아래 글
  return (e.photo ? `<img class="rom-entry-photo" src="${escapeHtml(e.photo)}" alt="낭만 사진">` : '')
    + (e.body ? `<p class="rom-entry-text${e.photo ? ' with-photo' : ''}">${escapeHtml(e.body)}</p>` : '');
}

function renderRomanceBoard() {
  const board = document.getElementById('romBoard');
  const d = romDay;
  const me = myProfile?.avatar;
  const myName = escapeHtml(myProfile?.name || '나');
  const pName = escapeHtml(partnerName() || '상대방');
  let mine;
  if (!me) {
    mine = '<p class="rom-empty">설정에서 내 프로필(男/女)을 먼저 골라주세요.</p>';
  } else if (d.mine && !romEditing) {
    mine = romEntryHtml(d.mine) + `<div class="rom-entry-btns">
      <button type="button" onclick="editRomanceEntry()">수정</button>
      <button type="button" onclick="deleteRomanceEntry()">지우기</button></div>`;
  } else if (!d.canWrite) {
    mine = '<p class="rom-empty">그날이 되면 기록할 수 있어요.</p>';
  } else {
    romPhoto = d.mine?.photo || '';
    mine = `<textarea id="romText" rows="3" maxlength="500" placeholder="오늘의 낭만을 적어주세요">${escapeHtml(d.mine?.body || '')}</textarea>
      <label class="rom-photo-pick" id="romPhotoPick">
        <input type="file" accept="image/*" id="romPhotoInput" hidden>
        <img id="romPhotoPrev" alt="" hidden>
        <span id="romPhotoHint">${ico('camera')} 사진 고르기</span>
      </label>
      <button type="button" class="rom-photo-clear" id="romPhotoClear" hidden onclick="clearRomancePhoto()">사진 빼기</button>
      <div class="rom-entry-btns">
        ${d.mine ? '<button type="button" onclick="cancelRomanceEdit()">취소</button>' : ''}
        <button type="button" class="primary" id="romSaveBtn" onclick="saveRomanceEntry()">등록하기</button>
      </div>`;
  }
  let partner;
  if (d.partner) partner = romEntryHtml(d.partner);
  else if (d.partnerDone) partner = `<p class="rom-empty locked">${ico('lock')} ${pName}님이 벌써 기록했어요!<br>나도 등록하면 볼 수 있어요.</p>`;
  else partner = `<p class="rom-empty">${pName}님은 아직 기록 전이에요.</p>`;

  board.innerHTML = `
    <div class="rom-slot"><div class="rom-slot-who">${myName}</div>${mine}</div>
    <div class="rom-slot"><div class="rom-slot-who">${pName}</div>${partner}</div>`;

  const input = document.getElementById('romPhotoInput');
  if (input) {
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      try { romPhoto = await resizeImage(file, 1080, 0.8); showRomancePhoto(); }
      catch (e) { uiAlert(e.message); }
    });
    showRomancePhoto();
  }
}

function clearRomancePhoto() { romPhoto = ''; const i = document.getElementById('romPhotoInput'); if (i) i.value = ''; showRomancePhoto(); }
function showRomancePhoto() {
  const img = document.getElementById('romPhotoPrev');
  if (!img) return;
  img.hidden = !romPhoto;
  if (romPhoto) img.src = romPhoto;
  document.getElementById('romPhotoHint').innerHTML = `${ico('camera')} ${romPhoto ? '다른 사진으로 바꾸기' : '사진도 같이 올리기 (선택)'}`;
  const clr = document.getElementById('romPhotoClear'); if (clr) clr.hidden = !romPhoto;
}
function editRomanceEntry() { romEditing = true; renderRomanceBoard(); }
function cancelRomanceEdit() { romEditing = false; renderRomanceBoard(); }

async function saveRomanceEntry() {
  const day = romOpenDay;
  const text = document.getElementById('romText').value.trim();
  if (!text && !romPhoto) return uiAlert('오늘의 낭만을 글이나 사진으로 남겨주세요.');
  const btn = document.getElementById('romSaveBtn');
  btn.disabled = true; btn.textContent = '등록 중...';
  try {
    await api(`/api/romance/${romDayStr(day)}`, {
      method: 'PUT',
      body: JSON.stringify({ me: myProfile.avatar, kind: romPhoto ? 'photo' : 'text', body: text, photo: romPhoto }),
    });
    romEditing = false;
    setRomanceMark(day, myProfile.avatar, true);
    if (romOpenDay === day) await loadRomanceDay(day);
  } catch (e) {
    uiAlert(e.message);
    btn.disabled = false; btn.textContent = '등록하기';
  }
}

async function deleteRomanceEntry() {
  const day = romOpenDay;
  if (!(await uiConfirm('내 낭만 기록을 지울까요?', { title: '기록 지우기', ok: '지우기', danger: true, sub: '지우면 상대방 기록도 다시 잠겨요' }))) return;
  try {
    await api(`/api/romance/${romDayStr(day)}?me=${myProfile.avatar}`, { method: 'DELETE' });
    setRomanceMark(day, myProfile.avatar, false);
    if (romOpenDay === day) await loadRomanceDay(day);
  } catch (e) { uiAlert(e.message); }
}

// 달력 표시: 그날 기록한 사람 (男 파랑 · 女 분홍 점)
const romMarks = {}; // { "2026-11": { 6: ['girl'] } }
async function fetchRomanceMarks(key, force) {
  if (romMarks[key] && !force) return;
  try {
    romMarks[key] = (await api(`/api/romance?month=${key}`)).marks || {};
    if (key === romKey(romYear, romMonth) && document.getElementById('pageRomance').style.display !== 'none') renderRomance();
  } catch {}
}
function setRomanceMark(day, avatar, on) {
  const key = romKey(romYear, romMonth);
  const m = (romMarks[key] ||= {});
  const list = (m[day] || []).filter((a) => a !== avatar);
  m[day] = on ? [...list, avatar] : list;
  renderRomance();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.getElementById('romModal').hidden) closeRomance(); });

// =====================================================================
// 문의하기(상대방) · 문의함(주인 = 설정의 owner, 지민)
// =====================================================================
let inquiries = [];
const isOwner = () => Boolean(myProfile && appSettings && myProfile.avatar === (appSettings.owner || 'girl'));

async function refreshInquiryNav() {
  const owner = isOwner();
  document.getElementById('navInquiryLabel').textContent = owner ? '문의함' : '문의하기';
  if (!owner) { inquiryOpen = 0; setBadge('inquiryBadgeNav', 0); updateMenuBadge(); return; }
  try {
    const { open } = await api('/api/inquiries');
    inquiryOpen = open;
    setBadge('inquiryBadgeNav', open);
    updateMenuBadge();
  } catch {}
}

function toggleInquiryForm(show) {
  document.getElementById('inquiryForm').hidden = !show;
  document.getElementById('inquiryOpenBtn').hidden = show;
  if (show) setTimeout(() => document.getElementById('inquiryText').focus(), 50);
}

async function loadInquiries() {
  const owner = isOwner();
  document.getElementById('inquiryTitle').textContent = owner ? '문의함' : '문의하기';
  document.getElementById('inquiryAdd').hidden = owner;
  toggleInquiryForm(false);
  const box = document.getElementById('inquiryList');
  try {
    const data = await api('/api/inquiries');
    inquiries = owner ? data.inquiries : data.inquiries.filter(q => !myProfile || q.from_avatar === myProfile.avatar || !q.from_avatar);
    if (owner) { inquiryOpen = data.open; setBadge('inquiryBadgeNav', data.open); updateMenuBadge(); }
    renderInquiries();
  } catch (e) { box.innerHTML = `<div class="menu-status">${escapeHtml(e.message)}</div>`; }
}

function renderInquiries() {
  const owner = isOwner();
  const box = document.getElementById('inquiryList');
  if (!inquiries.length) {
    box.innerHTML = `<div class="menu-status">${owner ? '아직 받은 문의가 없어요.' : '아직 남긴 문의가 없어요.'}</div>`;
    return;
  }
  const date = (t) => new Date(t).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  const item = (q) => {
    const done = q.status === 'done';
    return `
    <div class="agenda-card inq-item${done ? ' done' : ''}" data-id="${escapeHtml(q.id)}">
      ${owner
        ? `<button type="button" class="inq-check" aria-label="${done ? '해결됨 (다시 열기)' : '해결 완료'}" onclick="toggleInquiry('${escapeHtml(q.id)}')">${done ? ico('check') : ''}</button>`
        : `<span class="inq-check" aria-hidden="true">${done ? ico('check') : ''}</span>`}
      <div class="inq-main">
        <p class="inq-body">${escapeHtml(q.body)}</p>
        <div class="inq-meta">
          <span class="inq-pill${done ? ' done' : ''}">${done ? '해결 완료' : '확인 중'}</span>
          <span>${escapeHtml(date(q.created_at))}${owner && q.from_name ? ` · ${escapeHtml(q.from_name)}` : ''}${done && q.resolved_at ? ` → ${escapeHtml(date(q.resolved_at))} 해결` : ''}</span>
        </div>
        ${(q.replies || []).length ? `<div class="inq-replies">${q.replies.map((r) => `<div class="inq-reply">${escapeHtml(r.text)}<small>💬 ${escapeHtml(r.name || (r.from === 'boy' ? '男' : '女'))} · ${escapeHtml(date(r.at))}</small></div>`).join('')}</div>` : ''}
        <form class="inq-reply-form" onsubmit="replyInquiry(event, '${escapeHtml(q.id)}')">
          <textarea class="msg-input" maxlength="500" rows="1" placeholder="${owner ? '피드백 보내기' : '답장 쓰기'}"></textarea>
          <button type="submit" class="primary">보내기</button>
        </form>
        <div class="inq-actions">
          ${owner && !done ? `<button type="button" class="primary" onclick="toggleInquiry('${escapeHtml(q.id)}')">${ico('check')} 해결 완료</button>` : ''}
          ${!owner && !done ? `<button type="button" onclick="deleteInquiry('${escapeHtml(q.id)}')">취소하기</button>` : ''}
          ${owner && done ? `<button type="button" onclick="deleteInquiry('${escapeHtml(q.id)}')">지우기</button>` : ''}
        </div>
      </div>
    </div>`;
  };
  const open = inquiries.filter(q => q.status !== 'done');
  const done = inquiries.filter(q => q.status === 'done');
  box.innerHTML =
    (open.length ? `<div class="inq-section">${owner ? '해결할 문의' : '확인 중'} ${open.length}개</div>` + open.map(item).join('') : '') +
    (done.length ? `<div class="inq-section">해결 완료 ${done.length}개</div>` + done.map(item).join('') : '');
}

async function toggleInquiry(id) {
  const q = inquiries.find(x => x.id === id);
  if (!q) return;
  const done = q.status !== 'done';
  if (done && !(await uiConfirm(q.body.slice(0, 80), { title: '해결 완료로 표시할까요?', ok: '해결 완료', icon: 'check', sub: '상대방에게 "문의가 해결되었어요" 알림이 가요' }))) return;
  if (!done && !(await uiConfirm('이 문의를 다시 "확인 중"으로 돌릴까요?', { ok: '다시 열기' }))) return;
  try {
    const { inquiry } = await api(`/api/inquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status: done ? 'done' : 'open' }) });
    Object.assign(q, inquiry);
    inquiryOpen = inquiries.filter(x => x.status !== 'done').length;
    setBadge('inquiryBadgeNav', inquiryOpen); updateMenuBadge();
    renderInquiries();
  } catch (e) { uiAlert(e.message); }
}

async function replyInquiry(e, id) {
  e.preventDefault();
  const ta = e.target.querySelector('textarea'), btn = e.target.querySelector('button');
  const text = ta.value.trim();
  if (!text) return ta.focus();
  btn.disabled = true;
  try {
    const { replies } = await api(`/api/inquiries/${id}`, { method: 'POST', body: JSON.stringify({ reply: text, profileAvatar: myProfile && myProfile.avatar }) });
    const q = inquiries.find((x) => x.id === id);
    if (q) q.replies = replies;
    renderInquiries();
    uiAlert('피드백을 보냈어요!', { icon: 'letter', sub: '상대에게 알림이 가요' });
  } catch (err) { uiAlert(err.message); btn.disabled = false; }
}

async function deleteInquiry(id) {
  if (!(await uiConfirm('이 문의를 지울까요?', { ok: '지우기', danger: true }))) return;
  try {
    await api(`/api/inquiries/${id}`, { method: 'DELETE' });
    inquiries = inquiries.filter(x => x.id !== id);
    renderInquiries();
    refreshInquiryNav();
  } catch (e) { uiAlert(e.message); }
}

document.getElementById('inquiryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!myProfile) return openProfile('문의를 남길 프로필을 먼저 정해주세요');
  const input = document.getElementById('inquiryText');
  const text = input.value.trim();
  if (!text) return input.focus();
  const btn = document.getElementById('inquirySend');
  btn.disabled = true;
  try {
    await api('/api/inquiries', { method: 'POST', body: JSON.stringify({ body: text, profileAvatar: myProfile.avatar, profileName: myProfile.name }) });
    input.value = '';
    await loadInquiries();
    uiAlert('문의를 보냈어요!', { icon: 'letter', sub: '해결되면 알림으로 알려드릴게요' });
  } catch (err) { uiAlert(err.message); }
  finally { btn.disabled = false; }
});
setInterval(() => { if (document.visibilityState === 'visible') refreshHintBadge(); }, 60 * 1000);

async function loadHints() {
  const box = document.getElementById('hintList');
  if (!myProfile) {
    box.innerHTML = `<div class="menu-status">프로필(男/女)을 정하면 나에게 온 힌트가 보여요.<br><button type="button" class="retry-btn" onclick="navTo('pageSettings')">프로필 정하기</button></div>`;
    return;
  }
  try {
    const data = await api(`/api/hints?avatar=${myProfile.avatar}`);
    hintList = data.hints;
    setHintBadge(data.unread);
    renderHints();
  } catch (e) { box.innerHTML = `<div class="menu-status">${escapeHtml(e.message)}</div>`; }
}

function renderHints() {
  const box = document.getElementById('hintList');
  box.innerHTML = hintList.length ? hintList.map(h => `
    <div class="agenda-card hint-card${h.read_at ? '' : ' unread'}" data-id="${escapeHtml(h.id)}" role="button" tabindex="0" onclick="openHint('${escapeHtml(h.id)}')">
      ${h.read_at ? '' : '<span class="unread-dot" aria-label="안 읽음"></span>'}
      <div class="hint-head">
        <img class="hint-bird" src="icons/doodle/magpie.svg" alt="까치">
        <span><b>${escapeHtml(h.title)}</b>
        <small>${escapeHtml(new Date(h.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }))} · ${escapeHtml(h.about_name)}님 이야기</small></span>
      </div>
      ${h.body ? `<p class="hint-body">${escapeHtml(h.body)}</p>` : ''}
      <div class="hint-evidence">${ico('search')} ${escapeHtml(h.evidence)}</div>
      <button type="button" class="hint-delete" onclick="event.stopPropagation(); deleteHint('${escapeHtml(h.id)}')">지우기</button>
    </div>`).join('')
    : `<div class="menu-status"><img class="hint-bird" src="icons/doodle/magpie.svg" alt=""><br>오늘은 까치가 어떤 정보를 물어다 줄까요?</div>`;
}

async function openHint(id) {
  const card = document.querySelector(`.hint-card[data-id="${CSS.escape(id)}"]`);
  if (card) card.classList.toggle('open');
  const h = hintList.find(x => x.id === id);
  if (!h || h.read_at) return;
  h.read_at = new Date().toISOString();
  card?.classList.remove('unread');
  card?.querySelector('.unread-dot')?.remove();
  setHintBadge(hintList.filter(x => !x.read_at).length);
  api(`/api/hints/${id}`, { method: 'PATCH', body: '{}' }).catch(() => {});
}

async function deleteHint(id) {
  if (!(await uiConfirm('이 소식을 지울까요?', { ok: '지우기', danger: true, icon: 'magpie' }))) return;
  try {
    await api(`/api/hints/${id}`, { method: 'DELETE' });
    hintList = hintList.filter(x => x.id !== id);
    setHintBadge(hintList.filter(x => !x.read_at).length);
    renderHints();
  } catch (e) { uiAlert(e.message); }
}

async function loadLetter(id) {
  const box = document.getElementById('letterPaper');
  box.innerHTML = '<div class="menu-status">편지를 펼치는 중...</div>';
  try {
    const { letter: l } = await api(`/api/letters/${encodeURIComponent(id)}`);
    const day = new Date(l.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    if (l.kind === 'user') {
      box.innerHTML = `
        <div class="letter-head">${ico('letter')} <span>${escapeHtml(day)}</span></div>
        <h2 class="letter-title">${escapeHtml(l.to_name)}에게</h2>
        <div class="letter-user-body">${escapeHtml(l.body)}</div>
        <div class="letter-sign">— ${escapeHtml(l.from_name)}</div>`;
    } else {
      const w = l.weather || {};
      const f = l.fortune || {};
      box.innerHTML = `
        <div class="letter-head">${ico('letter')} <span>${escapeHtml(day)}</span></div>
        <h2 class="letter-title">${escapeHtml(l.title)}</h2>
        <section class="daily-block">
          <h4>${ico(WEATHER_ICON[w.tag] || 'cloud')} 오늘의 날씨</h4>
          <p>${nl2br(l.body)}</p>
          <p class="daily-weather-meta">${escapeHtml(w.area || '')} · ${escapeHtml(w.label || '')} · 최고 ${w.max}° / 최저 ${w.min}°${w.rain != null ? ` · 비 ${w.rain}%` : ''}</p>
        </section>
        ${f.text ? `<section class="daily-block fortune-block">
          <h4>${ico('fortune')} 오늘의 포춘쿠키</h4>
          <div class="fortune-paper"><p>${escapeHtml(f.text)}</p></div>
          <div class="fortune-lucky">${f.color ? `<span>행운의 색 · ${escapeHtml(f.color)}</span>` : ''}${f.item ? `<span>행운의 물건 · ${escapeHtml(f.item)}</span>` : ''}${f.number ? `<span>행운의 숫자 · ${escapeHtml(String(f.number))}</span>` : ''}</div>
        </section>` : ''}
        ${l.poem_text ? `<figure class="letter-poem"><figcaption>오늘의 시 · ${escapeHtml(l.poem_author)} 「${escapeHtml(l.poem_title)}」</figcaption><pre>${escapeHtml(l.poem_text)}</pre></figure>` : ''}`;
    }
  } catch (e) { box.innerHTML = `<div class="menu-status">${escapeHtml(e.message)}</div>`; }
}

// =====================================================================
// 배포 상태: 배포 중이면 "잠시 꽃단장 중" 안내, 새 버전이면 새로고침
// =====================================================================
let bootVersion = null;
async function checkStatus() {
  try {
    const r = await fetch('/api/status', { cache: 'no-store' });
    const d = await r.json();
    document.getElementById('maintenance').hidden = !d.maintenance;
    if (!bootVersion) {
      bootVersion = d.version;
      let last = null;
      try { last = localStorage.getItem('kk_version'); localStorage.setItem('kk_version', d.version); } catch {}
      if (last && last !== d.version && !d.maintenance) document.getElementById('updatedPopup').hidden = false;
    }
    else if (!d.maintenance && d.version !== bootVersion) location.reload();
  } catch {}
}
setInterval(() => { if (document.visibilityState === 'visible') checkStatus(); }, 30 * 1000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkStatus(); });
