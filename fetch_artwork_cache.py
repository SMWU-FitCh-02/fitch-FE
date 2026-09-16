"""
DB에 등록된 모든 곡의 앨범 커버/미리듣기 URL을 미리 조회해서
artwork-cache.json 파일로 저장하는 스크립트.
"""

import json
import os
import sys
import time

import requests

API_BASE = os.environ.get("FITCH_API_BASE", "http://localhost:8080")
USERNAME = os.environ.get("FITCH_USERNAME")
PASSWORD = os.environ.get("FITCH_PASSWORD")
OUTPUT_PATH = os.environ.get("OUTPUT_PATH", "artwork-cache.json")
DELAY_SECONDS = 1.2

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def login():
    res = requests.post(
        f"{API_BASE}/auth/login",
        json={"username": USERNAME, "password": PASSWORD},
    )
    res.raise_for_status()
    return res.json()["accessToken"]


def search_itunes(title, artist, retries=3):
    term = f"{artist} {title}".strip()
    for attempt in range(retries):
        try:
            res = requests.get(
                "https://itunes.apple.com/search",
                params={"term": term, "media": "music", "entity": "song", "limit": 1},
                headers={"User-Agent": USER_AGENT},
                timeout=10,
            )
            if res.status_code in (403, 429):
                wait = 10 * (attempt + 1)
                print(f"    rate limited, {wait}초 대기 후 재시도...")
                time.sleep(wait)
                continue
            res.raise_for_status()
            data = res.json()
            results = data.get("results") or []
            if not results:
                return None, None
            r = results[0]
            artwork = r.get("artworkUrl100")
            if artwork:
                artwork = artwork.replace("100x100", "400x400")
            return artwork, r.get("previewUrl")
        except requests.RequestException as e:
            print(f"    에러: {e}, 3초 후 재시도")
            time.sleep(3)
    return None, None


def main():
    if not USERNAME or not PASSWORD:
        print("환경변수 FITCH_USERNAME, FITCH_PASSWORD를 먼저 설정해주세요.")
        sys.exit(1)

    token = login()
    headers = {"Authorization": f"Bearer {token}"}
    songs = requests.get(f"{API_BASE}/songs", headers=headers).json()
    print(f"총 {len(songs)}곡. 곡당 약 {DELAY_SECONDS}초 간격으로 조회합니다.\n")

    cache = {}
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            cache = json.load(f)

    for i, s in enumerate(songs, 1):
        key = f"{s['artist']}::{s['title']}"
        if key in cache and cache[key].get("artworkUrl"):
            print(f"[{i}/{len(songs)}] 이미 있음, 건너뜀: {s['title']}")
            continue

        artwork, preview = search_itunes(s["title"], s["artist"])
        cache[key] = {"artworkUrl": artwork, "previewUrl": preview}
        status = "찾음" if artwork else "못찾음"
        print(f"[{i}/{len(songs)}] {status}: {s['title']} - {s['artist']}")

        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)

        time.sleep(DELAY_SECONDS)

    found = sum(1 for v in cache.values() if v.get("artworkUrl"))
    print(f"\n완료: {found}/{len(cache)}곡 커버 찾음. 결과 파일: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
