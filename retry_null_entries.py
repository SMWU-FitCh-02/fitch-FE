"""
"강남스타일"처럼 분명히 애플뮤직에 있는 곡인데도 null로 남아있는 걸 보니,
아까 수백 번 연속으로 아이튠즈 검색 API를 호출하면서 레이트리밋에
걸려 조용히 실패(빈 배열 처리)했을 가능성이 있어.

이 스크립트는 지금 null인 항목들을 "호출 간격을 훨씬 넉넉하게"(2.5초)
주고, HTTP 에러/상태코드를 전부 출력하면서 다시 검색해봐. 레이트리밋이
진짜 원인이었다면 이번엔 꽤 많이 복구될 거고, 그래도 안 되면 진짜로
아이튠즈에 없는 곡(인디/자작곡 등)이라고 확신할 수 있어.

검증 기준은 route.ts와 동일(아티스트 직접 일치 또는 괄호 안 영문 별칭
일치)이라 추가로 로마자 표기 화이트리스트가 필요한 곡은 여전히 안
걸릴 수 있어 — 그런 경우는 결과 보고 다시 알려줘.

사용법:
    cd voicefit
    python3 retry_null_entries.py
"""

import json
import os
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

CACHE_PATH = os.path.join("public", "artwork-cache.json")
REPORT_PATH = "retry_report.json"
SLEEP_SEC = 2.5

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def normalize_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[（(][^）)]*[）)]", "", s)
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


def clean_title(title: str) -> str:
    cleaned = re.sub(r"[（(][^）)]*[）)]", "", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def search_once(term: str, country, diagnostics: list, key: str):
    params = {"term": term, "media": "music", "entity": "song", "limit": "5"}
    if country:
        params["country"] = country
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            status = resp.getcode()
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results", [])
            if status != 200:
                diagnostics.append(f"{key}: HTTP {status} for term={term!r}")
            return results
    except urllib.error.HTTPError as e:
        diagnostics.append(f"{key}: HTTPError {e.code} for term={term!r}")
        return []
    except urllib.error.URLError as e:
        diagnostics.append(f"{key}: URLError {e.reason} for term={term!r}")
        return []
    except Exception as e:
        diagnostics.append(f"{key}: Exception {e!r} for term={term!r}")
        return []


def search_with_fallbacks(title: str, artist: str, diagnostics: list, key: str):
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
        results = search_once(search_term, country, diagnostics, key)
        for r in results:
            if artist_really_matches(artist, r.get("artistName", "")):
                return r
        time.sleep(SLEEP_SEC)

    return None


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    null_keys = [k for k, v in cache.items() if v.get("previewUrl") is None]
    total = len(null_keys)
    print(f"null인 {total}곡을 더 넉넉한 간격으로 재시도합니다...")

    diagnostics = []
    recovered = []

    for i, key in enumerate(null_keys, start=1):
        artist, _, title = key.partition("::")
        result = search_with_fallbacks(title, artist, diagnostics, key)

        if result:
            artwork = result.get("artworkUrl100")
            artwork = artwork.replace("100x100", "400x400") if artwork else None
            cache[key] = {"artworkUrl": artwork, "previewUrl": result.get("previewUrl")}
            recovered.append({"key": key, "matched_artist": result.get("artistName")})

        if i % 10 == 0 or i == total:
            print(f"  [{i}/{total}] 복구됨: {len(recovered)}  에러로그: {len(diagnostics)}건")

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    report = {
        "total_retried": total,
        "recovered_count": len(recovered),
        "recovered": recovered,
        "diagnostics_count": len(diagnostics),
        "diagnostics_sample": diagnostics[:50],
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n=== 완료 ===")
    print(f"이번에 복구된 곡: {len(recovered)}")
    print(f"에러/비정상 응답 로그: {len(diagnostics)}건 (있었다면 레이트리밋 가능성 높음)")
    print(f"자세한 내용은 {REPORT_PATH} 에서 확인할 수 있어.")


if __name__ == "__main__":
    main()