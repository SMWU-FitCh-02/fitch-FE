"""
TJ 차트 전체(모든 카테고리)를 돌면서 public/artwork-cache.json에 없는 곡만
골라 iTunes에서 artworkUrl/previewUrl을 찾아 캐시 파일에 추가해주는 배치 스크립트.

app/api/artwork/route.ts 의 로직(세션쿠키+CSRF로 TJ차트 가져오기, iTunes 폴백
검색 체인)을 그대로 Python으로 옮겨서 똑같은 매칭 결과가 나오게 했어.

사용법 (voicefit 폴더 루트에서):
    pip install requests
    python fetch_artwork_cache.py

끝나면 voicefit/public/artwork-cache.json 이 갱신돼. 기존에 있던 항목은
그대로 유지되고, 없던 곡만 새로 추가/병합돼.
"""

import json
import re
import time
import urllib.parse
from pathlib import Path

import requests

# ── 설정 ──────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent  # voicefit 루트에서 실행한다고 가정
CACHE_PATH = PROJECT_ROOT / "public" / "artwork-cache.json"

TJ_CHART_BASE = "https://www.tjmedia.com"
TJ_CHART_PAGE = f"{TJ_CHART_BASE}/chart/top100"
TJ_CHART_API = f"{TJ_CHART_BASE}/legacy/api/topAndHot100"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# TJ_CATEGORIES (lib/tjchart.ts 와 동일)
TJ_CATEGORIES = [
    ("", "종합"),
    ("2", "POP"),
    ("4", "발라드"),
    ("5", "댄스"),
    ("8", "OST"),
    ("10", "랩/힙합"),
    ("11", "R&B/어반"),
]

REQUEST_SLEEP_SEC = 1.2  # iTunes 라이브 검색 사이사이 쉬는 시간 (레이트 리밋 방지)


# ── TJ 차트 스크래핑 ──────────────────────────────────────────────────
def tj_fetch_session():
    res = requests.get(TJ_CHART_PAGE, headers={"User-Agent": UA}, timeout=15)
    res.raise_for_status()

    jsessionid = None
    csrf_token = None
    for raw_cookie in res.headers.get("Set-Cookie", "").split(","):
        if "JSESSIONID=" in raw_cookie:
            m = re.search(r"JSESSIONID=([^;]+)", raw_cookie)
            if m:
                jsessionid = m.group(1)
        if "CSRF_TOKEN=" in raw_cookie:
            m = re.search(r"CSRF_TOKEN=([^;]+)", raw_cookie)
            if m:
                csrf_token = m.group(1)

    # requests는 Set-Cookie를 세션 쿠키 jar로도 넣어주므로 그쪽도 함께 확인
    jar = res.cookies
    jsessionid = jsessionid or jar.get("JSESSIONID")
    csrf_token = csrf_token or jar.get("CSRF_TOKEN")

    if not jsessionid or not csrf_token:
        raise RuntimeError("TJ 세션 쿠키를 가져오지 못함 (JSESSIONID/CSRF_TOKEN 없음)")

    return jsessionid, csrf_token


def fetch_tj_chart(str_type: str):
    jsessionid, csrf_token = tj_fetch_session()

    import datetime

    end = datetime.date.today()
    start = end - datetime.timedelta(days=29)

    body = {
        "chartType": "TOP",
        "searchStartDate": start.isoformat(),
        "searchEndDate": end.isoformat(),
        "strType": str_type,
    }

    headers = {
        "User-Agent": UA,
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": TJ_CHART_BASE,
        "Referer": TJ_CHART_PAGE,
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": csrf_token,
        "Cookie": f"JSESSIONID={jsessionid}; CSRF_TOKEN={csrf_token}",
    }

    res = requests.post(
        TJ_CHART_API,
        headers=headers,
        data=urllib.parse.urlencode(body),
        timeout=15,
    )
    res.raise_for_status()
    payload = res.json()
    raw_items = (payload.get("resultData") or {}).get("items") or []

    items = []
    for row in raw_items:
        no = str(row.get("pro") or "").strip()
        title = str(row.get("indexTitle") or "").strip()
        if not no or not title:
            continue
        items.append(
            {
                "title": title,
                "artist": str(row.get("indexSong") or "").strip(),
            }
        )
    return items


