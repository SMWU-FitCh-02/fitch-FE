"""
restore_known_good.py 이후 still_null로 남은 45곡 중, 다시 확인해보니
아래 3곡은 실제로 맞는 매치인데 화이트리스트에서 빠져있었던 것들:

  - 윤하::기다리다 -> Younha (화이트리스트에 "윤하" 자체가 빠져있었음)
  - BIGBANG::Wedding Dress -> TAEYANG (빅뱅 멤버 태양 솔로곡, 맞는 곡인데
    이 키는 아티스트가 이미 영문 "BIGBANG"이라 한글 화이트리스트 규칙이
    안 걸렸음)
  - Various Artists::This Is Me(The Greatest Showman OST) -> Keala Settle
    & The Greatest Showman Ensemble (뮤지컬 캐스트 레코딩, 맞는 공식 음원)

previewUrl은 이전 리포트에서 이미 확인된 값을 그대로 쓰고, artworkUrl만
다시 조회해서 채운다.

사용법:
    cd voicefit
    python3 add_known_exceptions.py
"""

import json
import os
import time
import urllib.parse
import urllib.request

CACHE_PATH = os.path.join("public", "artwork-cache.json")
SLEEP_SEC = 1.0

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

EXCEPTIONS = [
    {
        "key": "윤하::기다리다",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9b/eb/7b/9beb7bb8-ee93-44d6-af4e-1b8ec1852f17/mzaf_11248602784074222528.plus.aac.p.m4a",
        "search_artist": "Younha",
        "search_title": "기다리다",
    },
    {
        "key": "BIGBANG::Wedding Dress",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/cf/99/4d/cf994d46-08ed-8762-7728-2d082374816c/mzaf_17865095055134803920.plus.aac.p.m4a",
        "search_artist": "TAEYANG",
        "search_title": "Wedding Dress",
    },
    {
        "key": "Various Artists::This Is Me(The Greatest Showman OST)",
        "previewUrl": "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/19/14/ef/1914efd4-057f-db2c-1959-0a064ae3f3df/mzaf_14670696818387595514.plus.aac.p.m4a",
        "search_artist": "Keala Settle",
        "search_title": "This Is Me",
    },
]


def fetch_artwork_for(previewurl: str, artist: str, title: str):
    term = f"{artist} {title}".strip()
    params = {"term": term, "media": "music", "entity": "song", "limit": "5"}
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for r in data.get("results", []):
                if r.get("previewUrl") == previewurl:
                    art = r.get("artworkUrl100")
                    return art.replace("100x100", "400x400") if art else None
    except Exception:
        pass
    return None


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    added = []
    for item in EXCEPTIONS:
        artwork = fetch_artwork_for(item["previewUrl"], item["search_artist"], item["search_title"])
        cache[item["key"]] = {"artworkUrl": artwork, "previewUrl": item["previewUrl"]}
        added.append(item["key"])
        time.sleep(SLEEP_SEC)

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    print("=== 완료 ===")
    print(f"추가로 복구된 곡: {len(added)}")
    for k in added:
        print(f"  - {k}")


if __name__ == "__main__":
    main()