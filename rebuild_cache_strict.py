"""
"아이유::밤편지"가 전혀 다른 가수(Lee Jae Joon)의 커버로, "윤하::사건의
지평선"이 "NEWAGES"라는 다른 팀의 커버로 걸려있던 게 확인됐어. 원인은
reverify_not_found.py의 2단계 로직 — "검색어에 아티스트명을 넣었다면
제목만 맞아도 통과시킨다" — 가 너무 느슨했던 거야. 한국 음원 특성상
유명곡과 완전히 같은 제목의 커버/리메이크가 흔해서, 제목만 보고는
진짜 그 가수인지 전혀 보장이 안 됨.

그래서 이번엔 "제목으로 구제" 로직을 완전히 빼고, 대신 더 확실한 근거
하나를 추가했어: TJ차트 데이터에는 "아이유 (IU)", "백예린 (Yerin Baek)",
"도경수 (D.O.)"처럼 괄호 안에 영문 별칭이 이미 포함된 경우가 많은데,
기존 로직은 비교 전에 이 괄호 내용을 통째로 버리고 있었어. 이제 괄호
안 영문 별칭도 같이 비교 대상에 넣어서, "제목이 비슷하니 아마 맞겠지"가
아니라 "실제로 같은 아티스트라는 명확한 텍스트 증거"가 있을 때만
채택하도록 바꿈.

이 스크립트는 네트워크 호출 없이, reverify_not_found.py가 만든
reverify_report.json의 "rescued"(제목으로만 구제됐던 237곡 — clean_bad_matches.py가
이미 23곡은 정리함) 목록을 다시 검사해서:
  - 아티스트명이 직접 일치하거나, 괄호 안 영문 별칭이 일치하면 → 그대로 유지
  - 그렇지 않으면(= 순수 제목만 보고 구제됐던 것) → public/artwork-cache.json에서
    다시 null로 되돌림

사용법:
    cd voicefit
    python3 rebuild_cache_strict.py
"""

import json
import os
import re
import unicodedata

CACHE_PATH = os.path.join("public", "artwork-cache.json")
REVERIFY_REPORT_PATH = "reverify_report.json"
REPORT_PATH = "rebuild_strict_report.json"


def normalize_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[（(][^）)]*[）)]", "", s)  # 괄호 내용 제거(비교용 본체)
    s = "".join(ch for ch in s if unicodedata.category(ch)[0] in ("L", "N"))
    return s


def extract_paren_alias(s: str):
    m = re.search(r"[（(]([^）)]*)[）)]", s)
    if not m:
        return None
    alias = m.group(1).strip()
    return alias or None


def is_text_match(a: str, b: str) -> bool:
    x = normalize_text(a)
    y = normalize_text(b)
    if not x or not y:
        return False
    return x in y or y in x


def artist_really_matches(queried_artist: str, candidate_artist: str) -> bool:
    if is_text_match(queried_artist, candidate_artist):
        return True
    alias = extract_paren_alias(queried_artist)
    if alias and is_text_match(alias, candidate_artist):
        return True
    return False


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    with open(REVERIFY_REPORT_PATH, "r", encoding="utf-8") as f:
        reverify_report = json.load(f)

    rescued = reverify_report.get("rescued", [])

    kept = []
    reverted = []

    for item in rescued:
        key = item["key"]
        artist, _, _title = key.partition("::")
        candidate_artist = item.get("matched_artist", "")

        # clean_bad_matches.py가 이미 null로 되돌린 항목은 건드리지 않음
        if cache.get(key, {}).get("previewUrl") is None:
            continue

        if artist_really_matches(artist, candidate_artist):
            kept.append({"key": key, "matched_artist": candidate_artist})
        else:
            cache[key] = {"artworkUrl": None, "previewUrl": None}
            reverted.append(
                {
                    "key": key,
                    "wrongly_matched_artist": candidate_artist,
                    "matched_title": item.get("matched_title"),
                }
            )

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    report = {
        "kept_count": len(kept),
        "reverted_count": len(reverted),
        "kept": kept,
        "reverted": reverted,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("=== 완료 ===")
    print(f"아티스트가 실제로 확인되어 유지된 곡: {len(kept)}")
    print(f"제목만 보고 구제됐던 거라 다시 null로 되돌린 곡: {len(reverted)}")
    print(f"\n자세한 목록은 {REPORT_PATH} 에서 확인할 수 있어.")


if __name__ == "__main__":
    main()