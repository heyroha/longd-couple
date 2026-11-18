"""카카오톡 대화 내보내기 → '말투 카드' (맥에서만 분석, 원본은 어디에도 안 올라감)

사용:
  python3 tools/kakao_style.py <카톡내보내기.txt 또는 .csv> --boy 준호이름 --girl 지민이름
  → tools/out/style_cards.json 생성 (직접 열어서 확인 · 수정 가능)
  → 확인 후 업로드: node tools/upload_style.mjs

카드에 들어가는 것 (사람별):
  callsPartner  상대를 부르는 호칭 (예: 자기야, 오빠)
  endings       자주 쓰는 말끝 (예: ~했어, ~쥬)
  phrases       자주 쓰는 표현
  emoji         자주 쓰는 웃음/이모티콘 (ㅋㅋ, ㅎㅎ, 🥰 …)
  samples       말투 예시 문장 120개 (숫자·링크·주소처럼 보이는 문장은 제외)
  pairs         주고받은 대화 60쌍 (상대가 한 말 → 이 사람의 답) — '대화하기 Beta' 사전학습용
"""
import argparse
import csv
import json
import random
import re
from collections import Counter
from pathlib import Path

LINE_PATTERNS = [
    # iOS: 2026. 11. 5. 오후 4:37, 지민 : 메시지
    re.compile(r"^\d{4}\. ?\d{1,2}\. ?\d{1,2}\.? (?:오전|오후) \d{1,2}:\d{2}, (.+?) : (.*)$"),
    # Android: 2026년 11월 5일 오후 4:37, 지민 : 메시지
    re.compile(r"^\d{4}년 \d{1,2}월 \d{1,2}일 (?:오전|오후) \d{1,2}:\d{2}, (.+?) : (.*)$"),
    # PC/Mac: [지민] [오후 4:37] 메시지
    re.compile(r"^\[(.+?)\] \[(?:오전|오후) \d{1,2}:\d{2}\] (.*)$"),
]
SKIP = re.compile(r"^(사진|동영상|이모티콘|파일|삭제된 메시지입니다|음성메시지|지도|송금|보이스톡|페이스톡|샵검색|사진 \d+장)")
PII = re.compile(r"(https?://|www\.|\d{3,}|@|번지|아파트|동 \d|호 |계좌|카드|비번|비밀번호)")
EMOJI = re.compile(r"[\U0001F300-\U0001FAFF☀-➿]")
LAUGH = re.compile(r"(ㅋ{2,}|ㅎ{2,}|ㅠ{2,}|ㅜ{2,})")
CALLS = ["자기야", "자기", "여보", "오빠", "애기야", "애기", "공주", "왕자", "베이비", "허니", "쟈기", "자갸", "오빵", "여봉"]


def parse(path: Path):
    msgs = []
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                user = row.get("User") or row.get("user") or row.get("이름") or ""
                text = row.get("Message") or row.get("message") or row.get("메시지") or ""
                if user and text:
                    msgs.append((user.strip(), text.strip()))
        return msgs
    last = None
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.rstrip()
        for pat in LINE_PATTERNS:
            m = pat.match(line)
            if m:
                last = [m.group(1).strip(), m.group(2).strip()]
                msgs.append(last)
                break
        else:
            if last and line and not re.match(r"^-{5,}|^\d{4}년 \d{1,2}월 \d{1,2}일", line):
                last[1] += " " + line.strip()  # 여러 줄 메시지
    return [tuple(m) for m in msgs]


def card(texts, partner_name):
    texts = [t for t in texts if t and not SKIP.match(t)]
    laughs = Counter()
    emojis = Counter()
    endings = Counter()
    words = Counter()
    calls = Counter()
    for t in texts:
        laughs.update(m[:4] for m in LAUGH.findall(t))
        emojis.update(EMOJI.findall(t))
        body = LAUGH.sub("", EMOJI.sub("", t)).strip(" ~.!?")
        if 2 <= len(body) <= 60:
            endings[body[-2:]] += 1
        for w in re.findall(r"[가-힣]{2,}", t):
            words[w] += 1
        for c in CALLS + ([partner_name + "아", partner_name + "야"] if partner_name else []):
            if c in t:
                calls[c] += 1
    common = {"그래서", "근데", "그리고", "진짜", "너무", "나도", "오늘", "내일", "지금", "그럼", "아니", "이제"}
    phrases = [w for w, n in words.most_common(80) if n >= 3 and w not in common][:15]
    pool = list(dict.fromkeys(t for t in texts if 4 <= len(t) <= 60 and not PII.search(t)))
    random.seed(7)
    samples = random.sample(pool, min(120, len(pool)))
    return {
        "callsPartner": [c for c, _ in calls.most_common(4)],
        "endings": [e for e, _ in endings.most_common(12)],
        "phrases": phrases,
        "emoji": [e for e, _ in (laughs + emojis).most_common(8)],
        "samples": samples,
        "messageCount": len(texts),
    }


def turns(msgs):
    """연달아 보낸 메시지는 한 번의 말(턴)로 묶음 (최대 3줄)"""
    out = []
    for user, text in msgs:
        if not text or SKIP.match(text):
            continue
        if out and out[-1][0] == user:
            if len(out[-1][1]) < 3:
                out[-1][1].append(text)
        else:
            out.append([user, [text]])
    return [(u, "\n".join(t)) for u, t in out]


def pairs_for(ts, me, other, n=60):
    """상대가 한 말 → 내가 바로 이어서 한 답 (LastTalk 처럼 대화 예시로 씀)"""
    ok = lambda t: 2 <= len(t) <= 90 and not PII.search(t)
    pool = [{"q": ts[i - 1][1], "a": ts[i][1]} for i in range(1, len(ts))
            if ts[i][0] == me and ts[i - 1][0] == other and ok(ts[i][1]) and ok(ts[i - 1][1])]
    random.seed(11)
    return random.sample(pool, min(n, len(pool)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--boy", required=True, help="대화방에 표시되는 남자(男 캐릭터) 이름")
    ap.add_argument("--girl", required=True, help="대화방에 표시되는 여자(女 캐릭터) 이름")
    a = ap.parse_args()
    msgs = parse(Path(a.file))
    by = {}
    for user, text in msgs:
        by.setdefault(user, []).append(text)
    print("대화방 참여자:", {u: len(t) for u, t in by.items()})
    for need in (a.boy, a.girl):
        if need not in by:
            raise SystemExit(f"'{need}' 이름의 메시지를 못 찾았어요. 위 참여자 이름 중에서 골라주세요.")
    out = {"boy": card(by[a.boy], a.girl), "girl": card(by[a.girl], a.boy)}
    ts = turns(msgs)
    out["boy"]["pairs"] = pairs_for(ts, a.boy, a.girl)
    out["girl"]["pairs"] = pairs_for(ts, a.girl, a.boy)
    for k in ("boy", "girl"):
        print(f"{k}: 메시지 {out[k]['messageCount']}개 → 예시 {len(out[k]['samples'])}개 · 대화쌍 {len(out[k]['pairs'])}개")
    dest = Path(__file__).parent / "out" / "style_cards.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"말투 카드 저장: {dest}  (예시 문장을 직접 확인하고, 빼고 싶은 문장은 지운 뒤 업로드하세요)")


if __name__ == "__main__":
    main()
