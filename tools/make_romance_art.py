# 11월 낭만찾기 일러스트 (손그림 느낌 SVG) → public/icons/romance/*.svg
# 실행: python3 tools/make_romance_art.py
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons', 'romance')
os.makedirs(OUT, exist_ok=True)

INK = '#4a3036'
PINK, LPINK, CREAM, YEL, ORG, BRN, SKY, MINT, LAV, BLUE, RED, WHITE = (
    '#ff8fa3', '#ffd1dc', '#fff3e0', '#ffd76a', '#ffa94d', '#b9825a', '#bfe3ff', '#bdeccb', '#d9c8ff', '#8fb8ff', '#ff6b81', '#fffaf5')


def svg(body, bg=None):
    back = f'<circle cx="32" cy="33" r="27" fill="{bg}" stroke="none" opacity="0.55"/>' if bg else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="{INK}" '
            f'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">{back}{body}</svg>\n')


def cat(x, y, s=1.0, sleep=False, color=WHITE):
    """귀여운 고양이 얼굴 (중심 x,y / 크기 s)"""
    def P(dx, dy):
        return f'{x + dx * s:.1f} {y + dy * s:.1f}'
    eyes = (f'<path d="M{P(-5,0)} q{2*s:.1f} {1.6*s:.1f} {4*s:.1f} 0 M{P(1,0)} q{2*s:.1f} {1.6*s:.1f} {4*s:.1f} 0" stroke-width="{1.6*s:.1f}"/>'
            if sleep else
            f'<circle cx="{x-3.6*s:.1f}" cy="{y:.1f}" r="{1.3*s:.1f}" fill="{INK}" stroke="none"/><circle cx="{x+3.6*s:.1f}" cy="{y:.1f}" r="{1.3*s:.1f}" fill="{INK}" stroke="none"/>')
    return (f'<path d="M{P(-9,-3)} L{P(-8,-11)} L{P(-3,-7)} Q{P(0,-8.2)} {P(3,-7)} L{P(8,-11)} L{P(9,-3)} '
            f'Q{P(10,7)} {P(0,7.5)} Q{P(-10,7)} {P(-9,-3)} Z" fill="{color}"/>'
            + eyes +
            f'<ellipse cx="{x-6*s:.1f}" cy="{y+3*s:.1f}" rx="{1.8*s:.1f}" ry="{1.1*s:.1f}" fill="{PINK}" stroke="none" opacity="0.8"/>'
            f'<ellipse cx="{x+6*s:.1f}" cy="{y+3*s:.1f}" rx="{1.8*s:.1f}" ry="{1.1*s:.1f}" fill="{PINK}" stroke="none" opacity="0.8"/>'
            f'<path d="M{P(-1.8,2.2)} q{0.9*s:.1f} {1.2*s:.1f} {1.8*s:.1f} 0 q{0.9*s:.1f} {1.2*s:.1f} {1.8*s:.1f} 0" stroke-width="{1.4*s:.1f}"/>')


def heart(x, y, s=1.0, fill=RED):
    return (f'<path d="M{x} {y+4*s} C{x-6*s} {y} {x-5*s} {y-4*s} {x-2.5*s} {y-4*s} C{x-1*s} {y-4*s} {x} {y-3*s} {x} {y-2*s} '
            f'C{x} {y-3*s} {x+1*s} {y-4*s} {x+2.5*s} {y-4*s} C{x+5*s} {y-4*s} {x+6*s} {y} {x} {y+4*s} Z" fill="{fill}" stroke-width="1.6"/>')


def sparkle(x, y, s=1.0, fill=YEL):
    return f'<path d="M{x} {y-4*s} Q{x+0.8*s} {y-0.8*s} {x+4*s} {y} Q{x+0.8*s} {y+0.8*s} {x} {y+4*s} Q{x-0.8*s} {y+0.8*s} {x-4*s} {y} Q{x-0.8*s} {y-0.8*s} {x} {y-4*s} Z" fill="{fill}" stroke-width="1.4"/>'


