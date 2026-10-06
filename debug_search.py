"""
"강남스타일" 같은 확실히 있는 곡도 계속 못 찾길래, 아이튠즈 검색 API가
실제로 뭘 돌려주는지 원본 그대로 찍어보는 진단용 스크립트.

사용법:
    cd voicefit
    python3 debug_search.py
"""

import json
import urllib.parse
import urllib.request

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def search(term, country=None, limit=5):
    params = {"term": term, "media": "music", "entity": "song", "limit": str(limit)}
    if country:
        params["country"] = country
    url = "https://itunes.apple.com/search?" + urllib.parse.urlencode(params)
    print(f"\n--- 요청 URL ---\n{url}")
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as resp:
        status = resp.getcode()
        body = resp.read().decode("utf-8")
        print(f"HTTP 상태: {status}")
        data = json.loads(body)
        print(f"resultCount: {data.get('resultCount')}")
        for i, r in enumerate(data.get("results", []), start=1):
            print(f"  [{i}] artistName={r.get('artistName')!r}  trackName={r.get('trackName')!r}")
        if data.get("resultCount", 0) == 0:
            print("  (결과 없음 - 원본 응답 앞부분)")
            print("  " + body[:500])


if __name__ == "__main__":
    print("===== 테스트 1: 싸이 강남스타일 / country=KR =====")
    search("싸이 강남스타일", country="KR")

    print("\n===== 테스트 2: 싸이 강남스타일 / country 없음 =====")
    search("싸이 강남스타일")

    print("\n===== 테스트 3: 강남스타일 (제목만) / country=KR =====")
    search("강남스타일", country="KR")

    print("\n===== 테스트 4: PSY Gangnam Style (영문) =====")
    search("PSY Gangnam Style")