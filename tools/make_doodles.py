"""손그림(두들) 스타일 아이콘 SVG 생성기 → public/icons/doodle/*.svg

실행: python3 tools/make_doodles.py
선: 잉크색 둥근 펜 / 채색: 앱 팔레트(분홍·노랑·민트·하늘)를 연하게
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "icons" / "doodle"
INK = "#4a3036"
PINK = "#ff8fa3"
LPINK = "#ffd0da"
RED = "#ff6b81"
YEL = "#ffe08a"
MINT = "#bfe3c0"
SKY = "#bcdcff"
PAPER = "#fffaf5"
CREAM = "#fff1d6"
SW = 2.4  # 선 굵기


def svg(body: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" '
        f'stroke="{INK}" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">'
        f"{body}</svg>\n"
    )


HEART = "M24 40.5 C12.5 31.5 7.2 24.6 9.4 17.4 C11.3 11.4 18.6 10.2 24 16.6 C29.6 10.3 36.8 11.6 38.7 17.6 C40.9 24.8 35.6 31.6 24 40.5 Z"


def small_heart(cx, cy, s=1.0, fill=PINK):
    p = (
        f"M{cx} {cy+5*s} C{cx-5.2*s} {cy+1.4*s} {cx-6*s} {cy-2.2*s} {cx-3.6*s} {cy-3.6*s} "
        f"C{cx-1.8*s} {cy-4.6*s} {cx-0.4*s} {cy-3.4*s} {cx} {cy-2.2*s} "
        f"C{cx+0.5*s} {cy-3.5*s} {cx+2*s} {cy-4.6*s} {cx+3.7*s} {cy-3.5*s} "
        f"C{cx+6*s} {cy-2*s} {cx+5.1*s} {cy+1.5*s} {cx} {cy+5*s} Z"
    )
    return f'<path d="{p}" fill="{fill}"/>'


ICONS = {
    # ---- 감정 / 하트 ----
    "heart": f'<path d="{HEART}" fill="{PINK}"/><path d="M14.6 18.4 Q15.4 15.6 18.4 15" stroke="#fff" stroke-width="2"/>',
    "hearts": small_heart(18, 26, 1.7, PINK) + small_heart(32, 18, 1.2, LPINK),
    "heart-broken": f'<path d="{HEART}" fill="{LPINK}"/><path d="M24 16.6 L21.2 22.4 L26.2 26.6 L22.4 31.6 L24 40.4"/>',
    "blush": (
        f'<circle cx="24" cy="25" r="15" fill="{YEL}"/>'
        '<path d="M16.5 23 Q18.5 20.6 20.6 23"/><path d="M27.4 23 Q29.5 20.6 31.6 23"/>'
        '<path d="M18.5 29.5 Q24 35 29.6 29.5"/>'
        f'<circle cx="15.6" cy="28" r="2.2" fill="{PINK}" stroke="none"/><circle cx="32.5" cy="28" r="2.2" fill="{PINK}" stroke="none"/>'
        + small_heart(38.5, 10, 0.9, RED)
    ),
    "sparkle": (
        f'<path d="M22 6 C23.2 15 25.4 17.6 34 19.2 C25.4 20.8 23.2 23.4 22 32.6 C20.8 23.4 18.6 20.8 10 19.2 C18.6 17.6 20.8 15 22 6 Z" fill="{YEL}"/>'
        f'<path d="M35.5 28 C36 32.4 37.2 33.6 41.4 34.2 C37.2 34.8 36 36 35.5 40.4 C35 36 33.8 34.8 29.6 34.2 C33.8 33.6 35 32.4 35.5 28 Z" fill="{LPINK}"/>'
    ),
    "blossom": (
        "".join(
            f'<ellipse cx="24" cy="13.4" rx="6.2" ry="8.4" fill="{LPINK}" transform="rotate({a} 24 24)"/>'
            for a in (0, 72, 144, 216, 288)
        )
        + f'<circle cx="24" cy="24" r="4.4" fill="{YEL}"/>'
    ),
    "rose": (
        f'<path d="M24 26 L24.4 42" stroke="#6b9b6e"/><path d="M24.2 35 Q17 31.5 14.6 35.6 Q19 39.2 24.2 35" fill="{MINT}"/>'
        f'<path d="M15 15.6 C15 8.6 33 8.4 33 15.6 C33 22.6 28.4 26.6 24 26.6 C19.6 26.6 15 22.6 15 15.6 Z" fill="{RED}"/>'
        '<path d="M20 14.6 Q24 10.4 27.8 14.6 Q24.6 19 21.4 16.8"/>'
    ),
    "gift": (
        f'<rect x="9" y="19.5" width="30" height="20" rx="2.5" fill="{LPINK}"/>'
        f'<rect x="7" y="14" width="34" height="7" rx="2" fill="{PINK}"/>'
        f'<path d="M24 14 L24 39.5" stroke="{INK}"/><path d="M24 14 C18 6.6 12.6 10.6 16.4 14 M24 14 C30 6.6 35.4 10.6 31.6 14"/>'
    ),
    # ---- 편지 / 종이 ----
    "letter": (
        f'<path d="M7.2 14.6 Q7 12 9.6 12.1 L38.6 12.5 Q41 12.6 40.9 15.1 L40.6 34.6 Q40.5 37 38 37 L9.8 36.6 Q7.3 36.5 7.4 34 Z" fill="{PAPER}"/>'
        '<path d="M8.2 14 L24 26 L40 14.2"/>' + small_heart(24, 27.6, 1.0, RED)
    ),
    "scroll": (
        f'<path d="M12 9 L36 9.4 Q39.6 9.6 39.4 13 L39 36.4 Q38.8 39.6 35.4 39.4 L12.4 39" fill="{CREAM}"/>'
        f'<path d="M12 9 Q8.4 9.2 8.6 12.6 Q8.8 15.6 12 15.4 L12.4 39 Q16 39.2 15.8 35.8 Q15.6 33 12.6 33"/>'
        '<path d="M19 17 L33 17.2 M19 23 L33 23.2 M19 29 L28 29.2"/>'
    ),
    "diary": (
        f'<path d="M12 7.6 L36.6 8 Q39.4 8.1 39.3 11 L38.9 38 Q38.8 40.6 36 40.5 L12.2 40.2 Z" fill="{PINK}"/>'
        f'<path d="M12 7.6 L12.2 40.2" /><path d="M8.4 13 L15.4 13 M8.4 20.4 L15.4 20.4 M8.4 27.8 L15.4 27.8 M8.4 35 L15.4 35"/>'
        + small_heart(26.5, 22.6, 1.25, "#fff")
    ),
    "recipe": (
        f'<path d="M10 8 L35 8.4 Q38.4 8.6 38.2 12 L37.8 38.4 Q37.6 41 35 40.8 L10.4 40.4 Z" fill="{CREAM}"/>'
        f'<path d="M17 20.6 Q14.8 14.6 19.6 14 Q21.2 10.4 24.6 11.6 Q28.4 10.6 29.4 14.6 Q33.6 15.6 31 20.6 Z" fill="#fff"/>'
        '<path d="M18 20.6 L18.4 25 L30.4 25.2 L30.6 20.6"/><path d="M15.6 31 L32 31.2 M15.6 35.4 L27 35.6"/>'
    ),
    # ---- 날짜 / 장소 / 시간 ----
    "calendar": (
        f'<rect x="8" y="11" width="32" height="29" rx="4" fill="{PAPER}"/>'
        f'<path d="M8.4 18.6 L39.6 18.6 L39.6 15 Q39.6 11 35.6 11 L12.4 11 Q8.4 11 8.4 15 Z" fill="{PINK}"/>'
        '<path d="M16 7.4 L16 13.6 M32 7.4 L32 13.6"/>'
        + "".join(f'<circle cx="{x}" cy="{y}" r="1.3" fill="{INK}" stroke="none"/>' for x in (16, 24, 32) for y in (26, 33))
        + small_heart(32, 33, 0.8, RED)
    ),
    "pin": (
        f'<path d="M24 42.4 C16 31.8 11.8 25.4 11.8 19 C11.8 12 17.4 6.8 24 6.8 C30.6 6.8 36.2 12 36.2 19 C36.2 25.4 32 31.8 24 42.4 Z" fill="{PINK}"/>'
        f'<circle cx="24" cy="19" r="5" fill="#fff"/>'
    ),
    "clock": (
        f'<circle cx="24" cy="24.5" r="15.6" fill="{PAPER}"/><path d="M24 15.6 L24 24.8 L30.4 28.4"/>'
        f'<circle cx="24" cy="24.6" r="1.4" fill="{INK}" stroke="none"/>'
    ),
    "home": (
        f'<path d="M11.4 22 L11.8 39.6 L36.4 39.8 L36.6 22" fill="{PAPER}"/>'
        f'<path d="M7.6 24 L24 9.6 L40.4 24" />'
        f'<path d="M20.4 39.6 L20.6 30.4 Q24 28.4 27.6 30.4 L27.6 39.6" fill="{PINK}"/>'
        + small_heart(24, 20.4, 0.8, RED)
    ),
    "train": (
        f'<rect x="11.6" y="8.6" width="24.8" height="26" rx="6" fill="{SKY}"/>'
        f'<rect x="15.4" y="13" width="17.2" height="8.6" rx="2" fill="#fff"/>'
        f'<circle cx="17.6" cy="28" r="1.8" fill="{INK}" stroke="none"/><circle cx="30.4" cy="28" r="1.8" fill="{INK}" stroke="none"/>'
        '<path d="M15.4 34.6 L11.6 40.6 M32.6 34.6 L36.4 40.6"/>'
    ),
    # ---- 음식 ----
    "plate": (
        f'<circle cx="26" cy="25" r="13.6" fill="{PAPER}"/><circle cx="26" cy="25" r="8.4" fill="{LPINK}"/>'
        '<path d="M7.6 10 L7.8 17.4 Q8 20.4 10 20.4 Q12 20.4 12 17.4 L12.2 10 M10 20.4 L10.2 39.6"/>'
        f'<path d="M42.4 10.6 Q38 14 38.6 24 L42.4 24.4 L42.6 39.6"/>'
    ),
    "noodle": (
        f'<path d="M7.6 22 L40.4 22 Q39.6 36.4 24 37.6 Q8.4 36.4 7.6 22 Z" fill="{YEL}"/>'
        '<path d="M15 21.6 Q15.6 14 19 13.6 M21.6 21.6 Q22 12.6 25.8 12 M28.6 21.6 Q29.6 15.6 32.6 15.4"/>'
        '<path d="M30 6.6 L18.6 22 M36 8 L24.4 22"/><path d="M17.4 37 L18 40.6 L30 40.8 L30.6 37"/>'
    ),
    "coffee": (
        f'<path d="M10 17.6 L35.6 17.6 L33.6 37 Q33.2 40.4 29.6 40.4 L16.2 40.4 Q12.6 40.4 12.2 37 Z" fill="{PAPER}"/>'
        '<path d="M35 22 Q41.6 21.6 41 27.6 Q40.4 32.6 34 32"/>'
        '<path d="M18 13 Q16 10 18.4 7.4 M24 13 Q22 10 24.4 7.4 M30 13 Q28 10 30.4 7.4"/>'
        + small_heart(23, 28.6, 1.0, PINK)
    ),
    "beer": (
        f'<path d="M9.6 14 L25.6 14 L24.6 39.6 L10.6 39.6 Z" fill="{YEL}"/><path d="M25.4 19 Q31 19 30.6 25 Q30.4 30 25 30"/>'
        f'<path d="M8.6 14.4 Q8.4 9.4 13 10.4 Q15.4 6.6 19.4 9.2 Q24 7.4 26.4 11.6 Q27.6 15 24.6 15 Z" fill="#fff"/>'
        f'<path d="M33.4 20.6 L42.6 20.6 L41.8 39.6 L33.8 39.6 Z" fill="{YEL}"/><path d="M33 20.8 Q34 17 37.6 18.2 Q41 16.6 43 20.4" fill="#fff"/>'
    ),
    "wine": (
        f'<path d="M10.6 8 L21.4 9.6 Q22 18.4 15.6 20.6 Q9.4 18.4 10.6 8 Z" fill="{RED}"/><path d="M15.6 20.6 L14.6 34.6 M10.4 35 L19 35.4"/>'
        f'<path d="M37.4 8 L26.6 9.6 Q26 18.4 32.4 20.6 Q38.6 18.4 37.4 8 Z" fill="{YEL}"/><path d="M32.4 20.6 L33.4 34.6 M29 35.4 L37.6 35"/>'
        '<path d="M22.6 5.4 L24 3.2 M25.6 6 L27.8 4.6"/>'
    ),
    "chef": (
        f'<path d="M14.6 26 Q7.6 25.4 8.6 18.4 Q9.8 12.4 16 13.4 Q18.4 7 24.4 7.6 Q30.4 7.4 32 13.4 Q38.4 12.4 39.6 18.4 Q40.4 25.4 33.4 26 Z" fill="#fff"/>'
        f'<path d="M14.6 25.6 L15 38.6 L33 38.6 L33.4 25.6" fill="{PAPER}"/><path d="M15 33.4 L33 33.6"/>'
    ),
    # ---- 대화 / 검색 ----
    "chat": (
        f'<path d="M9 11.4 Q9 8 12.4 8 L35.6 8.4 Q39 8.4 39 11.8 L38.6 28.4 Q38.6 31.6 35.2 31.6 L20 31.6 L12 39.4 L13.6 31.4 Q9 31.4 9 28 Z" fill="{PAPER}"/>'
        + "".join(f'<circle cx="{x}" cy="20" r="1.8" fill="{INK}" stroke="none"/>' for x in (17, 24, 31))
    ),
    "search": (
        f'<circle cx="20.6" cy="20.6" r="11.6" fill="{SKY}"/><path d="M15 17.4 Q16.4 13.6 20.4 13.4" stroke="#fff"/>'
        '<path d="M29.4 29.6 L40.6 40.8" stroke-width="4"/>'
    ),
    "camera": (
        f'<path d="M7.6 16 Q7.6 13 10.6 13 L16 13 L18.6 9 L29.4 9 L32 13 L37.4 13 Q40.4 13 40.4 16 L40.2 35.6 Q40.2 38.6 37.2 38.6 L10.8 38.6 Q7.8 38.6 7.8 35.6 Z" fill="{LPINK}"/>'
        f'<circle cx="24" cy="25.4" r="7.6" fill="#fff"/><circle cx="24" cy="25.4" r="3.4" fill="{SKY}"/>'
    ),
    "bulb": (
        f'<path d="M24 6.8 Q35.6 7.2 35.4 18.4 Q35.2 24.4 29.6 28.6 L29.4 33 L18.6 33 L18.4 28.6 Q12.8 24.4 12.6 18.4 Q12.4 7.2 24 6.8 Z" fill="{YEL}"/>'
        '<path d="M19 37.4 L29 37.4 M20.6 41.6 L27.4 41.6"/>'
    ),
    "drop": f'<path d="M24 8 Q34.6 21.6 34 28.6 Q33.4 38.6 24 38.8 Q14.6 38.6 14 28.6 Q13.4 21.6 24 8 Z" fill="{SKY}"/><path d="M19 28 Q19.4 32.4 23 33.4" stroke="#fff"/>',
    "ticket": (
        f'<path d="M8 15 L40 15 L40 21 Q36.4 21.4 36.4 24.4 Q36.4 27.4 40 27.8 L40 33.6 L8 33.6 L8 27.8 Q11.6 27.4 11.6 24.4 Q11.6 21.4 8 21 Z" fill="{LPINK}"/>'
        '<path d="M30 16 L30 32.6" stroke-dasharray="2.4 3.2"/>'
    ),
    "people": (
        f'<circle cx="17" cy="16.6" r="5.6" fill="{LPINK}"/><path d="M7.6 37 Q8.4 25 17 25 Q25.6 25 26.4 37 Z" fill="{LPINK}"/>'
        f'<circle cx="31.6" cy="18.6" r="5" fill="{SKY}"/><path d="M24.6 37 Q25 27 31.6 26.8 Q39.6 27 40.4 37 Z" fill="{SKY}"/>'
    ),
    "user": f'<circle cx="24" cy="17.6" r="7.4" fill="{LPINK}"/><path d="M10.6 40 Q11.4 27 24 27 Q36.6 27 37.4 40 Z" fill="{LPINK}"/>',
    "frame": (
        f'<rect x="7.6" y="10" width="32.8" height="28" rx="2" fill="{CREAM}"/><rect x="12.6" y="15" width="22.8" height="18" fill="#fff"/>'
        f'<path d="M13 31 L19.6 23.6 L24 27.6 L28 22.4 L35 31" fill="{MINT}"/><circle cx="18" cy="19.6" r="1.9" fill="{YEL}"/>'
    ),
    "wave": (
        f'<path d="M5 30 Q11 22 17 30 Q23 38 29 30 Q35 22 43 30 L43 41 L5 41 Z" fill="{SKY}"/>'
        f'<path d="M7 20 Q13 13 19 20 Q25 27 31 20 Q37 13 41 18"/>'
        f'<circle cx="36" cy="10" r="4" fill="{YEL}"/>'
    ),
    # ---- 날씨 ----
    "sun": (
        f'<circle cx="24" cy="24" r="8.6" fill="{YEL}"/>'
        '<path d="M24 6 L24 10.6 M24 37.4 L24 42 M6 24 L10.6 24 M37.4 24 L42 24 M11.4 11.4 L14.6 14.6 M33.4 33.4 L36.6 36.6 M36.6 11.4 L33.4 14.6 M14.6 33.4 L11.4 36.6"/>'
    ),
    "cloud": f'<path d="M13.6 34.6 Q6.6 34.4 7 27.8 Q7.6 21.8 14 22.6 Q15.4 13.6 24.4 13.6 Q32.6 13.8 34 21.6 Q41.6 21.4 41.4 28 Q41 34.6 34 34.6 Z" fill="#fff"/>',
    "rain": (
        f'<path d="M13.6 28 Q6.6 27.8 7 21.4 Q7.6 15.4 14 16.2 Q15.4 7.4 24.4 7.4 Q32.6 7.6 34 15.2 Q41.6 15 41.4 21.6 Q41 28 34 28 Z" fill="#fff"/>'
        f'<path d="M15.6 33 L13.6 38.6 M24 33 L22 38.6 M32.4 33 L30.4 38.6" stroke="#6aa5e8"/>'
    ),
    "snow": (
        f'<path d="M13.6 28 Q6.6 27.8 7 21.4 Q7.6 15.4 14 16.2 Q15.4 7.4 24.4 7.4 Q32.6 7.6 34 15.2 Q41.6 15 41.4 21.6 Q41 28 34 28 Z" fill="#fff"/>'
        + "".join(f'<circle cx="{x}" cy="{y}" r="1.7" fill="{SKY}"/>' for x, y in ((15, 35), (24, 38), (33, 35)))
    ),
    "partly": (
        f'<circle cx="17" cy="17" r="7.4" fill="{YEL}"/><path d="M17 4.6 L17 7.4 M4.6 17 L7.4 17 M8.2 8.2 L10.2 10.2 M25.8 8.2 L23.8 10.2"/>'
        f'<path d="M17.6 38 Q11.6 37.8 12 32.2 Q12.6 27.2 18 27.8 Q19.4 20.2 27 20.2 Q34 20.4 35.2 27 Q41.6 26.8 41.4 32.4 Q41 38 35 38 Z" fill="#fff"/>'
    ),
    # ---- UI ----
    "menu": '<path d="M9 14 Q24 12.6 39.4 14.2 M8.6 24.2 Q24 23 39 24 M9.2 34 Q24 35.2 39.2 33.8"/>',
    "back": '<path d="M39 24.6 Q24 23.4 10 24.2 M19.6 13.4 L9.4 24.2 L19.8 35"/>',
    "close": '<path d="M13 13 Q24 23.4 35.4 35.4 M35 13.2 Q24.6 23.6 12.8 35.2"/>',
    "plus": '<path d="M24 10 Q23.6 24 24.2 38.6 M9.6 24.2 Q24 23.6 38.4 24"/>',
    "minus": '<path d="M9.6 24.4 Q24 23.4 38.4 24"/>',
    "check": '<path d="M9.6 25 L19.4 34.6 L39.4 12.6"/>',
    "pencil": (
        f'<path d="M30.4 8.8 L39.4 17.8 L18.4 38.8 L8.4 40 L9.6 29.8 Z" fill="{YEL}"/>'
        f'<path d="M30.4 8.8 L34.4 4.8 Q36 3.4 37.6 4.8 L43.4 10.6 Q44.8 12.2 43.4 13.8 L39.4 17.8 Z" fill="{PINK}"/>'
        '<path d="M9.6 29.8 L18.4 38.8 M26.4 12.8 L35.4 21.8"/>'
    ),
    "trash": (
        f'<path d="M11.6 14.6 L13.6 39 Q14 41.4 16.6 41.4 L31.4 41.4 Q34 41.4 34.4 39 L36.4 14.6" fill="{PAPER}"/>'
        '<path d="M8.4 14 Q24 12.6 39.6 14.2 M19 13.6 Q19 8 24 8 Q29 8 29 13.6 M20 20.6 L20.6 34.6 M28 20.6 L27.4 34.6"/>'
    ),
    "bell": (
        f'<path d="M24 7.6 Q35.4 8 35.6 21 L35.8 30 L40.4 35.4 L7.6 35.4 L12.2 30 L12.4 21 Q12.6 8 24 7.6 Z" fill="{YEL}"/>'
        '<path d="M19.4 39.4 Q24 44 28.6 39.4"/>'
    ),
    "install": (
        f'<rect x="13.6" y="5.6" width="20.8" height="36.8" rx="4" fill="#fff"/><path d="M21 37.4 L27 37.4"/>'
        f'<path d="M24 12.6 L24 28.6 M18.4 23.4 L24 29 L29.6 23.4" stroke="{RED}"/>'
    ),
    "gear": (
        f'<circle cx="24" cy="24" r="11" fill="{LPINK}"/><circle cx="24" cy="24" r="4.4" fill="#fff"/>'
        '<path d="M24 7 L24 12.6 M24 35.4 L24 41 M7 24 L12.6 24 M35.4 24 L41 24 M12 12 L16 16 M32 32 L36 36 M36 12 L32 16 M16 32 L12 36"/>'
    ),
    "sound-on": f'<path d="M9 19 L16 19 L25 10.6 L25 37.4 L16 29 L9 29 Z" fill="{LPINK}"/><path d="M31 18 Q35 24 31 30 M35.6 13.6 Q42.4 24 35.6 34.4"/>',
    "sound-off": f'<path d="M9 19 L16 19 L25 10.6 L25 37.4 L16 29 L9 29 Z" fill="{LPINK}"/><path d="M31.4 18.6 L41 28.4 M41 18.6 L31.4 28.4"/>',
    "location": (
        f'<circle cx="24" cy="24" r="14.6" fill="{SKY}"/><path d="M24 4.6 L24 11 M24 37 L24 43.4 M4.6 24 L11 24 M37 24 L43.4 24"/>'
        f'<circle cx="24" cy="24" r="4.6" fill="{RED}"/>'
    ),
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, body in ICONS.items():
        (OUT / f"{name}.svg").write_text(svg(body), encoding="utf-8")
    print(f"{len(ICONS)}개 아이콘 → {OUT}")


if __name__ == "__main__":
    main()
