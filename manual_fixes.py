"""
마지막 수동 보정: 1순위 매치 로직으로도 여전히 틀리게 나온 2곡을
직접 null로 되돌리는 마무리 스크립트.

- 거북이::빙고 -> iTunes 1순위가 "비행기"로 나옴 (다른 곡)
- 김하온(Prod.지코,크러쉬)::ON to the next -> 1순위가 "TICK TOCK"으로 나옴 (다른 곡)

두 곡 다 아티스트 화이트리스트(거북이->Turtles, 김하온->HAON)는 통과하지만,
해당 아티스트 표기가 피처링/프로듀서 크레딧에도 걸쳐있어서 완전히 다른
곡이 1순위로 뽑히는 케이스. 더 정교한 자동 검증보다는, 틀린 곡을 재생하는
것보단 미리듣기가 없는 게 낫다는 원칙에 따라 그냥 null로 되돌림.

사용법:
    cd voicefit
    python3 manual_fixes.py
"""
import json

CACHE_PATH = "public/artwork-cache.json"

BAD_KEYS = [
    "거북이::빙고",
    "김하온(Prod.지코,크러쉬)::ON to the next",
]


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    changed = []
    for key in BAD_KEYS:
        if key in cache and cache[key].get("previewUrl"):
            cache[key] = {"artworkUrl": None, "previewUrl": None}
            changed.append(key)

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    print("=== 완료 ===")
    print(f"null로 되돌린 곡: {len(changed)}")
    for k in changed:
        print(f"  - {k}")


if __name__ == "__main__":
    main()