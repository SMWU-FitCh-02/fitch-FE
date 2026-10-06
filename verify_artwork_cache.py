
"""
기존 public/artwork-cache.json(622곡)을 다시 검사해서,
아티스트가 실제로 일치하지 않는(엉뚱한 곡이 걸린) 항목을
찾아내고 고쳐주는 스크립트.

route.ts에 적용한 것과 "같은" 아티스트 검증 로직을 그대로 파이썬으로
옮겨서 썼어 — 검색 결과 중 artistName이 우리가 찾던 아티스트와
비슷하지 않으면 채택하지 않고, 그래도 못 찾으면 previewUrl/artworkUrl을
null로 비워버려. (틀린 곡이 재생되는 것보다는 미리듣기가 아예 없는 게 낫다는 판단)

사용법 (fetch_tj_artwork_cache.py 돌렸을 때와 동일한 방식):
    cd voicefit
    python3 verify_artwork_cache.py

끝나면:
  - public/artwork-cache.json 이 검증된 결과로 덮어써짐
  - verify_report.json 이 같은 폴더에 생성됨
    -> 어떤 곡이 "원래 틀린 곡이 걸려 있었는지"(mismatch_fixed),
       어떤 곡이 "이번에도 못 찾았는지"(not_found) 확인할 수 있어
"""

import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request

CACHE_PATH = os.path.join("public", "artwork-cache.json")
REPORT_PATH = "verify_report.json"
SLEEP_SEC = 1.2  # iTunes 레이트리밋 피하려고 요청 사이 텀 (기존 배치 스크립트와 동일)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def normalize_artist_name(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[（(][^）)]*[）)]", "", s)  # "아이유 (IU)" -> "아이유 "
    # \p{L}\p{N} 상당: 유니코드 문자/숫자만 남기기
    s = "".join(ch for ch in s if unicodedata.category(ch)[0] in ("L", "N"))
    return s


def is_artist_match(queried: str, candidate: str) -> bool:
    a = normalize_artist_name(queried)
    b = normalize_artist_name(candidate)
    if not a or not b:
        return False
    return a in b or b in a


def clean_title(title: str) -> str:
    cleaned = re.sub(r"[（(][^）)]*[）)]", "", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def search_once(term: str, country: str | None):
    params = {
        "term": term,
        "media": "music",
        "entity": "song",
        "limit": "5",
    }
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


def pick_verified_match(results, artist: str):
    for r in results:
        if is_artist_match(artist, r.get("artistName", "")):
            return r
    return None


def search_with_fallbacks(title: str, artist: str):
    attempts = []
    term = f"{artist} {title}".strip()
    attempts.append((term, "KR"))
    attempts.append((term, None))

    cleaned = clean_title(title)
    if cleaned and cleaned != title:
        clean_term = f"{artist} {cleaned}".strip()
        attempts.append((clean_term, "KR"))
        attempts.append((clean_term, None))

    title_only = cleaned or title
    attempts.append((title_only, "KR"))
    attempts.append((title_only, None))

    for search_term, country in attempts:
        results = search_once(search_term, country)
        verified = pick_verified_match(results, artist)
        if verified:
            return verified
        time.sleep(SLEEP_SEC)

    return None


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    total = len(cache)
    print(f"총 {total}곡 재검증 시작...")

    mismatch_fixed = []  # 원래 값이 있었는데(즉 뭔가 곡이 걸려있었는데) 검증 결과가 달라진 것들
    confirmed_ok = []    # 원래 값이 검증을 통과해서 그대로 유지된 것들
    not_found = []       # 검증을 통과하는 곡을 못 찾아서 null로 비운 것들
    already_null = []    # 원래부터 null이었던 것들 (스킵은 하되 집계)

    new_cache = {}

    for i, (key, entry) in enumerate(cache.items(), start=1):
        artist, _, title = key.partition("::")
        old_preview = entry.get("previewUrl")

        if old_preview is None:
            already_null.append(key)
            new_cache[key] = entry
            continue

        result = search_with_fallbacks(title, artist)

        if result:
            new_artwork = result.get("artworkUrl100")
            new_artwork = new_artwork.replace("100x100", "400x400") if new_artwork else None
            new_preview = result.get("previewUrl")

            new_cache[key] = {"artworkUrl": new_artwork, "previewUrl": new_preview}

            if new_preview != old_preview:
                mismatch_fixed.append(
                    {
                        "key": key,
                        "old_previewUrl": old_preview,
                        "new_previewUrl": new_preview,
                        "matched_artist": result.get("artistName"),
                    }
                )
            else:
                confirmed_ok.append(key)
        else:
            new_cache[key] = {"artworkUrl": None, "previewUrl": None}
            not_found.append({"key": key, "old_previewUrl": old_preview})

        if i % 20 == 0 or i == total:
            print(
                f"  [{i}/{total}] 확인됨:{len(confirmed_ok)} "
                f"교정됨:{len(mismatch_fixed)} 미발견:{len(not_found)}"
            )

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(new_cache, f, ensure_ascii=False, indent=2)

    report = {
        "total": total,
        "confirmed_ok_count": len(confirmed_ok),
        "mismatch_fixed_count": len(mismatch_fixed),
        "not_found_count": len(not_found),
        "already_null_count": len(already_null),
        "mismatch_fixed": mismatch_fixed,
        "not_found": not_found,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n=== 완료 ===")
    print(f"그대로 유지(검증 통과): {len(confirmed_ok)}")
    print(f"잘못 걸려있던 곡 교정:   {len(mismatch_fixed)}")
    print(f"검증 통과 못해서 null:  {len(not_found)}")
    print(f"원래부터 null(스킵):    {len(already_null)}")
    print(f"\n자세한 내용은 {REPORT_PATH} 파일에서 확인할 수 있어.")


if __name__ == "__main__":
    main()