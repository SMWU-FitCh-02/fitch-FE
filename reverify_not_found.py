"""
1차 verify_artwork_cache.py 실행 결과, 447곡이 "검증 통과 못함"으로
null 처리됐었어. 다시 살펴보니 그 중 상당수(아이유, 윤하, 소녀시대 등
유명곡 포함)는 틀린 게 아니라 **아이튠즈 카탈로그의 아티스트 표기가
한글 활동명과 달라서**(예: "아이유" vs "IU", "뱅크" vs "Bank") 생긴
오탐이었음.

그래서 판정 로직을 보완했어:
  1) 아티스트명이 일치하면 채택 (가장 신뢰도 높음)
  2) 아티스트명이 포함된 검색어로 찾은 결과라면(=이미 애플 자체
     검색엔진이 아티스트 텍스트로 관련도를 계산했을 것이므로),
     artistName 표기가 달라도 곡 제목이 확실히 일치하면 구제해서 채택
  3) 제목만 검색해서 아티스트 단서가 전혀 없는 마지막 시도는, 여전히
     아티스트 일치로만 검증 (동명이곡 오매칭 방지)

이 스크립트는 1차 실행에서 null 처리됐던 447곡만 verify_report.json의
"not_found" 목록에서 골라, 위 보완된 로직으로 다시 검색해서
public/artwork-cache.json 을 갱신해. (이미 통과했던 170곡은 다시
건드리지 않음 — 더 빠르게 끝남)

사용법:
    cd voicefit
    python3 reverify_not_found.py
"""

import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request

CACHE_PATH = os.path.join("public", "artwork-cache.json")
PREV_REPORT_PATH = "verify_report.json"
REPORT_PATH = "reverify_report.json"
SLEEP_SEC = 1.2

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def normalize_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[（(][^）)]*[）)]", "", s)
    s = "".join(ch for ch in s if unicodedata.category(ch)[0] in ("L", "N"))
    return s


def is_text_match(a: str, b: str) -> bool:
    x = normalize_text(a)
    y = normalize_text(b)
    if not x or not y:
        return False
    return x in y or y in x


def clean_title(title: str) -> str:
    cleaned = re.sub(r"[（(][^）)]*[）)]", "", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def search_once(term: str, country: str | None):
    params = {"term": term, "media": "music", "entity": "song", "limit": "5"}
    if country:
        params["country"] = country
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("results", [])
    except Exception:
        return []


def pick_verified_match(results, artist: str, title: str, search_included_artist: bool):
    for r in results:
        if is_text_match(artist, r.get("artistName", "")):
            return r
    if search_included_artist:
        for r in results:
            if is_text_match(title, r.get("trackName", "")):
                return r
    return None


def search_with_fallbacks(title: str, artist: str):
    attempts = []
    term = f"{artist} {title}".strip()
    attempts.append((term, "KR", True))
    attempts.append((term, None, True))

    cleaned = clean_title(title)
    if cleaned and cleaned != title:
        clean_term = f"{artist} {cleaned}".strip()
        attempts.append((clean_term, "KR", True))
        attempts.append((clean_term, None, True))

    title_only = cleaned or title
    attempts.append((title_only, "KR", False))
    attempts.append((title_only, None, False))

    for search_term, country, included_artist in attempts:
        results = search_once(search_term, country)
        verified = pick_verified_match(results, artist, title, included_artist)
        if verified:
            return verified
        time.sleep(SLEEP_SEC)

    return None


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    with open(PREV_REPORT_PATH, "r", encoding="utf-8") as f:
        prev_report = json.load(f)

    not_found = prev_report.get("not_found", [])
    total = len(not_found)
    print(f"1차에서 null 처리됐던 {total}곡 재검색 시작...")

    rescued = []       # 이번엔 제목 구제 로직으로 올바르게 찾아낸 것들
    still_not_found = []  # 그래도 못 찾은 것들 (진짜 없거나 동명이곡 위험)

    for i, item in enumerate(not_found, start=1):
        key = item["key"]
        artist, _, title = key.partition("::")

        result = search_with_fallbacks(title, artist)

        if result:
            new_artwork = result.get("artworkUrl100")
            new_artwork = new_artwork.replace("100x100", "400x400") if new_artwork else None
            new_preview = result.get("previewUrl")

            cache[key] = {"artworkUrl": new_artwork, "previewUrl": new_preview}
            rescued.append(
                {
                    "key": key,
                    "previewUrl": new_preview,
                    "matched_artist": result.get("artistName"),
                    "matched_title": result.get("trackName"),
                }
            )
        else:
            still_not_found.append(key)

        if i % 20 == 0 or i == total:
            print(f"  [{i}/{total}] 구제됨:{len(rescued)} 여전히 못찾음:{len(still_not_found)}")

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    report = {
        "total_retried": total,
        "rescued_count": len(rescued),
        "still_not_found_count": len(still_not_found),
        "rescued": rescued,
        "still_not_found": still_not_found,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n=== 완료 ===")
    print(f"구제되어 다시 채워짐: {len(rescued)}")
    print(f"그래도 못 찾음(null 유지): {len(still_not_found)}")
    print(f"\n자세한 내용은 {REPORT_PATH} 파일에서 확인할 수 있어.")


if __name__ == "__main__":
    main()