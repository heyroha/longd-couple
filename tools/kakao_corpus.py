"""카카오톡 대화 전체 → '대화하기 Beta' 학습 자료 (talk_corpus.json)

말투 카드(kakao_style.py)는 예시 몇백 개만 뽑지만, 이건 대화 전체를 대화 흐름 그대로 씀.
서버는 매 대화마다 지금 얘기와 비슷한 실제 대화 구간을 찾아 AI에게 보여줌 (LastTalk 방식).

사용:
  python3 tools/kakao_corpus.py <카톡내보내기.csv 또는 .txt> --boy 준호이름 --girl 지민이름
  → tools/out/talk_corpus.json (gitignore)
  → 업로드: node tools/upload_corpus.mjs

자동으로 빼는 것: 링크, 전화·계좌·카드 번호처럼 긴 숫자, 주소, 비밀번호·인증번호·계좌 얘기,
사진·동영상·이모티콘·송금 같은 시스템 메시지. 한 줄도 원문 그대로 화면에 찍지 않음(개수·비율만 출력).
"""
import argparse
import csv
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

from kakao_style import parse as parse_plain, SKIP, CALLS

DROP = re.compile(r"(계좌|비번|비밀번호|인증번호|카드번호|주민|여권|otp|OTP|\d{2,3}-\d{3,4}-\d{4}|\d{6,}|번지|\d+동 ?\d+호|\S+로 ?\d+번?길|https?://|www\.)")
EMOJI = re.compile(r"[\U0001F300-\U0001FAFF☀-➿❤]")
GAP_MIN = 180  # 3시간 넘게 쉬면 다른 대화로 봄