# ── iTunes 검색 (route.ts의 searchWithFallbacks와 동일 로직) ──────────
def clean_title(title: str) -> str:
    cleaned = re.sub(r"[（(][^）)]*[）)]", "", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def search_once(term: str, country: str | None = None):
    params = {"term": term, "media": "music", "entity": "song", "limit": "3"}
    if country:
        params["country"] = country
    res = requests.get(
        "https://itunes.apple.com/search",
        params=params,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
            )
        },
        timeout=15,
    )
    time.sleep(REQUEST_SLEEP_SEC)
    if not res.ok:
        return None
    results = res.json().get("results") or []
    return results[0] if results else None


def search_with_fallbacks(title: str, artist: str):
    term = f"{artist} {title}".strip()
    result = search_once(term, "KR")
    if result:
        return result
    result = search_once(term)
    if result:
        return result

    cleaned = clean_title(title)
    if cleaned and cleaned != title:
        clean_term = f"{artist} {cleaned}".strip()
        result = search_once(clean_term, "KR")
        if result:
            return result
        result = search_once(clean_term)
        if result:
            return result

    title_only = cleaned or title
    result = search_once(title_only, "KR")
    if result:
        return result
    return search_once(title_only)


# ── 메인 ──────────────────────────────────────────────────────────────
def main():
    cache: dict = {}
    if CACHE_PATH.exists():
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        print(f"기존 캐시 {len(cache)}곡 로드: {CACHE_PATH}")
    else:
        print("기존 캐시 파일이 없어서 새로 만들게")
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 모든 카테고리의 차트를 모아서 중복 제거 (종합 + 장르별)
    all_songs: dict[str, dict] = {}
    for str_type, label in TJ_CATEGORIES:
        try:
            items = fetch_tj_chart(str_type)
            print(f"[{label}] {len(items)}곡 불러옴")
        except Exception as e:
            print(f"[{label}] 차트 불러오기 실패: {e}")
            continue
        for item in items:
            key = f"{item['artist']}::{item['title']}"
            all_songs[key] = item
        time.sleep(0.5)  # TJ 서버에도 너무 빨리 연달아 치지 않도록

    print(f"\n전체 고유 곡 수: {len(all_songs)}곡")

    missing = [v for k, v in all_songs.items() if k not in cache]
    print(f"캐시에 없는 곡: {len(missing)}곡 — iTunes 조회 시작\n")

    added = 0
    for i, song in enumerate(missing, 1):
        key = f"{song['artist']}::{song['title']}"
        try:
            result = search_with_fallbacks(song["title"], song["artist"])
        except Exception as e:
            print(f"  [{i}/{len(missing)}] {song['artist']} - {song['title']}: 에러 ({e})")
            continue

        if result:
            artwork_url = (result.get("artworkUrl100") or "").replace("100x100", "400x400") or None
            preview_url = result.get("previewUrl") or None
            cache[key] = {"artworkUrl": artwork_url, "previewUrl": preview_url}
            if preview_url:
                added += 1
                print(f"  [{i}/{len(missing)}] ✅ {song['artist']} - {song['title']}")
            else:
                print(f"  [{i}/{len(missing)}] ⚠️  매칭은 됐지만 미리듣기 없음: {song['artist']} - {song['title']}")
        else:
            cache[key] = {"artworkUrl": None, "previewUrl": None}
            print(f"  [{i}/{len(missing)}] ❌ 매칭 실패: {song['artist']} - {song['title']}")

        # 20곡마다 중간 저장 (중간에 끊겨도 날아가지 않게)
        if i % 20 == 0:
            CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n완료! 총 {len(cache)}곡 캐싱됨 (이번에 미리듣기 찾은 곡 {added}개) → {CACHE_PATH}")


if __name__ == "__main__":
    main()