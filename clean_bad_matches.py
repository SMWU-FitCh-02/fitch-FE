"""
reverify_not_found.py가 "제목 일치"만으로 구제했던 260곡 중에,
사실은 보컬이 없는 노래방 반주(MR)/인스트루멘탈/오르골 버전이거나,
제목만 우연히 같은 완전 다른 곡이 섞여 들어온 걸 다시 걸러내는 스크립트.

아래 패턴에 해당하면 previewUrl/artworkUrl을 다시 null로 되돌려:
  - 아티스트가 "코케" (유명 노래방 반주 업로더)
  - 트랙 제목에 "karaoke", "instrumental", "(mr)", "오르골" 포함
  - 그 외, 내용을 보니 제목만 같고 완전 다른 곡인 게 확인된 것들
    (하드코딩된 키 목록: KNOWN_WRONG_SONGS)

사용법:
    cd voicefit
    python3 clean_bad_matches.py
"""

import json
import os
import re

CACHE_PATH = os.path.join("public", "artwork-cache.json")
REVERIFY_REPORT_PATH = "reverify_report.json"
REPORT_PATH = "clean_report.json"

BAD_PATTERNS = [
    re.compile(r"karaoke", re.IGNORECASE),
    re.compile(r"instrumental", re.IGNORECASE),
    re.compile(r"\(mr\)", re.IGNORECASE),
    re.compile(r"오르골"),
]

BAD_ARTISTS = {"코케", "mr factory", "MR Factory".lower()}

# 제목만 우연히 같아서 구제됐지만, 실제로는 완전히 다른 곡인 것으로
# 확인된 키들. 필요하면 여기에 계속 추가해서 재실행하면 돼.
KNOWN_WRONG_SONGS = {
    "티아라::Day By Day",  # 뮤지컬 '갓스펠' 동명곡이 잘못 걸림
}


def is_bad_match(artist_name: str, track_name: str) -> bool:
    if artist_name and artist_name.strip().lower() in BAD_ARTISTS:
        return True
    for pattern in BAD_PATTERNS:
        if pattern.search(track_name or "") or pattern.search(artist_name or ""):
            return True
    return False


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    with open(REVERIFY_REPORT_PATH, "r", encoding="utf-8") as f:
        reverify_report = json.load(f)

    rescued = reverify_report.get("rescued", [])

    removed = []

    for item in rescued:
        key = item["key"]
        artist_name = item.get("matched_artist", "")
        track_name = item.get("matched_title", "")

        if key in KNOWN_WRONG_SONGS or is_bad_match(artist_name, track_name):
            cache[key] = {"artworkUrl": None, "previewUrl": None}
            removed.append(
                {
                    "key": key,
                    "bad_artist": artist_name,
                    "bad_title": track_name,
                }
            )

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    report = {
        "removed_count": len(removed),
        "removed": removed,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"=== 완료 ===")
    print(f"노래방/MR/인스트루멘탈/오매칭으로 판단되어 다시 null 처리된 곡: {len(removed)}곡")
    print(f"자세한 목록은 {REPORT_PATH} 에서 확인할 수 있어.")
    for r in removed:
        print(f"  - {r['key']}  (걸러진 매치: {r['bad_artist']} / {r['bad_title']})")


if __name__ == "__main__":
    main()