def parse_csv(path: Path):
    out = []
    with path.open(encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            user = (row.get("User") or row.get("이름") or "").strip()
            text = (row.get("Message") or row.get("메시지") or "").strip()
            d = (row.get("Date") or row.get("날짜") or "").strip()
            try:
                ts = datetime.fromisoformat(d.replace(".", "-")) if d else None
            except ValueError:
                ts = None
            if user and text:
                out.append((ts, user, text))
    return out


def clean(text):
    if SKIP.match(text) or DROP.search(text):
        return None
    t = re.sub(r"\s+", " ", text).strip()
    return t[:200] if t else None


def stats(lines, turn_sizes):
    n = len(lines) or 1
    emo_msgs = sum(1 for t in lines if EMOJI.search(t))
    laugh = Counter()
    for t in lines:
        for m in re.findall(r"(ㅋ{2,}|ㅎ{2,}|ㅠ{2,}|ㅜ{2,})", t):
            laugh[m[0]] += 1
    emo = Counter(e for t in lines for e in EMOJI.findall(t))
    lens = sorted(len(t) for t in lines)
    calls = Counter(c for t in lines for c in CALLS if c in t)
    return {
        "messages": len(lines),
        "emojiPct": round(emo_msgs * 100 / n, 1),
        "emojiTop": [e for e, _ in emo.most_common(6)],
        "laughPct": {k: round(v * 100 / n, 1) for k, v in laugh.most_common()},
        "lenMedian": lens[len(lens) // 2] if lens else 0,
        "len90": lens[int(len(lens) * 0.9)] if lens else 0,
        "bubbles": {str(k): round(v * 100 / max(1, len(turn_sizes)), 1) for k, v in sorted(Counter(min(s, 5) for s in turn_sizes).items())},
        "calls": [c for c, _ in calls.most_common(4)],
        "yoPct": round(sum(1 for t in lines if re.search(r"요[ㅎㅋㅠ~?!.]*\s*$", t)) * 100 / n, 1),
        "periodPct": round(sum(1 for t in lines if t.rstrip().endswith(".")) * 100 / n, 1),
    }


# 이 사람이 "~했어/~중"이라고 말한 시각으로 하루 일과를 추정 (질문하는 말은 제외)
ROUTINE = [
    ("일어남", r"(일어났|일어남|기상|깼어|방금 깼)"),
    ("출근", r"출근(했|함|중|완료|길|하는 ?중|하러)"),
    ("점심 먹음", r"점심(먹|머)"),
    ("퇴근", r"퇴근(했|함|중|완료|길|하는 ?중|하고|각)"),
    ("저녁 먹음", r"저녁(먹|머)"),
    ("집 도착", r"(집 ?도착|집 ?왔|집이야|집 들어왔)"),
    ("운동", r"(운동 ?(가|하|끝|중|다녀)|헬스)"),
    ("씻음", r"(씻고|샤워)"),
    ("잠", r"(잘자|자러 ?가|이제 잘|잘게|굿나잇|꿀잠)"),
]


def hm(mins):
    return f"{int(mins) // 60:02d}:{int(mins) % 60:02d}"


def routine(items):
    out = []
    for label, pat in ROUTINE:
        r = re.compile(pat)
        row = {"label": label}
        for kind, wk in (("weekday", lambda d: d < 5), ("weekend", lambda d: d >= 5)):
            ms = sorted(ts.hour * 60 + ts.minute for ts, t in items
                        if wk(ts.weekday()) and r.search(t) and not t.rstrip().endswith("?"))
            if label == "잠":  # 새벽 1시는 25시로 봐야 중간값이 맞음
                ms = sorted(m + 1440 if m < 360 else m for m in ms)
            q1, q3 = (ms[len(ms) // 4], ms[(len(ms) * 3) // 4]) if ms else (0, 0)
            if len(ms) >= 5 and q3 - q1 <= 180:  # 5번 넘게 말했고 시간이 3시간 안에 모일 때만 (들쭉날쭉하면 버림)
                med = ms[len(ms) // 2]
                row[kind] = {"n": len(ms), "mid": hm(med % 1440), "range": f"{hm(q1 % 1440)}~{hm(q3 % 1440)}"}
        if len(row) > 1:
            out.append(row)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--boy", required=True)
    ap.add_argument("--girl", required=True)
    a = ap.parse_args()
    p = Path(a.file)
    rows = parse_csv(p) if p.suffix.lower() == ".csv" else [(None, u, t) for u, t in parse_plain(p)]
    who = {a.boy: "b", a.girl: "g"}
    # 줄 = 누구(b/g) + 보낸 시각 HHMM(모르면 ----) + 내용. days[i] = i번째 대화가 시작된 날짜
    sessions, days, cur, last_ts, dropped = [], [], [], None, 0
    timed = {"b": [], "g": []}  # (시각, 내용) — 일과 시간 통계용
    for ts, user, text in rows:
        if user not in who:
            continue
        if ts and last_ts and (ts - last_ts).total_seconds() / 60 > GAP_MIN and cur:
            sessions.append(cur)
            cur = []
        if not cur:
            days.append(ts.strftime("%Y-%m-%d") if ts else "")
        last_ts = ts or last_ts
        t = clean(text)
        if t is None:
            dropped += 1
            continue
        cur.append(who[user] + (ts.strftime("%H%M") if ts else "----") + t)
        if ts:
            timed[who[user]].append((ts, t))
    if cur:
        sessions.append(cur)
    keep = [i for i, x in enumerate(sessions) if len(x) >= 2]
    sessions, days = [sessions[i] for i in keep], [days[i] for i in keep]

    out = {"v": 2, "sessions": sessions, "days": days, "stats": {}}
    for name, k in ((a.boy, "boy"), (a.girl, "girl")):
        c = k[0]
        lines = [m[5:] for s in sessions for m in s if m[0] == c]
        sizes = []
        for s in sessions:
            run = 0
            for m in s + ["x"]:
                if m[0] == c:
                    run += 1
                elif run:
                    sizes.append(run)
                    run = 0
        out["stats"][k] = stats(lines, sizes)
        out["stats"][k]["routine"] = routine(timed[c])
    dest = Path(__file__).parent / "out" / "talk_corpus.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    total = sum(len(s) for s in sessions)
    print(f"대화 {len(sessions)}묶음 · 메시지 {total}개 사용 · 자동으로 뺀 메시지 {dropped}개 · 파일 {dest.stat().st_size // 1024}KB")
    for k in ("boy", "girl"):
        s = out["stats"][k]
        print(k, json.dumps({x: s[x] for x in ("messages", "emojiPct", "lenMedian", "bubbles")}, ensure_ascii=False))
        print("  일과:", json.dumps(s["routine"], ensure_ascii=False))


if __name__ == "__main__":
    main()
