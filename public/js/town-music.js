// 우리 동네 배경음악 (거실 블루투스 스피커): 파일 없이 브라우저에서 직접 연주 — 저작권 걱정 없음
//  - 로파이 재즈 12곡 · 통통 귀여운 노래 12곡. 곡마다 조·빠르기·코드 진행·멜로디(씨앗값으로 만듦)가 달라요
//  - 한 곡은 32마디(1분 반~2분), 끝나면 고른 장르 안에서 무작위로 다음 곡
// TOWN_MUSIC.playSong(id) · shuffle('lofi'|'cute'|'all') · next() · stop() · duck(true|false)
const TOWN_MUSIC = (() => {
  let ac = null, master = null, timer = null, crackle = null;
  let song = null, mode = 'all', step = 0, nextT = 0, notes = null, history = [];
  const VOL = 0.16, BARS = 32;
  const listeners = new Set();
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function ctx() {
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  // ---------- 악기 ----------
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function osc(type, m, t, dur, vol, { det = 0, lp = 2400, a = 0.01, vib = 0 } = {}) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = type; o.frequency.value = hz(m); o.detune.value = det; f.type = 'lowpass'; f.frequency.value = lp;
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.2; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.2); }
    env(g, t, a, vol, dur); o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + a + dur + 0.1);
  }
  const rhodes = (m, t, dur, vol = 0.08) => { osc('sine', m, t, dur, vol, { lp: 1800 }); osc('triangle', m, t, dur, vol * 0.35, { det: 4, lp: 1600 }); osc('sine', m + 12, t, dur * 0.4, vol * 0.12, { lp: 2000 }); };
  const flute = (m, t, dur, vol = 0.05) => osc('sine', m, t, dur, vol, { a: 0.06, vib: 3, lp: 3000 });
  const bell = (m, t, vol = 0.09) => { osc('sine', m, t, 0.45, vol, { a: 0.003, lp: 6000 }); osc('sine', m + 24, t, 0.12, vol * 0.25, { a: 0.002, lp: 8000 }); };
  const chip = (m, t, dur, vol = 0.03) => osc('square', m, t, dur, vol, { a: 0.005, lp: 2600 });
  const whistle = (m, t, dur, vol = 0.045) => osc('triangle', m, t, dur, vol, { a: 0.02, vib: 4, lp: 4000 });
  const bass = (m, t, dur, vol = 0.2, type = 'sine') => osc(type, m, t, dur, vol, { lp: 600 });
  let noiseBuf = null;
  function noise() { if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(); s.buffer = noiseBuf; return s; }
  function kick(t, vol = 0.4) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.002, vol, 0.22); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3); }
  function snare(t, vol = 0.12, tone = 1600) { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'bandpass'; f.frequency.value = tone; f.Q.value = 0.8; env(g, t, 0.002, vol, 0.16); n.connect(f).connect(g).connect(master); n.start(t, Math.random() * 0.5); n.stop(t + 0.2); }
  function hat(t, vol = 0.03) { const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); f.type = 'highpass'; f.frequency.value = 7000; env(g, t, 0.001, vol, 0.05); n.connect(f).connect(g).connect(master); n.start(t, Math.random() * 0.5); n.stop(t + 0.08); }
  function startCrackle() { if (crackle) return; const n = noise(), f = ac.createBiquadFilter(), g = ac.createGain(); n.loop = true; f.type = 'highpass'; f.frequency.value = 3000; g.gain.value = 0.011; n.connect(f).connect(g).connect(master); n.start(); crackle = n; }
  function stopCrackle() { if (crackle) { try { crackle.stop(); } catch {} crackle = null; } }

  // ---------- 곡 목록 ----------
  // [제목, 조(으뜸음 MIDI), 빠르기, 코드 진행(음계 몇 번째), 멜로디 씨앗, 멜로디 악기]
  const LOFI = [
    ['비 오는 윤슬 창가', 62, 72, [3, 2, 1, 0], 11, 'rhodes'], ['새벽 두 시 라면', 60, 70, [1, 4, 0, 5], 23, 'flute'], ['고추튀김과 막걸리', 65, 76, [5, 3, 4, 0], 37, 'rhodes'],
    ['406호의 오후', 63, 74, [0, 5, 1, 4], 41, 'bell'], ['커피 식기 전에', 57, 68, [3, 4, 2, 5], 53, 'flute'], ['물결로 산책', 64, 78, [0, 3, 4, 3], 67, 'rhodes'],
    ['이불 속 일요일', 61, 66, [5, 1, 4, 0], 71, 'bell'], ['LP판 위의 고양이', 58, 72, [1, 4, 2, 5], 83, 'rhodes'], ['막차 놓친 밤', 62, 70, [5, 4, 3, 4], 97, 'flute'],
    ['스탠드 불빛 아래', 60, 74, [3, 1, 4, 0], 101, 'bell'], ['느린 우체통', 55, 64, [0, 2, 3, 4], 113, 'rhodes'], ['장마 끝 무지개', 67, 80, [3, 4, 5, 0], 127, 'flute'],
  ];
  const CUTE = [
    ['GS 장보기 송', 72, 128, [0, 3, 4, 0], 5, 'bell'], ['통통 알 깨는 날', 69, 132, [0, 5, 3, 4], 17, 'chip'], ['깨물기 대작전', 67, 136, [0, 4, 5, 3], 29, 'whistle'],
    ['냥냥 고양이 산책', 74, 120, [3, 0, 4, 0], 31, 'bell'], ['노란 오토바이 부릉', 70, 140, [0, 4, 3, 4], 43, 'chip'], ['딸기 우유 한 모금', 72, 118, [0, 5, 1, 4], 59, 'whistle'],
    ['뽀뽀 세 번', 76, 126, [3, 4, 0, 0], 61, 'bell'], ['펫 이름 지어줘', 65, 124, [0, 3, 0, 4], 73, 'chip'], ['자전거 따릉따릉', 71, 134, [0, 4, 5, 4], 89, 'whistle'],
    ['냉장고 털기', 68, 130, [5, 3, 0, 4], 103, 'bell'], ['무드등 반짝반짝', 73, 116, [0, 1, 3, 4], 107, 'chip'], ['우리 동네 한 바퀴', 72, 122, [0, 5, 3, 4], 131, 'whistle'],
  ];
  const SONGS = [...LOFI.map((s, i) => ['lofi', i, ...s]), ...CUTE.map((s, i) => ['cute', i, ...s])]
    .map(([genre, i, title, key, bpm, prog, seed, lead]) => ({ id: `${genre}${i + 1}`, genre, title, key, bpm, prog, seed, lead }));
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const scaleNote = (key, deg, oct = 0) => key + MAJOR[((deg % 7) + 7) % 7] + 12 * (Math.floor(deg / 7) + oct);
  const chord = (key, deg, seventh) => [0, 2, 4, ...(seventh ? [6] : [])].map((k) => scaleNote(key - 12, deg + k));
  // 멜로디: 씨앗값으로 4마디 짜리 프레이즈 2개(A·B)를 만들어 AABA 로
  function makeNotes(s) {
    let x = s.seed * 9973 + 7; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const phrase = () => {
      const out = []; let deg = 2 + Math.floor(rnd() * 3);
      for (let bar = 0; bar < 4; bar++) for (let e = 0; e < 8; e++) {
        const rest = s.genre === 'lofi' ? rnd() < 0.45 : rnd() < 0.25;
        if (rest || (e % 2 === 1 && rnd() < 0.4)) { out.push(null); continue; }
        deg += [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rnd() * 8)]; deg = Math.max(0, Math.min(9, deg));
        const len = s.genre === 'lofi' ? (rnd() < 0.5 ? 3 : 1) : 1;
        out.push([scaleNote(s.key, s.prog[bar] + deg - s.prog[bar]), len]);
      }
      return out;
    };
    const A = phrase(), B = phrase();
    return [...A, ...A, ...B, ...A];
  }
  // ---------- 장르별 연주 ----------
  function playLofi(s, st, t, d) {
    const bar = Math.floor(st / 16), s16 = st % 16, deg = s.prog[bar % 4], ch = chord(s.key, deg, true);
    if (s16 === 0) ch.forEach((m, i) => rhodes(m, t + i * 0.012, d * 14, 0.065));
    if (s16 === 10 && bar % 2 === 1) ch.slice(1).forEach((m) => rhodes(m + 12, t, d * 4, 0.03));
    if (s16 === 0) bass(ch[0] - 12, t, d * 6); if (s16 === 8) bass(ch[2] - 12, t, d * 5, 0.16);
    if (s16 === 0 || s16 === 9) kick(t, 0.34); if (s16 === 4 || s16 === 12) snare(t, 0.1, 1400);
    if (s16 % 2 === 0) hat(t, s16 % 4 === 0 ? 0.03 : 0.018);
    if (s16 % 2 === 0) { const n = notes[(bar % 16) * 8 + s16 / 2]; if (n) lead(s, n[0], t, d * 2 * n[1]); }
  }
  function playCute(s, st, t, d) {
    const bar = Math.floor(st / 16), s16 = st % 16, deg = s.prog[bar % 4], ch = chord(s.key, deg, false);
    if (s16 % 2 === 0) { const n = notes[(bar % 16) * 8 + s16 / 2]; if (n) lead(s, n[0], t, d * 1.6); }
    if (s16 === 0 || s16 === 8) bass(ch[0] - 12, t, d * 1.6, 0.18, 'triangle'); if (s16 === 4 || s16 === 12) bass(ch[2] - 12, t, d * 1.4, 0.13, 'triangle');
    if (s16 % 4 === 2) ch.forEach((m) => chip(m, t, d * 0.8, 0.014));
    if (s16 === 0 || s16 === 8) kick(t, 0.3); if (s16 === 4 || s16 === 12) snare(t, 0.09, 2500);
    if (s16 % 4 === 2) hat(t, 0.025);
  }
  function lead(s, m, t, dur) {
    if (s.lead === 'rhodes') rhodes(m, t, dur, 0.05); else if (s.lead === 'flute') flute(m, t, dur); else if (s.lead === 'bell') bell(m, t); else if (s.lead === 'chip') chip(m, t, dur, 0.035); else whistle(m, t, dur);
  }
  // ---------- 재생 ----------
  function tick() {
    if (!song || !ac) return;
    const d = 60 / song.bpm / 4, sw = song.genre === 'lofi' ? 0.17 : 0;
    while (nextT < ac.currentTime + 0.2) {
      if (step >= BARS * 16) { next(); return; }
      try { (song.genre === 'lofi' ? playLofi : playCute)(song, step, nextT + (step % 2 ? d * sw : 0), d); } catch {}
      nextT += d; step++;
    }
  }
  function start(s) {
    ctx(); clearInterval(timer);
    song = s; notes = makeNotes(s); step = 0; nextT = ac.currentTime + 0.25;
    history = [...history.filter((id) => id !== s.id), s.id].slice(-6);
    master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(0.0001, ac.currentTime); master.gain.linearRampToValueAtTime(VOL, ac.currentTime + 1.2);
    if (s.genre === 'lofi') startCrackle(); else stopCrackle();
    timer = setInterval(tick, 40); tick();
    save(); listeners.forEach((f) => f(song));
  }
  function pick(genre) { const pool = SONGS.filter((s) => (genre === 'all' || s.genre === genre) && !history.slice(-4).includes(s.id)); const all = pool.length ? pool : SONGS.filter((s) => genre === 'all' || s.genre === genre); return all[Math.floor(Math.random() * all.length)]; }
  function shuffle(genre = 'all') { mode = genre; start(pick(genre)); }
  function playSong(id) { const s = SONGS.find((x) => x.id === id); if (s) { mode = mode || 'all'; start(s); } }
  function next() { start(pick(mode)); }
  function stop() {
    clearInterval(timer); timer = null; stopCrackle(); song = null;
    if (ac && master) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(0, ac.currentTime); }
    save(); listeners.forEach((f) => f(null));
  }
  function save() { try { localStorage.setItem('kk_town_bgm', JSON.stringify({ on: Boolean(song), mode })); } catch {} }
  function saved() { try { return JSON.parse(localStorage.getItem('kk_town_bgm') || 'null'); } catch { return null; } }
  function duck(on) { if (ac && master && song) master.gain.setTargetAtTime(on ? VOL * 0.2 : VOL, ac.currentTime, 0.2); }
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (song) ac.resume(); });
  return {
    playSong, shuffle, next, stop, duck, saved,
    get current() { return song; }, get mode() { return mode; },
    get progress() { return song ? Math.min(1, step / (BARS * 16)) : 0; },
    songs: SONGS, onChange: (f) => listeners.add(f),
  };
})();
