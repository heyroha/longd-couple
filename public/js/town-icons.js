// 우리 동네 아이콘: 메인 화면 손그림(doodle) 아이콘과 같은 스타일 (48칸 · 진한 갈색 둥근 선 · 파스텔 채움)
// 기본 이모지 대신 씀. TOWN_ICONS.img('bag') → <img> 태그, TOWN_ICONS.food(아이템) → 장보기 재료 그림
const TOWN_ICONS = (() => {
  const INK = '#4a3036';
  const wrap = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
  const blush = (y = 30, dx = 9) => `<ellipse cx="${24 - dx}" cy="${y}" rx="3" ry="1.8" fill="#ffb3c1" stroke="none"/><ellipse cx="${24 + dx}" cy="${y}" rx="3" ry="1.8" fill="#ffb3c1" stroke="none"/>`;
  const face = (fill, inner) => `<circle cx="24" cy="25" r="16" fill="${fill}"/>${inner}`;
  const eyes = (y = 23) => `<circle cx="18.5" cy="${y}" r="1.7" fill="${INK}" stroke="none"/><circle cx="29.5" cy="${y}" r="1.7" fill="${INK}" stroke="none"/>`;
  const I = {
    // ----- 화면 버튼 -----
    smile: face('#ffe08a', eyes() + '<path d="M18 29 Q24 34 30 29"/>' + blush()),
    bag: '<path d="M14 18 Q14 11 24 11 Q34 11 34 18 L36 38 Q36 41 33 41 L15 41 Q12 41 12 38 Z" fill="#ffc6d3"/><path d="M19 11 Q19 6 24 6 Q29 6 29 11"/><path d="M17 26 L31 26 L31 34 L17 34 Z" fill="#fff"/><path d="M24 26 L24 29"/>',
    target: '<circle cx="24" cy="24" r="15" fill="#d8f0ff"/><circle cx="24" cy="24" r="8" fill="#fff"/><circle cx="24" cy="24" r="2.5" fill="#ff6b81" stroke="none"/><path d="M24 4 L24 10 M24 38 L24 44 M4 24 L10 24 M38 24 L44 24"/>',
    mic: '<rect x="17" y="6" width="14" height="22" rx="7" fill="#bfeee0"/><path d="M21 12 L27 12 M21 17 L27 17 M21 22 L27 22" stroke-width="1.6"/><path d="M11 23 Q11 35 24 35 Q37 35 37 23"/><path d="M24 35 L24 42 M17 42 L31 42"/>',
    stop: '<path d="M17 6 L31 6 L42 17 L42 31 L31 42 L17 42 L6 31 L6 17 Z" fill="#ff8a8a"/><path d="M15 24 L33 24" stroke="#fff" stroke-width="4"/>',
    city: '<path d="M6 42 L42 42"/><rect x="8" y="20" width="12" height="22" fill="#ffd0da"/><rect x="20" y="10" width="14" height="32" fill="#cfe8ff"/><rect x="34" y="24" width="8" height="18" fill="#fff3c4"/><path d="M11 25 L11 27 M16 25 L16 27 M11 32 L11 34 M16 32 L16 34 M24 15 L24 17 M30 15 L30 17 M24 22 L24 24 M30 22 L30 24 M24 29 L24 31 M30 29 L30 31"/>',
    turn: '<path d="M36 18 A14 14 0 0 0 11 20" /><path d="M36 9 L36 18 L27 18"/><path d="M12 30 A14 14 0 0 0 37 28"/><path d="M12 39 L12 30 L21 30"/>',
    walkie: '<rect x="13" y="12" width="22" height="31" rx="5" fill="#bfeee0"/><path d="M19 12 L19 4"/><rect x="17" y="17" width="14" height="9" rx="2" fill="#fff"/><circle cx="19" cy="33" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="24" cy="33" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="29" cy="33" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="19" cy="38" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="24" cy="38" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="29" cy="38" r="1.4" fill="' + INK + '" stroke="none"/>',
    music: '<path d="M18 34 L18 10 L38 6 L38 30" /><ellipse cx="13.5" cy="35" rx="5.5" ry="4.5" fill="#c39cff"/><ellipse cx="33.5" cy="31" rx="5.5" ry="4.5" fill="#ff9ab0"/><path d="M18 16 L38 12" stroke-width="3"/>',
    musicOff: '<path d="M18 34 L18 10 L38 6 L38 30" stroke="#b8a8ad"/><ellipse cx="13.5" cy="35" rx="5.5" ry="4.5" fill="#e6dde0" stroke="#b8a8ad"/><ellipse cx="33.5" cy="31" rx="5.5" ry="4.5" fill="#e6dde0" stroke="#b8a8ad"/><path d="M8 8 L42 42" stroke="#ff6b81" stroke-width="3"/>',
    // ----- 감정 -----
    happy: face('#ffe08a', '<path d="M15 21 L18.5 18 L22 21 M26 21 L29.5 18 L33 21"/><path d="M16 28 Q24 38 32 28 Z" fill="#fff"/>' + blush(29, 11)) + '<path d="M40 8 L41.5 11.5 L45 12 L42.5 14.5 L43 18 L40 16 L37 18 L37.5 14.5 L35 12 L38.5 11.5 Z" fill="#ffd23a"/>',
    angry: face('#ff9e8a', '<path d="M15 18 L21 21 M33 18 L27 21"/>' + eyes(24) + '<path d="M18 32 Q24 28 30 32"/>') + '<path d="M36 6 L39 10 M42 8 L38 11 M38 4 L38.5 9 M43 12 L39 11" stroke="#e8343a" stroke-width="2.6"/>',
    sad: face('#cfe0ff', '<path d="M16 20 L21 22 M32 20 L27 22"/>' + eyes(25) + '<path d="M18 33 Q24 28 30 33"/><path d="M18.5 28 Q17 33 18.5 35 Q20 33 18.5 28 Z" fill="#7fc4ff" stroke-width="1.4"/>'),
    shy: face('#ffe0d0', '<path d="M16 23 Q18.5 21 21 23 M27 23 Q29.5 21 32 23"/><path d="M20 30 Q22 28 24 30 Q26 32 28 30"/><ellipse cx="15" cy="28" rx="4" ry="2.4" fill="#ff8fab" stroke="none"/><ellipse cx="33" cy="28" rx="4" ry="2.4" fill="#ff8fab" stroke="none"/>'),
    love: face('#ffe08a', '<path d="M15.5 20 Q15.5 17.5 18 18.5 Q20.5 17.5 20.5 20 Q20.5 22 18 24 Q15.5 22 15.5 20 Z" fill="#ff4f72" stroke-width="1.4"/><path d="M27.5 20 Q27.5 17.5 30 18.5 Q32.5 17.5 32.5 20 Q32.5 22 30 24 Q27.5 22 27.5 20 Z" fill="#ff4f72" stroke-width="1.4"/><path d="M18 30 Q24 35 30 30"/>' + blush(30, 11)),
    surprise: face('#ffe08a', '<circle cx="18.5" cy="22" r="2.6" fill="#fff"/><circle cx="29.5" cy="22" r="2.6" fill="#fff"/><circle cx="18.5" cy="22" r="1.1" fill="' + INK + '" stroke="none"/><circle cx="29.5" cy="22" r="1.1" fill="' + INK + '" stroke="none"/><ellipse cx="24" cy="31" rx="3" ry="4" fill="#fff"/>') + '<path d="M40 6 L40 13 M40 17 L40 18"/>',
    sulk: face('#ffd6a0', '<path d="M15 22 L21 22 M27 22 L33 22"/><circle cx="20" cy="23.5" r="1.4" fill="' + INK + '" stroke="none"/><circle cx="32" cy="23.5" r="1.4" fill="' + INK + '" stroke="none"/><path d="M20 31 L28 31"/>' + blush(29, 10)),
    sleepy: face('#e6dcff', '<path d="M15 24 Q18.5 26 22 24 M26 24 Q29.5 26 33 24"/><ellipse cx="24" cy="31" rx="2.4" ry="1.6"/>') + '<path d="M35 6 L42 6 L35 13 L42 13" stroke-width="2"/>',
    // ----- 인벤토리 칸 -----
    fridge: '<rect x="12" y="5" width="24" height="38" rx="4" fill="#d8f0ff"/><path d="M12 19 L36 19"/><path d="M16 11 L16 15 M16 24 L16 31"/><circle cx="29" cy="12" r="2.4" fill="#ffd23a"/>',
    recipe: '<path d="M12 8 L32 8 Q36 8 36 12 L36 40 L16 40 Q12 40 12 36 Z" fill="#fff3c4"/><path d="M18 16 L30 16 M18 22 L30 22 M18 28 L26 28"/><path d="M12 36 Q12 32 16 32 L36 32" />',
    shirt: '<path d="M16 8 L10 12 L5 20 L11 24 L14 20 L14 42 L34 42 L34 20 L37 24 L43 20 L38 12 L32 8 Q28 13 24 13 Q20 13 16 8 Z" fill="#cfe8ff"/><path d="M24 18 L24 22 M24 26 L24 30" stroke-width="2"/>',
    sofa: '<path d="M8 22 Q8 16 14 16 L34 16 Q40 16 40 22 L40 26 L8 26 Z" fill="#ffc6d3"/><rect x="5" y="24" width="38" height="11" rx="4" fill="#ffd9e2"/><path d="M10 35 L10 40 M38 35 L38 40"/>',
    // ----- 기타 -----
    card: '<rect x="5" y="11" width="38" height="26" rx="4" fill="#bfeee0"/><path d="M5 19 L43 19" stroke-width="4"/><path d="M11 29 L21 29"/><circle cx="35" cy="29" r="3" fill="#ffd23a"/>',
    bike: '<circle cx="12" cy="31" r="8" fill="#fff"/><circle cx="36" cy="31" r="8" fill="#fff"/><path d="M12 31 L20 18 L32 18 L36 31 M20 18 L24 31 L32 18 M18 13 L23 13 M30 12 L34 12 L32 18" stroke="' + INK + '"/><rect x="33" y="15" width="8" height="5" fill="#ffd23a"/>',
    moto: '<circle cx="12" cy="33" r="6.5" fill="#fff"/><circle cx="36" cy="33" r="6.5" fill="#fff"/><path d="M6 25 L20 25 L25 31 L32 31 L35 16 L39 16 L38 27 L36 33" fill="#ffd21f"/><path d="M8 21 L19 21" stroke-width="3"/><circle cx="39" cy="20" r="2" fill="#fff7c2"/>',
    helmet: '<path d="M8 30 Q8 10 24 10 Q40 10 40 30 L40 34 L8 34 Z" fill="#ffd21f"/><path d="M24 22 L40 22 L40 30 L26 30 Q24 30 24 28 Z" fill="#6a8bb8"/><path d="M14 16 Q18 13 22 13" stroke="#fff" stroke-width="2.4"/>',
    walk: '<path d="M10 30 Q10 22 18 22 L26 22 Q30 26 36 28 Q42 30 42 35 L42 38 L10 38 Z" fill="#ffc6d3"/><path d="M10 34 L42 34"/><path d="M20 22 L21 27 M25 22 L26 27"/>',
    egg: '<path d="M24 6 Q36 14 36 28 Q36 42 24 42 Q12 42 12 28 Q12 14 24 6 Z" fill="#fff7e8"/><circle cx="19" cy="24" r="2.4" fill="#ff8fab" stroke="none"/><circle cx="28" cy="30" r="2.6" fill="#7fd3c6" stroke="none"/><circle cx="26" cy="18" r="1.8" fill="#ffd23a" stroke="none"/><circle cx="20" cy="34" r="1.8" fill="#b48cff" stroke="none"/>',
    pin: '<circle cx="24" cy="16" r="9" fill="#ff8a8a"/><path d="M24 25 L24 43"/><circle cx="21" cy="13" r="2.4" fill="#fff" stroke="none"/>',
    photo: '<rect x="8" y="8" width="32" height="34" rx="2" fill="#fff"/><rect x="12" y="12" width="24" height="20" fill="#cfe8ff"/><path d="M12 28 L20 21 L26 27 L30 24 L36 30"/><circle cx="30" cy="17" r="2.4" fill="#ffd23a"/><circle cx="24" cy="6" r="3" fill="#ff6b81"/>',
    cart: '<path d="M4 9 L10 9 L15 32 L37 32 L41 15 L12 15"/><path d="M14 15 L40 15 L37 28 L16 28 Z" fill="#cfe8ff"/><circle cx="18" cy="39" r="3" fill="#fff"/><circle cx="34" cy="39" r="3" fill="#fff"/>',
    pan: '<ellipse cx="20" cy="26" rx="15" ry="10" fill="#b8c1ca"/><ellipse cx="20" cy="24" rx="11" ry="6" fill="#fff3c4"/><circle cx="20" cy="24" r="3.4" fill="#ffd23a" stroke="none"/><path d="M34 22 L45 16"/>',
    star: '<path d="M24 5 L29.5 17 L42 18.5 L32.5 27 L35.5 40 L24 33.5 L12.5 40 L15.5 27 L6 18.5 L18.5 17 Z" fill="#ffd23a"/>',
    check: '<circle cx="24" cy="24" r="17" fill="#bfeee0"/><path d="M15 24 L22 31 L34 17"/>',
    coin: '<circle cx="24" cy="24" r="17" fill="#ffd23a"/><circle cx="24" cy="24" r="12"/><path d="M20 18 L24 30 L28 18 M18 23 L30 23"/>',
    // ----- 펫 돌보기 -----
    sponge: '<rect x="8" y="16" width="30" height="20" rx="5" fill="#ffe08a"/><circle cx="15" cy="23" r="1.6" fill="#e0b84a" stroke="none"/><circle cx="24" cy="29" r="2" fill="#e0b84a" stroke="none"/><circle cx="31" cy="22" r="1.4" fill="#e0b84a" stroke="none"/><circle cx="38" cy="10" r="4" fill="#d8f0ff"/><circle cx="31" cy="7" r="2.6" fill="#d8f0ff"/>',
    guitar: '<path d="M22 22 Q14 18 10 25 Q6 32 12 37 Q18 42 24 37 Q30 32 26 26 Z" fill="#f2a55a"/><circle cx="17" cy="30" r="3" fill="' + INK + '" stroke="none"/><path d="M24 24 L40 8"/><rect x="37" y="4" width="7" height="7" rx="2" fill="#8a5a3c" transform="rotate(45 40.5 7.5)"/>',
    hands: '<path d="M6 26 Q6 38 24 40 Q42 38 42 26 Q36 30 24 30 Q12 30 6 26 Z" fill="#ffe0d0"/><path d="M19 15 Q19 11 22 12 Q24 13 24 16 Q24 13 26 12 Q29 11 29 15 Q29 19 24 23 Q19 19 19 15 Z" fill="#ff4f72"/>',
    knock: '<path d="M16 42 L16 24 Q16 20 19 20 Q22 20 22 24 L22 8 Q22 5 25 5 Q28 5 28 8 L28 22 Q28 19 31 19 Q34 19 34 22 L34 34 Q34 42 26 42 Z" fill="#ffe0d0"/><path d="M38 8 L42 5 M40 14 L45 13 M8 10 L12 13"/>',
    talk: '<path d="M8 10 Q8 6 12 6 L36 6 Q40 6 40 10 L40 28 Q40 32 36 32 L20 32 L12 40 L13 32 Q8 32 8 28 Z" fill="#fff3c4"/><circle cx="17" cy="19" r="2" fill="' + INK + '" stroke="none"/><circle cx="24" cy="19" r="2" fill="' + INK + '" stroke="none"/><circle cx="31" cy="19" r="2" fill="' + INK + '" stroke="none"/>',
    plate: '<ellipse cx="24" cy="30" rx="19" ry="9" fill="#fff"/><ellipse cx="24" cy="28" rx="11" ry="5" fill="#ffd0a0"/><path d="M18 14 Q20 10 18 6 M24 14 Q26 10 24 6 M30 14 Q32 10 30 6" stroke-width="2"/>',
    balloon: '<ellipse cx="24" cy="18" rx="12" ry="14" fill="#ff8fab"/><path d="M22 32 L26 32 L24 35 Z" fill="#ff8fab"/><path d="M24 35 Q20 40 24 44"/><ellipse cx="19" cy="13" rx="2.6" ry="4" fill="#fff" stroke="none"/>',
    moon: '<path d="M30 6 Q14 8 14 24 Q14 40 30 42 Q18 34 18 24 Q18 14 30 6 Z" fill="#ffe08a"/><path d="M34 14 L35 17 L38 18 L35 19 L34 22 L33 19 L30 18 L33 17 Z" fill="#fff3c4"/>',
    paw: '<ellipse cx="24" cy="31" rx="9" ry="8" fill="#ffc6d3"/><circle cx="13" cy="21" r="4" fill="#ffc6d3"/><circle cx="20" cy="13" r="4" fill="#ffc6d3"/><circle cx="28" cy="13" r="4" fill="#ffc6d3"/><circle cx="35" cy="21" r="4" fill="#ffc6d3"/>',
    home: '<path d="M6 24 L24 8 L42 24"/><path d="M11 21 L11 41 L37 41 L37 21" fill="#ffd0da"/><path d="M20 41 L20 30 L28 30 L28 41" fill="#fff"/><path d="M22 19 Q22 16 24 17 Q26 16 26 19 Q26 21 24 23 Q22 21 22 19 Z" fill="#ff4f72" stroke-width="1.2"/>',
    berry: '<circle cx="17" cy="30" r="9" fill="#ff6b6b"/><circle cx="31" cy="28" r="8" fill="#ff8a6b"/><path d="M17 21 Q20 12 26 10 M31 20 Q28 13 26 10"/><path d="M26 10 Q32 6 36 10 Q31 13 26 10 Z" fill="#7cc36a"/><circle cx="14" cy="27" r="1.6" fill="#fff" stroke="none"/>',
    drop: '<path d="M24 5 Q38 22 38 30 Q38 42 24 42 Q10 42 10 30 Q10 22 24 5 Z" fill="#9fd4ff"/><path d="M17 30 Q17 36 22 37" stroke="#fff" stroke-width="2.4"/>',
    soup: '<path d="M6 22 L42 22 Q42 38 24 40 Q6 38 6 22 Z" fill="#ffe08a"/><ellipse cx="24" cy="22" rx="18" ry="3.4" fill="#ffd23a"/><path d="M17 15 Q19 11 17 7 M24 15 Q26 11 24 7 M31 15 Q33 11 31 7" stroke-width="2"/>',
    mushroom: '<path d="M6 24 Q6 8 24 8 Q42 8 42 24 Z" fill="#c39cff"/><path d="M17 24 L17 38 Q17 41 20 41 L28 41 Q31 41 31 38 L31 24" fill="#fff3e0"/><circle cx="16" cy="16" r="2.4" fill="#fff" stroke="none"/><circle cx="29" cy="13" r="2" fill="#fff" stroke="none"/><circle cx="34" cy="19" r="1.6" fill="#fff" stroke="none"/>',
    // ----- 가구 -----
    bed: '<rect x="5" y="22" width="38" height="12" rx="2" fill="#cfe8ff"/><path d="M5 14 L5 40 M43 26 L43 40"/><rect x="8" y="17" width="11" height="6" rx="3" fill="#fff"/><path d="M20 22 L43 22" />',
    mirror: '<ellipse cx="24" cy="18" rx="11" ry="13" fill="#d8f0ff"/><path d="M19 12 L23 9 M18 17 L26 10" stroke="#fff" stroke-width="2"/><path d="M12 33 L36 33 L36 42 L12 42 Z" fill="#ffd0da"/><path d="M24 31 L24 33"/>',
    drawer: '<rect x="9" y="8" width="30" height="32" rx="3" fill="#f2d3a8"/><path d="M9 19 L39 19 M9 30 L39 30"/><path d="M21 13.5 L27 13.5 M21 24.5 L27 24.5 M21 35 L27 35"/><path d="M12 40 L12 43 M36 40 L36 43"/>',
    plant: '<path d="M15 30 L33 30 L30 43 L18 43 Z" fill="#f2a55a"/><path d="M24 30 Q24 18 24 12"/><path d="M24 22 Q14 22 12 12 Q22 12 24 22 Z" fill="#7cc36a"/><path d="M24 18 Q34 18 36 8 Q26 8 24 18 Z" fill="#5fae4e"/>',
    rug: '<rect x="5" y="14" width="38" height="20" rx="3" fill="#ffd0da"/><rect x="10" y="18" width="28" height="12" rx="2" fill="#fff3c4"/><path d="M5 18 L2 18 M5 24 L2 24 M5 30 L2 30 M43 18 L46 18 M43 24 L46 24 M43 30 L46 30"/>',
    tv: '<rect x="6" y="10" width="36" height="24" rx="3" fill="#cfe8ff"/><path d="M12 16 L18 16" stroke="#fff" stroke-width="2.4"/><path d="M18 40 L30 40 M24 34 L24 40"/>',
    bookshelf: '<rect x="9" y="6" width="30" height="36" rx="2" fill="#f2d3a8"/><path d="M9 18 L39 18 M9 30 L39 30"/><path d="M14 9 L14 17 M18 10 L18 17 M23 21 L23 29 M28 22 L28 29 M15 33 L15 41" stroke="#ff6b81"/><path d="M33 9 L36 17" stroke="#7fbfff"/>',
    table: '<ellipse cx="24" cy="19" rx="19" ry="7" fill="#f2d3a8"/><path d="M11 23 L11 40 M37 23 L37 40 M24 26 L24 40"/><circle cx="24" cy="17" r="3" fill="#fff"/>',
    chair: '<path d="M14 6 L14 26 L34 26 L34 6 Z" fill="#cfe8ff"/><rect x="11" y="24" width="26" height="6" rx="2" fill="#e8f4ff"/><path d="M14 30 L14 42 M34 30 L34 42"/>',
    monitor: '<rect x="6" y="8" width="36" height="24" rx="3" fill="#bfeee0"/><path d="M12 14 L22 14 M12 19 L28 19" stroke="#fff" stroke-width="2.4"/><path d="M18 40 L30 40 M24 32 L24 40"/>',
    wardrobe: '<rect x="8" y="5" width="32" height="37" rx="3" fill="#f2d3a8"/><path d="M24 5 L24 42"/><path d="M20 20 L20 26 M28 20 L28 26"/><path d="M11 42 L11 45 M37 42 L37 45"/>',
    glasstable: '<path d="M6 18 L42 18 L38 24 L10 24 Z" fill="#d8f0ff"/><path d="M12 24 L12 40 M36 24 L36 40"/><path d="M14 20 L20 20" stroke="#fff" stroke-width="2"/>',
    lamp: '<path d="M14 18 L34 18 L30 6 L18 6 Z" fill="#fff3c4"/><path d="M24 18 L24 40 M16 41 L32 41"/><path d="M16 24 L12 30 M32 24 L36 30" stroke="#ffd23a"/>',
    moodlamp: '<path d="M8 24 Q8 8 24 8 Q40 8 40 24 Z" fill="#ffb3e0"/><path d="M20 24 L20 36 L28 36 L28 24" fill="#fff3e0"/><path d="M14 41 L34 41"/><circle cx="17" cy="16" r="2" fill="#fff" stroke="none"/><path d="M42 6 L44 4 M44 12 L47 12 M4 8 L6 10" stroke="#ff8fd0"/>',
    pethouse: '<path d="M6 22 L24 8 L42 22" fill="#ff9eb5"/><path d="M10 20 L10 41 L38 41 L38 20" fill="#f3dcb8"/><path d="M18 41 Q18 29 24 29 Q30 29 30 41" fill="#6b4a35"/><path d="M22 15 Q22 13 24 14 Q26 13 26 15 Q26 17 24 18 Q22 17 22 15 Z" fill="#ff4f72" stroke-width="1.2"/>',
    bulb: '<path d="M24 6 Q36 6 36 18 Q36 25 30 29 L30 34 L18 34 L18 29 Q12 25 12 18 Q12 6 24 6 Z" fill="#fff3c4"/><path d="M19 39 L29 39 M21 43 L27 43"/>',
    cat: '<path d="M10 16 L13 6 L20 12 L28 12 L35 6 L38 16 Q42 30 24 40 Q6 30 10 16 Z" fill="#f6b25a"/><circle cx="18" cy="22" r="1.7" fill="' + INK + '" stroke="none"/><circle cx="30" cy="22" r="1.7" fill="' + INK + '" stroke="none"/><path d="M22 27 L24 29 L26 27 M8 26 L14 27 M40 26 L34 27"/>',
  };
  // 이름이 없으면 기본(별)
  const svg = (name) => wrap(I[name] || I.star);
  const uri = (name) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(name))}`;
  const img = (name, cls = 'ti') => `<img class="${cls}" src="icons/town/${I[name] ? name : 'star'}.svg" alt="">`; // 파일로 (캐시됨)

  // ----- 장보기 재료: 모양 틀 + 색 (재료마다 이모지 대신) -----
  const F = {
    leaf: (c) => `<path d="M24 42 Q10 34 12 18 Q22 20 24 42 Z" fill="${c}"/><path d="M24 42 Q38 34 36 18 Q26 20 24 42 Z" fill="${c}"/><path d="M24 42 Q20 22 24 6 Q28 22 24 42 Z" fill="#7cc36a"/>`,
    round: (c) => `<circle cx="24" cy="27" r="15" fill="${c}"/><path d="M24 12 Q24 7 27 5"/><path d="M26 10 Q33 5 37 9 Q31 13 26 10 Z" fill="#7cc36a"/><ellipse cx="18" cy="22" rx="3" ry="4" fill="#fff" stroke="none" opacity=".55"/>`,
    long: (c) => `<path d="M14 8 Q8 10 12 16 L32 42 Q36 44 37 40 Z" fill="${c}"/><path d="M14 8 Q10 2 6 4 M14 8 Q14 2 18 2" stroke="#5fae4e"/><path d="M18 18 L21 17 M24 26 L27 25 M29 33 L32 32"/>`,
    bulb: (c) => `<path d="M24 8 Q24 14 30 18 Q40 24 36 34 Q32 42 24 42 Q16 42 12 34 Q8 24 18 18 Q24 14 24 8 Z" fill="${c}"/><path d="M24 8 L24 3 M20 42 L20 45 M28 42 L28 45"/><path d="M20 22 Q16 30 20 38" stroke-width="1.6"/>`,
    meat: (c) => `<path d="M8 22 Q8 10 22 10 Q40 10 40 24 Q40 38 24 38 Q8 38 8 22 Z" fill="${c}"/><path d="M14 20 Q22 16 30 22 M16 28 Q24 24 32 30" stroke="#fff" stroke-width="2.2"/><circle cx="31" cy="17" r="3" fill="#fff"/>`,
    fish: (c) => `<path d="M6 24 Q16 12 30 16 Q36 18 38 24 Q36 30 30 32 Q16 36 6 24 Z" fill="${c}"/><path d="M38 24 L45 16 L45 32 Z" fill="${c}"/><circle cx="14" cy="22" r="1.8" fill="${INK}" stroke="none"/><path d="M22 18 Q26 24 22 30"/>`,
    shrimp: (c) => `<path d="M36 10 Q18 6 12 20 Q8 32 20 36 L26 32 Q16 28 20 20 Q24 14 34 16 Z" fill="${c}"/><path d="M20 36 L14 42 L24 40 Z" fill="${c}"/><circle cx="33" cy="12" r="1.4" fill="${INK}" stroke="none"/><path d="M38 10 L44 6 M38 12 L44 12"/>`,
    egg: (c) => `<path d="M24 6 Q36 14 36 28 Q36 42 24 42 Q12 42 12 28 Q12 14 24 6 Z" fill="${c}"/><ellipse cx="19" cy="22" rx="2.4" ry="4" fill="#fff" stroke="none" opacity=".6"/>`,
    carton: (c) => `<path d="M14 14 L24 6 L34 14 L34 42 L14 42 Z" fill="#fff"/><path d="M14 14 L34 14"/><rect x="14" y="22" width="20" height="12" fill="${c}"/><path d="M24 6 L24 14"/>`,
    bottle: (c) => `<path d="M20 4 L28 4 L28 12 Q34 16 34 22 L34 42 L14 42 L14 22 Q14 16 20 12 Z" fill="${c}"/><rect x="14" y="24" width="20" height="10" fill="#fff"/><path d="M20 8 L28 8"/>`,
    can: (c) => `<rect x="12" y="10" width="24" height="32" rx="4" fill="${c}"/><ellipse cx="24" cy="10" rx="12" ry="3" fill="#dfe6ea"/><rect x="12" y="20" width="24" height="12" fill="#fff"/>`,
    jar: (c) => `<rect x="14" y="6" width="20" height="7" rx="2" fill="#e8343a"/><path d="M12 15 Q12 13 14 13 L34 13 Q36 13 36 15 L36 40 Q36 42 34 42 L14 42 Q12 42 12 40 Z" fill="${c}"/><rect x="16" y="22" width="16" height="10" rx="2" fill="#fff"/>`,
    bag: (c) => `<path d="M12 10 L36 10 L38 42 L10 42 Z" fill="${c}"/><path d="M12 10 L16 6 L32 6 L36 10"/><ellipse cx="24" cy="26" rx="7" ry="6" fill="#fff"/>`,
    noodle: (c) => `<path d="M6 22 L42 22 Q42 38 24 40 Q6 38 6 22 Z" fill="#fff3e0"/><path d="M10 22 Q14 14 18 22 Q22 14 26 22 Q30 14 34 22 Q38 14 40 22" stroke="${c}" stroke-width="3"/><path d="M30 4 L22 26 M36 6 L26 26"/>`,
    bowl: (c) => `<path d="M6 24 L42 24 Q42 40 24 42 Q6 40 6 24 Z" fill="${c}"/><path d="M8 24 Q12 12 24 12 Q36 12 40 24 Z" fill="#fff"/><circle cx="18" cy="18" r="1.4" fill="#e8e3d6" stroke="none"/>`,
    bread: (c) => `<path d="M8 22 Q8 10 24 10 Q40 10 40 22 Q40 26 36 26 L36 40 L12 40 L12 26 Q8 26 8 22 Z" fill="${c}"/><path d="M14 26 L34 26" stroke-width="1.6"/>`,
    wedge: (c) => `<path d="M6 34 L42 34 L42 22 L10 12 Z" fill="${c}"/><path d="M6 34 L10 12"/><circle cx="22" cy="27" r="2.4" fill="#fff" stroke="none"/><circle cx="33" cy="23" r="2" fill="#fff" stroke="none"/>`,
    block: (c) => `<path d="M10 18 L24 10 L38 18 L38 34 L24 42 L10 34 Z" fill="${c}"/><path d="M10 18 L24 26 L38 18 M24 26 L24 42"/>`,
    shroom: (c) => `<path d="M8 24 Q8 8 24 8 Q40 8 40 24 Z" fill="${c}"/><path d="M18 24 L18 40 L30 40 L30 24" fill="#fff3e0"/>`,
    corn: (c) => `<ellipse cx="24" cy="22" rx="9" ry="16" fill="${c}"/><path d="M18 14 L30 14 M16 20 L32 20 M16 26 L32 26 M18 32 L30 32"/><path d="M15 30 Q8 40 18 44 Q22 34 24 38 Q26 34 30 44 Q40 40 33 30" fill="#7cc36a"/>`,
    grape: (c) => `<circle cx="18" cy="16" r="5" fill="${c}"/><circle cx="29" cy="16" r="5" fill="${c}"/><circle cx="24" cy="25" r="5" fill="${c}"/><circle cx="14" cy="25" r="5" fill="${c}"/><circle cx="33" cy="25" r="5" fill="${c}"/><circle cx="19" cy="34" r="5" fill="${c}"/><circle cx="29" cy="34" r="5" fill="${c}"/><path d="M24 11 L26 4"/>`,
    banana: (c) => `<path d="M8 14 Q12 40 40 34 Q42 30 38 30 Q18 32 14 12 Z" fill="${c}"/><path d="M8 14 L10 8 L14 12"/>`,
    leg: (c) => `<path d="M12 18 Q12 6 24 6 Q36 6 36 18 Q36 30 26 32 L22 32 Q12 30 12 18 Z" fill="${c}"/><path d="M22 32 L20 40 M26 32 L28 40"/><circle cx="18" cy="42" r="3" fill="#fff"/><circle cx="30" cy="42" r="3" fill="#fff"/>`,
    cake: (c) => `<path d="M8 22 L40 22 L40 40 L8 40 Z" fill="#fff3e0"/><path d="M8 22 Q24 12 40 22" fill="${c}"/><path d="M8 30 L40 30" stroke="${c}" stroke-width="3"/><circle cx="24" cy="12" r="3.4" fill="#e8343a"/>`,
    cup: (c) => `<path d="M12 12 L36 12 L32 42 L16 42 Z" fill="${c}"/><path d="M10 12 L38 12"/><path d="M26 12 L30 3"/>`,
    // 술병 모양들
    wbottle: (c) => `<path d="M21 4 L27 4 L27 14 Q33 18 33 24 L33 43 L15 43 L15 24 Q15 18 21 14 Z" fill="${c}"/><rect x="15" y="27" width="18" height="10" fill="#fff3e0"/><path d="M21 8 L27 8"/>`,
    sbottle: (c) => `<path d="M21 4 L27 4 L27 12 Q32 15 32 20 L32 43 L16 43 L16 20 Q16 15 21 12 Z" fill="${c}"/><rect x="16" y="24" width="16" height="11" fill="#fff"/><path d="M19 28 L29 28 M19 31 L26 31" stroke="#3aa55a" stroke-width="1.6"/>`,
    square: (c) => `<rect x="20" y="4" width="8" height="7" rx="1" fill="#3a2a22"/><path d="M14 13 L34 13 L35 43 L13 43 Z" fill="${c}"/><rect x="16" y="22" width="16" height="12" fill="#fff3e0"/><path d="M19 27 L29 27" stroke="#c0392b" stroke-width="1.6"/>`,
    pot: (c) => `<path d="M17 8 L31 8 L31 12 Q40 16 40 28 Q40 42 24 42 Q8 42 8 28 Q8 16 17 12 Z" fill="${c}"/><path d="M14 22 Q24 26 34 22" stroke="#fff3e0"/><ellipse cx="24" cy="8" rx="7" ry="2" fill="#5a3a22"/>`,
    sheet: (c) => `<rect x="8" y="12" width="32" height="24" rx="2" fill="${c}"/><path d="M14 18 L34 18 M14 24 L34 24 M14 30 L28 30" stroke="#5f8f45" stroke-width="1.6"/>`,
  };
  // 상품 id → [모양, 색]
  const FOOD = {
    onion: ['bulb', '#f6d6a8'], gonion: ['long', '#d8f0c0'], garlic: ['bulb', '#f8f2e6'], potato: ['round', '#d9b07a'], sweetpotato: ['long', '#b05a7a'], carrot: ['long', '#f08a2b'],
    cabbage: ['round', '#bfe6a0'], napa: ['leaf', '#d8f0c0'], lettuce: ['leaf', '#8fd07a'], spinach: ['leaf', '#4f9a45'], zucchini: ['long', '#7cc36a'], cucumber: ['long', '#4f9a45'],
    chili: ['long', '#e8343a'], pepper: ['round', '#f2c94c'], broccoli: ['leaf', '#3f8f45'], bean: ['long', '#f8f2c6'], mushroom: ['shroom', '#c8946a'], radish: ['long', '#f8f8f0'],
    tomato: ['round', '#ff5a4a'], corn: ['corn', '#ffd23a'], perilla: ['leaf', '#5fae4e'], ginger: ['bulb', '#e0b878'],
    apple: ['round', '#ff4f5a'], banana: ['banana', '#ffd23a'], strawberry: ['round', '#ff4f72'], grape: ['grape', '#b8e06a'], orange: ['round', '#ff9a2b'], lemon: ['round', '#ffe24a'],
    avocado: ['egg', '#7cb342'], peach: ['round', '#ffb3a0'], melon: ['round', '#c8e6a0'], blueberry: ['grape', '#6a7ad8'], watermelon: ['round', '#5fae4e'], kiwi: ['round', '#a87a4a'],
    porkbelly: ['meat', '#ffb3a8'], porkneck: ['meat', '#f4998a'], porkfront: ['meat', '#f8a898'], beefbulgogi: ['meat', '#d8605a'], beefsteak: ['meat', '#c0392b'], beefbrisket: ['meat', '#e8786b'],
    chicken: ['leg', '#f6c08a'], duck: ['meat', '#c8784a'], bacon: ['meat', '#e86a5a'], ham: ['can', '#e8786b'], galbi: ['meat', '#b04a3a'],
    salmon: ['fish', '#ff9a6a'], tuna: ['can', '#4a7ad8'], shrimp: ['shrimp', '#ff8a6a'], squid: ['fish', '#f6d6c8'], mackerel: ['fish', '#6a8bb8'], clam: ['egg', '#e8d6c0'],
    anchovy: ['fish', '#a8b8c8'], seaweed: ['sheet', '#3a5a3a'], kelp: ['sheet', '#6b5a3a'], crab: ['block', '#ff8a7a'], octopus: ['shrimp', '#e8786b'],
    egg: ['egg', '#fff3e0'], milk: ['carton', '#7fbfff'], butter: ['block', '#ffe08a'], cheese: ['wedge', '#ffd23a'], mozza: ['wedge', '#fff3d6'], cream: ['carton', '#ffd0da'],
    yogurt: ['cup', '#ffd0da'], tofu: ['block', '#fffdf6'], parmesan: ['wedge', '#f6e0a0'],
    rice: ['bowl', '#d8f0ff'], pasta: ['noodle', '#f2c94c'], ramen: ['noodle', '#e8343a'], udon: ['noodle', '#f8f2e6'], somen: ['noodle', '#f8f8f0'], ricecake: ['long', '#fff3e0'],
    dumpling: ['bowl', '#ffe0c0'], fishcake: ['long', '#f2c08a'], bread: ['bread', '#e8b06a'], flour: ['bag', '#f8f2e6'], tomatosauce: ['jar', '#ff5a4a'], creamsauce: ['jar', '#fff3d6'],
    curry: ['bag', '#ffc94a'], kimchi: ['jar', '#ff6a4a'], glassnoodle: ['noodle', '#d8e0e8'],
    soy: ['bottle', '#5a3a2a'], gochujang: ['jar', '#c0392b'], doenjang: ['jar', '#8a5a34'], gochugaru: ['bag', '#e8343a'], sugar: ['bag', '#ffffff'], salt: ['can', '#d8f0ff'],
    oil: ['bottle', '#ffd23a'], olive: ['bottle', '#7cb342'], sesame: ['bottle', '#c8945a'], vinegar: ['bottle', '#f8f2c6'], oyster: ['bottle', '#3a2a22'], pepperp: ['can', '#555a60'],
    mayo: ['bottle', '#fff6d6'], ketchup: ['bottle', '#e8343a'], honey: ['jar', '#ffc94a'], mirin: ['bottle', '#e8e0f0'],
    water: ['bottle', '#cfe8ff'], coke: ['can', '#c0392b'], juice: ['carton', '#ff9a2b'], coffee: ['bag', '#6b4a35'], beer: ['can', '#f2c94c'], soju: ['bottle', '#7cc36a'],
    makgeolli: ['bottle', '#f8f8f0'], wine: ['bottle', '#8a2a4a'], highball: ['can', '#e8a33d'],
    sprite: ['can', '#3aa55a'], soda: ['bottle', '#cfe8ff'], greentea: ['bottle', '#7cc36a'], ion: ['can', '#4a90e2'], soju: ['sbottle', '#3aa55a'], soju2: ['sbottle', '#4fb36a'], jinro: ['sbottle', '#7fc4ff'], saero: ['sbottle', '#b8dcef'], andong: ['pot', '#f2e6c9'], hwayo: ['square', '#e8eef2'], munbae: ['pot', '#e9dcc6'], igang: ['pot', '#c8945a'], makgeolli: ['bottle', '#f8f8f0'], jipyeong: ['bottle', '#f4efe0'], dongdong: ['pot', '#d6b26a'], bokbunja: ['wbottle', '#5a1a3a'], maesil: ['square', '#d8e8a0'], cheongha: ['sbottle', '#e8f0f8'], baekse: ['bottle', '#c89a64'], beer: ['can', '#f2c94c'], terra: ['can', '#3aa55a'], heineken: ['can', '#2e8a3a'], asahi: ['can', '#c8ccd0'], sapporo: ['can', '#e8e3d6'], guinness: ['can', '#2b2b2b'], hoegaarden: ['can', '#a9d7ee'], tsingtao: ['can', '#2f6fb3'], corona: ['bottle', '#ffe08a'], ipa: ['bottle', '#e8a33d'], wine: ['wbottle', '#7a1f3a'], whitewine: ['wbottle', '#e8e0a0'], rose: ['wbottle', '#ff9ab0'], champagne: ['wbottle', '#2e4a2e'], prosecco: ['wbottle', '#7cb342'], cava: ['wbottle', '#3a5a3a'], port: ['wbottle', '#4a1028'], sherry: ['wbottle', '#c8945a'], vermouth: ['wbottle', '#a83a3a'], sangria: ['wbottle', '#c0392b'], cidre: ['bottle', '#f2c94c'], mead: ['pot', '#ffc94a'], scotch: ['square', '#c8781e'], singlemalt: ['square', '#d9a03a'], bourbon: ['square', '#b8641e'], jackd: ['square', '#2b2b2b'], japanwhisky: ['square', '#e8a33d'], irish: ['square', '#3aa55a'], canadian: ['square', '#c0392b'], vodka: ['bottle', '#e8f4ff'], gin: ['square', '#5aa0e0'], rum: ['bottle', '#e8c070'], tequila: ['bottle', '#f2d06a'], mezcal: ['square', '#8a7a4a'], cognac: ['wbottle', '#a8541e'], calvados: ['wbottle', '#c8781e'], grappa: ['bottle', '#f4f4ee'], pisco: ['bottle', '#f8f2e0'], cachaca: ['bottle', '#e8e0c0'], ouzo: ['bottle', '#e8f4ff'], raki: ['bottle', '#f0f4f8'], arak: ['bottle', '#e8eef2'], absinthe: ['wbottle', '#7cd36a'], aquavit: ['bottle', '#f2e6a0'], chacha: ['bottle', '#f4f0e8'], slivovitz: ['bottle', '#c8a0d8'], palinka: ['bottle', '#f2c94c'], baijiu: ['pot', '#e8343a'], kaoliang: ['square', '#f4f4ee'], shaoxing: ['pot', '#8a5a34'], sake: ['bottle', '#f8f4e8'], shochu: ['square', '#d8e0e8'], awamori: ['pot', '#e9dcc6'], umeshu: ['square', '#e8c070'], baileys: ['wbottle', '#6b4a35'], kahlua: ['square', '#3a2a22'], amaretto: ['square', '#c8641e'], limoncello: ['bottle', '#ffe24a'], jager: ['square', '#2e4a2e'], campari: ['bottle', '#e8343a'], aperol: ['bottle', '#ff7a2b'], cointreau: ['square', '#e8a33d'], malibu: ['bottle', '#f4f4ee'], highball: ['can', '#e8a33d'],
    chips: ['bag', '#ffd23a'], choco: ['block', '#6b4a35'], icecream: ['cup', '#ffc6d3'], cake: ['cake', '#ff8fab'], croissant: ['banana', '#e8b06a'], jelly: ['bag', '#ff8fab'],
    nuts: ['bag', '#c8945a'], cookie: ['round', '#d8a86a'],
  };
  const foodSvg = (id) => { const [shape, col] = FOOD[id] || ['round', '#ffd0da']; return wrap(F[shape](col)); };
  const foodSrc = (id) => (window.TOWN_ING && window.TOWN_ING.has(id) ? `icons/town/ing/${id}.svg` : `icons/town/food/${id}.svg`); // 재료는 새로 그린 자세한 그림
  const food = (id, cls = 'ti') => (FOOD[id] || (window.TOWN_ING && window.TOWN_ING.has(id)) ? `<img class="${cls}" src="${foodSrc(id)}" alt="">` : img('star', cls));
  const foodData = (id) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(foodSvg(id))}`; // 아이콘 파일 만들 때
  return { svg, uri, img, food, foodSrc, foodData, names: Object.keys(I) };
})();
