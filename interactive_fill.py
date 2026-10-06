"""
null로 남아있는 곡들을 하나씩 직접 눈으로 확인하면서 채워넣는 반자동 스크립트.

자동 매칭(아티스트 텍스트 비교)이 끝내 실패한 곡들이라, 여기서는 아예
검색 결과 여러 개를 보여주고 "이게 맞다"고 네가 직접 고르는 방식으로
진행함. 틀린 곡이 들어갈 위험이 없음 — 사람이 직접 확인하니까.

사용법:
    cd voicefit
    python3 interactive_fill.py

- 곡마다 최대 8개의 후보가 번호와 함께 뜸 (아티스트 / 제목 / Apple Music
  링크 포함). 링크를 클릭해서 맞는 곡인지 들어볼 수 있음.
- 번호를 입력하면 그 결과로 캐시에 저장됨.
- 후보 중에 맞는 게 없으면 그냥 엔터(스킵) — 다음에 다시 실행하면 또 물어봄.
- 이 곡은 영영 못 찾을 것 같다 싶으면 's' 입력 — 다음부터는 안 물어봄
  (manual_fill_skipped.json에 기록됨).
- 'q' 입력하면 지금까지 한 것까지 저장하고 종료. 나중에 다시 실행하면
  처리 안 한 곡부터 이어서 진행됨.
"""

import json
import os
import time
import urllib.parse
import urllib.request

CACHE_PATH = "public/artwork-cache.json"
SKIPPED_PATH = "manual_fill_skipped.json"
SLEEP_SEC = 1.0

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def search_once(term: str, country=None, limit=5):
    params = {"term": term, "media": "music", "entity": "song", "limit": str(limit)}
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


def gather_candidates(artist: str, title: str):
    """여러 검색어 조합으로 후보를 모아서 trackId 기준 중복 제거."""
    seen_ids = set()
    candidates = []

    def add(results):
        for r in results:
            tid = r.get("trackId")
            if tid is None or tid in seen_ids:
                continue
            seen_ids.add(tid)
            candidates.append(r)

    term = f"{artist} {title}".strip()
    add(search_once(term, None))
    time.sleep(SLEEP_SEC)
    add(search_once(term, "KR"))
    time.sleep(SLEEP_SEC)
    if title not in term:
        pass
    add(search_once(title, None))
    time.sleep(SLEEP_SEC)

    return candidates[:8]


def load_skipped():
    if os.path.exists(SKIPPED_PATH):
        with open(SKIPPED_PATH, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()


def save_skipped(skipped):
    with open(SKIPPED_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted(skipped), f, ensure_ascii=False, indent=2)


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    skipped = load_skipped()
    missing_keys = [k for k, v in cache.items() if not v.get("previewUrl") and k not in skipped]

    total = len(missing_keys)
    print(f"처리할 곡: {total}곡 (전체 null {sum(1 for v in cache.values() if not v.get('previewUrl'))}곡 중 영구 스킵 {len(skipped)}곡 제외)")
    print("번호 입력 = 선택 / 엔터 = 다음에 다시 물어봄 / s = 영구 스킵 / q = 저장하고 종료\n")

    filled = 0
    for i, key in enumerate(missing_keys, start=1):
        artist, _, title = key.partition("::")
        print(f"\n[{i}/{total}] {key}")
        candidates = gather_candidates(artist, title)

        if not candidates:
            print("  (검색 결과 없음 — 자동 스킵)")
            continue

        for idx, r in enumerate(candidates, start=1):
            print(
                f"  {idx}. {r.get('artistName')} - {r.get('trackName')} "
                f"[{r.get('collectionName')}]"
            )
            print(f"     {r.get('trackViewUrl')}")

        choice = input("  선택 (번호/엔터/s/q): ").strip().lower()

        if choice == "q":
            print("\n중단하고 저장할게.")
            break
        elif choice == "s":
            skipped.add(key)
            save_skipped(skipped)
            print("  -> 영구 스킵 처리")
            continue
        elif choice == "":
            continue
        elif choice.isdigit() and 1 <= int(choice) <= len(candidates):
            r = candidates[int(choice) - 1]
            artwork = r.get("artworkUrl100")
            artwork = artwork.replace("100x100", "400x400") if artwork else None
            cache[key] = {"artworkUrl": artwork, "previewUrl": r.get("previewUrl")}
            filled += 1
            print(f"  -> 저장됨: {r.get('artistName')} - {r.get('trackName')}")
            with open(CACHE_PATH, "w", encoding="utf-8") as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)
        else:
            print("  (잘못된 입력 — 다음에 다시 물어봄)")

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    print(f"\n=== 완료 ===\n이번에 채운 곡: {filled}곡")


if __name__ == "__main__":
    main()