ART = {
    # 1 사탕
    'candy': svg(f'<path d="M12 24 L4 18 L6 32 L4 46 L12 40 Z" fill="{PINK}"/><path d="M52 24 L60 18 L58 32 L60 46 L52 40 Z" fill="{PINK}"/>'
                 f'<ellipse cx="32" cy="32" rx="21" ry="15" fill="{LPINK}"/>' + cat(32, 33, 1.15), LPINK),
    # 2 휴대폰 배경화면
    'phone': svg(f'<rect x="19" y="7" width="26" height="48" rx="6" fill="{WHITE}"/><rect x="23" y="13" width="18" height="34" rx="2" fill="{SKY}"/>'
                 + heart(28, 26, 0.9) + heart(36, 31, 0.9, PINK) + f'<path d="M29 51 h6"/>' + sparkle(48, 14, 0.9), LPINK),
    # 3 겨울 노래 (헤드폰)
    'music': svg(f'<path d="M14 36 Q14 14 32 14 Q50 14 50 36" stroke-width="3"/><rect x="9" y="33" width="10" height="16" rx="4" fill="{PINK}"/>'
                 f'<rect x="45" y="33" width="10" height="16" rx="4" fill="{PINK}"/>' + cat(32, 38, 0.9) +
                 f'<path d="M50 10 v8 a2.5 2.5 0 1 1 -2 -2.4" fill="{INK}" stroke-width="1.6"/><path d="M50 10 l5 -1.5"/>', SKY),
    # 4 낙엽
    'leaf': svg(f'<path d="M14 46 Q12 22 38 12 Q50 34 30 48 Q22 52 14 46 Z" fill="{ORG}"/><path d="M14 46 Q26 32 36 18" stroke-width="1.8"/>'
                f'<path d="M22 38 l-6 -4 M27 32 l-7 -6 M31 26 l-3 -7" stroke-width="1.4"/><path d="M40 50 Q44 40 54 38 Q56 48 46 52 Z" fill="{YEL}"/>'
                f'<path d="M8 22 q3 -3 6 0 M46 22 q3 -3 6 0" stroke-width="1.6"/>', CREAM),
    # 5 예쁜 나무
    'tree': svg(f'<path d="M29 56 L30 40 L34 40 L35 56" fill="{BRN}"/><path d="M14 34 Q10 22 20 18 Q22 8 33 9 Q44 8 46 18 Q55 22 51 34 Q48 42 32 42 Q17 42 14 34 Z" fill="{ORG}"/>'
                + cat(32, 27, 0.75, color=CREAM) + f'<circle cx="18" cy="49" r="2.4" fill="{YEL}" stroke-width="1.4"/><circle cx="48" cy="51" r="2.2" fill="{ORG}" stroke-width="1.4"/>', MINT),
    # 6 같이 예능 보기
    'tv': svg(f'<rect x="8" y="16" width="48" height="32" rx="6" fill="{WHITE}"/><rect x="13" y="21" width="38" height="22" rx="3" fill="{LAV}"/>'
              f'<path d="M24 16 L19 8 M40 16 L45 8"/><path d="M22 52 h20"/>' + cat(32, 33, 0.85) + sparkle(18, 26, 0.7) + sparkle(46, 38, 0.6, WHITE), LAV),
    # 7 입동 만두
    'dumpling': svg(f'<ellipse cx="32" cy="46" rx="25" ry="7" fill="{SKY}"/><path d="M10 42 Q12 20 32 18 Q52 20 54 42 Q32 48 10 42 Z" fill="{WHITE}"/>'
                    f'<path d="M20 24 q2 -4 4 0 q2 -4 4 0 q2 -4 4 0 q2 -4 4 0 q2 -4 4 0" stroke-width="1.6"/>'
                    f'<circle cx="25" cy="33" r="1.4" fill="{INK}" stroke="none"/><circle cx="39" cy="33" r="1.4" fill="{INK}" stroke="none"/>'
                    f'<path d="M30 37 q2 2 4 0" stroke-width="1.6"/><ellipse cx="21" cy="37" rx="2" ry="1.2" fill="{PINK}" stroke="none"/><ellipse cx="43" cy="37" rx="2" ry="1.2" fill="{PINK}" stroke="none"/>'
                    f'<path d="M24 12 q-3 -4 0 -7 M32 12 q-3 -4 0 -7 M40 12 q-3 -4 0 -7" stroke-width="1.6"/>', CREAM),
    # 8 겨울 음료
    'cocoa': svg(f'<path d="M14 24 L17 52 Q18 56 22 56 L38 56 Q42 56 43 52 L46 24 Z" fill="{WHITE}"/><path d="M15 32 L45 32" />'
                 f'<path d="M15.5 32 L17 52 Q18 56 22 56 L38 56 Q42 56 43 52 L44.5 32 Z" fill="{BRN}" opacity="0.85"/>'
                 f'<path d="M46 30 Q56 30 54 40 Q52 46 44 44"/><ellipse cx="30" cy="24" rx="16" ry="4" fill="{CREAM}"/>'
                 f'<circle cx="24" cy="21" r="3" fill="{WHITE}"/><circle cx="31" cy="20" r="3.4" fill="{LPINK}"/><circle cx="37" cy="22" r="2.8" fill="{WHITE}"/>'
                 f'<path d="M24 13 q-3 -4 0 -7 M34 13 q-3 -4 0 -7" stroke-width="1.6"/>' + heart(30, 43, 0.9, LPINK), CREAM),
    # 9 목도리 산책
    'scarf': svg(cat(32, 24, 1.3) + f'<path d="M15 34 Q32 42 49 34 L50 41 Q32 49 14 41 Z" fill="{RED}"/>'
                 f'<path d="M40 42 L44 58 L52 56 L47 40" fill="{RED}"/><path d="M44 49 l7 -2 M45 53 l7 -2" stroke-width="1.4" stroke="{WHITE}"/>'
                 f'<path d="M20 38 l3 4 M27 40 l2 4 M34 41 l1 4" stroke-width="1.4" stroke="{WHITE}"/>', LPINK),
    # 10 손편지
    'letter': svg(f'<rect x="10" y="20" width="44" height="30" rx="4" fill="{WHITE}"/><path d="M11 22 L32 38 L53 22"/>'
                  + heart(32, 42, 1.1) + f'<path d="M50 8 L42 30" stroke-width="2.4"/><path d="M50 8 l3 1 l-8 22 l-3 -1 Z" fill="{YEL}"/>', LPINK),
    # 11 빼빼로데이
    'pepero': svg(''.join(
        f'<g transform="rotate({r} 32 50)"><rect x="{x}" y="8" width="6" height="42" rx="3" fill="{c}"/><rect x="{x}" y="38" width="6" height="12" rx="2" fill="{CREAM}"/></g>'
        for x, r, c in [(20, -14, BRN), (29, 0, PINK), (38, 14, BRN)]) +
        f'<path d="M14 50 Q32 44 50 50 L48 58 Q32 54 16 58 Z" fill="{RED}"/>' + heart(32, 53, 0.7, WHITE), LPINK),
    # 12 작은 케이크
    'cake': svg(f'<path d="M14 34 L50 34 L48 54 L16 54 Z" fill="{CREAM}"/><path d="M14 34 Q18 40 23 34 Q27 40 32 34 Q36 40 41 34 Q45 40 50 34 Q50 24 32 24 Q14 24 14 34 Z" fill="{WHITE}"/>'
                f'<circle cx="32" cy="20" r="5" fill="{RED}"/><path d="M32 15 q2 -4 6 -4" stroke-width="1.6"/><path d="M16 44 L48 44" stroke="{PINK}" stroke-width="3"/>'
                + sparkle(52, 18, 0.8) + sparkle(12, 20, 0.6, PINK), LPINK),
    # 13 스트레칭
    'stretch': svg(f'<path d="M14 52 Q20 30 32 30 Q44 30 50 52" fill="{WHITE}"/>' + cat(32, 22, 1.0) +
                   f'<path d="M20 20 Q12 10 16 4 M44 20 Q52 10 48 4" stroke-width="2.6"/><path d="M8 56 h48" stroke-width="1.6"/>'
                   + sparkle(8, 12, 0.6) + sparkle(56, 12, 0.6), MINT),
    # 14 목욕
    'bath': svg(f'<path d="M8 34 h48 v6 Q56 54 42 54 L22 54 Q8 54 8 40 Z" fill="{WHITE}"/>' + cat(32, 30, 1.0, sleep=True) +
                f'<path d="M8 34 h48" stroke-width="2.6"/><circle cx="14" cy="30" r="4" fill="{SKY}" stroke-width="1.6"/><circle cx="50" cy="29" r="5" fill="{SKY}" stroke-width="1.6"/>'
                f'<circle cx="44" cy="22" r="3" fill="{WHITE}" stroke-width="1.4"/><path d="M16 58 v-4 M48 58 v-4"/><path d="M22 14 q-3 -4 0 -7 M42 14 q-3 -4 0 -7" stroke-width="1.6"/>', SKY),
    # 15 군밤
    'chestnut': svg(f'<path d="M10 44 Q32 58 54 44 L50 36 L14 36 Z" fill="{CREAM}"/>' +
                    ''.join(f'<path d="M{x-8} {y+4} Q{x-8} {y-8} {x} {y-9} Q{x+8} {y-8} {x+8} {y+4} Q{x} {y+8} {x-8} {y+4} Z" fill="{BRN}"/><path d="M{x-7} {y+1} Q{x} {y+4} {x+7} {y+1}" fill="{CREAM}" stroke-width="1.4"/>'
                            for x, y in [(22, 34), (42, 34), (32, 26)]) +
                    f'<circle cx="29" cy="25" r="1.1" fill="{INK}" stroke="none"/><circle cx="35" cy="25" r="1.1" fill="{INK}" stroke="none"/><path d="M31 28 q1 1 2 0" stroke-width="1.4"/>'
                    f'<path d="M24 14 q-3 -4 0 -7 M40 14 q-3 -4 0 -7" stroke-width="1.6"/>', CREAM),
    # 16 귤
    'orange': svg(f'<circle cx="32" cy="35" r="19" fill="{ORG}"/><path d="M32 16 Q36 8 44 9 Q42 16 33 16" fill="{MINT}"/>'
                  f'<circle cx="25" cy="34" r="1.6" fill="{INK}" stroke="none"/><circle cx="39" cy="34" r="1.6" fill="{INK}" stroke="none"/>'
                  f'<path d="M29 39 q3 3 6 0" stroke-width="1.8"/><ellipse cx="21" cy="39" rx="2.4" ry="1.4" fill="{RED}" stroke="none" opacity="0.6"/><ellipse cx="43" cy="39" rx="2.4" ry="1.4" fill="{RED}" stroke="none" opacity="0.6"/>'
                  + sparkle(52, 20, 0.8) + sparkle(12, 48, 0.6), CREAM),
    # 17 꼭 안아주기
    'hug': svg(cat(23, 33, 1.0) + cat(41, 33, 1.0, color=CREAM) + f'<path d="M14 44 Q32 54 50 44" stroke-width="2.6"/>' + heart(32, 14, 1.2) + heart(46, 12, 0.6, PINK), LPINK),
    # 18 시트팩
    'mask': svg(cat(32, 34, 1.7, sleep=True) + f'<path d="M20 26 Q32 20 44 26 Q47 36 44 44 Q32 50 20 44 Q17 36 20 26 Z" fill="{WHITE}" opacity="0.9"/>'
                f'<path d="M24 33 q3 2 6 0 M34 33 q3 2 6 0" stroke-width="1.8"/><path d="M29 41 q3 2 6 0" stroke-width="1.6"/>' + sparkle(52, 14, 0.8, SKY) + sparkle(12, 18, 0.6, SKY), SKY),
    # 19 간식 바꿔 먹기
    'snack': svg(f'<path d="M10 22 L28 20 L30 52 L12 54 Z" fill="{YEL}"/><path d="M12 30 L29 28" stroke-width="1.6"/>'
                 f'<path d="M34 20 L54 22 L52 54 L36 52 Z" fill="{PINK}"/><path d="M35 30 L53 32" stroke-width="1.6"/>'
                 f'<path d="M22 12 Q32 4 42 12" stroke-width="1.8"/><path d="M42 12 l-4 -1 M42 12 l-1 -4" stroke-width="1.8"/>'
                 + heart(20, 42, 0.7) + sparkle(44, 42, 0.8), CREAM),
    # 20 빗소리 들으며 자기
    'raindrop': svg(f'<path d="M14 26 Q12 16 22 16 Q26 8 36 10 Q46 10 46 18 Q54 18 52 26 Z" fill="{WHITE}"/>'
                    f'<path d="M20 32 l-2 5 M30 32 l-2 5 M40 32 l-2 5 M25 40 l-2 5 M35 40 l-2 5" stroke="{BLUE}" stroke-width="2"/>'
                    + cat(32, 52, 0.75, sleep=True) + f'<path d="M48 44 h5 l-5 5 h5" stroke-width="1.4"/>', LAV),
    # 21 늦잠
    'bed': svg(f'<path d="M6 46 v-14 Q6 28 10 28 L54 28 Q58 28 58 32 V46" fill="{WHITE}"/>' + cat(18, 30, 0.9, sleep=True) +
               f'<path d="M24 30 Q40 22 56 32 L56 46 L24 46 Z" fill="{PINK}"/>' + heart(40, 38, 0.6, WHITE) +
               f'<path d="M6 46 h52 M8 46 v8 M56 46 v8"/><path d="M40 10 h6 l-6 6 h6 M50 4 h4 l-4 4 h4" stroke-width="1.6"/>', LAV),
    # 22 소설 국물
    'soup': svg(f'<path d="M8 32 h48 Q54 52 32 52 Q10 52 8 32 Z" fill="{WHITE}"/><ellipse cx="32" cy="32" rx="24" ry="5" fill="{ORG}"/>'
                f'<circle cx="24" cy="31" r="2.2" fill="{MINT}" stroke-width="1.2"/><circle cx="36" cy="32" r="2.6" fill="{WHITE}" stroke-width="1.2"/>'
                f'<path d="M24 56 h16"/><path d="M22 22 q-3 -4 0 -7 M32 22 q-3 -4 0 -7 M42 22 q-3 -4 0 -7" stroke-width="1.6"/>'
                f'<path d="M10 10 l2 2 M10 12 l2 -2 M52 8 l2 2 M52 10 l2 -2" stroke="{BLUE}" stroke-width="1.6"/>', SKY),
    # 23 작년 오늘 사진
    'photo': svg(f'<g transform="rotate(-8 32 32)"><rect x="12" y="12" width="40" height="40" rx="3" fill="{WHITE}"/><rect x="17" y="17" width="30" height="24" fill="{SKY}"/>'
                 f'<path d="M17 41 L27 30 L33 36 L39 28 L47 41 Z" fill="{MINT}" stroke-width="1.6"/><circle cx="41" cy="23" r="3" fill="{YEL}" stroke-width="1.4"/></g>'
                 + heart(48, 50, 0.9) + f'<path d="M22 50 h10" stroke-width="1.6"/>', LPINK),
    # 24 따뜻한 우유
    'milk': svg(f'<path d="M22 18 L42 18 L42 22 L46 30 L46 54 Q46 56 44 56 L20 56 Q18 56 18 54 L18 30 L22 22 Z" fill="{WHITE}"/>'
                f'<path d="M22 18 L22 12 L42 12 L42 18" fill="{SKY}"/><path d="M18 34 h28" stroke="{SKY}" stroke-width="3"/>'
                + cat(32, 45, 0.7) + f'<path d="M50 14 q-3 -4 0 -7 M14 20 q-3 -4 0 -7" stroke-width="1.6"/>', SKY),
    # 25 행복했던 일 떠올리기
    'memory': svg(f'<path d="M10 38 Q8 22 22 22 Q24 12 36 13 Q50 12 50 24 Q58 26 56 36 Q54 44 44 42 L20 44 Q10 44 10 38 Z" fill="{WHITE}"/>'
                  + heart(25, 32, 0.9) + sparkle(36, 30, 0.8) + heart(45, 32, 0.7, PINK) +
                  f'<circle cx="16" cy="50" r="2.4" fill="{WHITE}"/><circle cx="10" cy="56" r="1.6" fill="{WHITE}"/>', LAV),
    # 26 고마워
    'thanks': svg(f'<path d="M8 16 Q8 8 16 8 L48 8 Q56 8 56 16 L56 34 Q56 42 48 42 L26 42 L16 52 L18 42 Q8 42 8 34 Z" fill="{LPINK}"/>'
                  f'<text x="29" y="31" text-anchor="middle" font-size="12" font-weight="700" fill="{INK}" stroke="none" font-family="Poor Story, Apple SD Gothic Neo, Noto Sans KR, sans-serif">고마워</text>' + heart(49, 26, 0.6) + sparkle(54, 52, 0.7), CREAM),
    # 27 창밖 하늘
    'window': svg(f'<rect x="12" y="8" width="40" height="38" rx="3" fill="{SKY}"/><path d="M32 8 v38 M12 27 h40" stroke-width="2"/>'
                  f'<path d="M16 22 Q16 17 21 18 Q23 14 27 17" stroke="{WHITE}" stroke-width="2"/><circle cx="44" cy="17" r="3.4" fill="{YEL}" stroke-width="1.4"/>'
                  f'<path d="M8 46 h48 v4 H8 Z" fill="{BRN}"/>' + cat(32, 50, 0.7), CREAM),
    # 28 탕후루
    'tanghulu': svg(f'<path d="M32 60 L32 8" stroke-width="2"/>' +
                    ''.join(f'<circle cx="32" cy="{y}" r="{r}" fill="{c}"/><path d="M{32-r*0.5:.1f} {y-r*0.4:.1f} q2 -2 4 -1" stroke="{WHITE}" stroke-width="1.6"/>'
                            for y, r, c in [(14, 7, RED), (28, 8, PINK), (43, 8, RED)]) + sparkle(48, 20, 0.8) + sparkle(16, 36, 0.6, WHITE), LPINK),
    # 29 족욕
    'footbath': svg(f'<path d="M10 30 L14 54 Q15 58 20 58 L44 58 Q49 58 50 54 L54 30 Z" fill="{BRN}"/><path d="M10 30 h44" stroke-width="2.6"/><path d="M12 38 h40 M13 46 h38" stroke-width="1.4"/>'
                    f'<path d="M22 30 Q20 18 26 16 Q30 16 30 22 L30 30" fill="{LPINK}"/><path d="M34 30 L34 22 Q34 16 38 16 Q44 18 42 30" fill="{LPINK}"/>'
                    f'<path d="M18 12 q-3 -4 0 -7 M46 12 q-3 -4 0 -7" stroke-width="1.6"/>', CREAM),
    # 30 12월 기대하기
    'star': svg(f'<path d="M32 8 L38 24 L55 24 L41 34 L46 51 L32 41 L18 51 L23 34 L9 24 L26 24 Z" fill="{YEL}"/>'
                f'<circle cx="28" cy="30" r="1.4" fill="{INK}" stroke="none"/><circle cx="36" cy="30" r="1.4" fill="{INK}" stroke="none"/><path d="M30 34 q2 2 4 0" stroke-width="1.6"/>'
                + sparkle(52, 50, 0.8, PINK) + sparkle(12, 48, 0.6, SKY), LAV),
    # 6 좋아하는 영어 문장 (Don't worry 책)
    'english': svg(f'<path d="M6 18 Q19 14 32 20 Q45 14 58 18 L58 50 Q45 46 32 52 Q19 46 6 50 Z" fill="{WHITE}"/><path d="M32 20 V52" stroke-width="1.8"/>'
                   f'<text x="19" y="32" text-anchor="middle" font-size="7.5" font-weight="700" fill="{BLUE}" stroke="none" font-family="Poor Story, Comic Sans MS, sans-serif">Don\'t</text>'
                   f'<text x="19" y="42" text-anchor="middle" font-size="7.5" font-weight="700" fill="{BLUE}" stroke="none" font-family="Poor Story, Comic Sans MS, sans-serif">worry</text>'
                   + cat(45, 36, 0.75) + sparkle(54, 10, 0.8) + heart(10, 10, 0.6), SKY),
    # 9 물 여덟 잔
    'water': svg(''.join(f'<path d="M{x} {y} L{x+10} {y} L{x+9} {y+14} L{x+1} {y+14} Z" fill="{WHITE}" stroke-width="1.8"/><path d="M{x+0.6} {y+5} L{x+9.4} {y+5} L{x+9} {y+14} L{x+1} {y+14} Z" fill="{SKY}" stroke="none"/>'
                         for x, y in [(6, 14), (20, 14), (34, 14), (48, 14), (6, 36), (20, 36), (34, 36)]) +
                 f'<path d="M48 36 L58 36 L57 50 L49 50 Z" fill="{SKY}" stroke-width="1.8"/>' + cat(53, 31, 0.5) +
                 f'<text x="32" y="62" text-anchor="middle" font-size="6.5" font-weight="700" fill="{INK}" stroke="none" font-family="sans-serif">×8</text>', SKY),
    # 12 오늘 가장 잘한 일 (메달)
    'medal': svg(f'<path d="M22 6 L30 26 M42 6 L34 26" stroke-width="5" stroke="{PINK}"/><path d="M22 6 L30 26 M42 6 L34 26" stroke-width="1.4"/>'
                 f'<circle cx="32" cy="40" r="16" fill="{YEL}"/><circle cx="32" cy="40" r="11" fill="{ORG}" opacity="0.35" stroke="none"/>'
                 f'<path d="M32 31 L34.6 37 L41 37.4 L36 41.4 L37.8 47.6 L32 44 L26.2 47.6 L28 41.4 L23 37.4 L29.4 37 Z" fill="{WHITE}" stroke-width="1.6"/>'
                 + sparkle(52, 24, 0.8) + sparkle(12, 30, 0.6, PINK), CREAM),
    # 15 시집 한 편
    'poem': svg(f'<path d="M12 12 L44 12 Q50 12 50 18 L50 56 L18 56 Q12 56 12 50 Z" fill="{LAV}"/><path d="M18 56 Q12 56 12 50 Q12 46 18 46 L50 46" fill="{WHITE}"/>'
                f'<rect x="20" y="18" width="22" height="20" rx="2" fill="{WHITE}" stroke-width="1.6"/>'
                f'<path d="M24 24 h14 M24 29 h10 M24 34 h12" stroke-width="1.4"/>' + heart(46, 10, 0.7) +
                f'<path d="M52 30 q4 -6 8 -2 M52 38 q4 -5 7 -1" stroke-width="1.4"/>', LAV),
    # 17 행운 숫자 (네잎클로버 + 7)
    'lucky': svg(f'<path d="M32 34 Q35 48 30 60" stroke-width="2.2"/>' + ''.join(
        f'<g transform="rotate({r} 32 30)"><path d="M32 30 C26 24 22 14 28 11 C31 10 32 13 32 15 C32 13 33 10 36 11 C42 14 38 24 32 30 Z" fill="{MINT}"/></g>'
        for r in (0, 90, 180, 270)) +
        f'<circle cx="32" cy="30" r="5.5" fill="{YEL}" stroke-width="1.6"/>'
        f'<text x="32" y="33.5" text-anchor="middle" font-size="8.5" font-weight="700" fill="{INK}" stroke="none" font-family="sans-serif">7</text>'
        + sparkle(54, 10, 0.8) + sparkle(10, 54, 0.6), MINT),
    # 20 달 보고 소원 빌기
    'moon': svg(f'<path d="M40 8 A22 22 0 1 0 54 40 A17 17 0 1 1 40 8 Z" fill="{YEL}"/>'
                f'<circle cx="31" cy="30" r="1.3" fill="{INK}" stroke="none"/><path d="M27 29 q2 1.5 4 0" stroke-width="1.4"/><path d="M28 36 q2 2 4 0" stroke-width="1.4"/>'
                f'<ellipse cx="25" cy="34" rx="2" ry="1.2" fill="{PINK}" stroke="none"/>'
                + sparkle(50, 14, 0.9) + sparkle(56, 28, 0.6, WHITE) + cat(46, 52, 0.7, sleep=True) +
                f'<path d="M40 49 q-2 -3 1 -4 M52 49 q2 -3 -1 -4" stroke-width="1.4"/>', LAV),
    # 28 작은 실천 계획 (체크리스트)
    'plan': svg(f'<rect x="12" y="10" width="38" height="46" rx="4" fill="{WHITE}"/><path d="M24 6 h14 v8 h-14 Z" fill="{PINK}"/>'
                + ''.join(f'<rect x="17" y="{y}" width="7" height="7" rx="1.5" fill="{c}" stroke-width="1.6"/><path d="M28 {y+3.5} h16" stroke-width="1.6"/>'
                          for y, c in [(20, MINT), (31, MINT), (42, WHITE)]) +
                f'<path d="M18.5 23.5 l2 2 l3 -4 M18.5 34.5 l2 2 l3 -4" stroke-width="1.6"/>'
                f'<text x="28" y="9.5" font-size="5.5" font-weight="700" fill="{INK}" stroke="none" font-family="sans-serif">PLAN</text>'
                + cat(50, 48, 0.6) + sparkle(56, 14, 0.6), MINT),
    # 29 심리학 상식 (전구 + 하트 뇌)
    'psych': svg(f'<path d="M32 8 Q48 8 48 24 Q48 32 40 38 L40 44 L24 44 L24 38 Q16 32 16 24 Q16 8 32 8 Z" fill="{YEL}"/>'
                 f'<path d="M25 48 h14 M27 53 h10" stroke-width="2.2"/>' + heart(32, 24, 1.2, PINK) +
                 f'<path d="M8 14 l4 2 M56 14 l-4 2 M6 28 h5 M58 28 h-5" stroke-width="1.8"/>' + sparkle(52, 50, 0.7) + sparkle(12, 48, 0.6, SKY), CREAM),
    # 캐릭터: 목도리 고양이 (헤더 · 팝업)
    'cat': svg(f'<path d="M14 58 Q14 40 32 40 Q50 40 50 58 Z" fill="{WHITE}"/>' + cat(32, 26, 1.75) +
               f'<path d="M17 40 Q32 47 47 40 L48 46 Q32 53 16 46 Z" fill="{RED}"/><path d="M40 47 L42 60 L48 59 L45 46" fill="{RED}"/>' + heart(32, 54, 0.8)),
}

for name, data in ART.items():
    with open(os.path.join(OUT, f'{name}.svg'), 'w') as f:
        f.write(data)
print(f'{len(ART)}개 →', os.path.normpath(OUT))
