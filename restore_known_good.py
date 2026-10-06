"""
rebuild_cache_strict.py가 "제목만 보고 구제됐던" 164곡을 전부 다시 null로
되돌렸는데, 실제로 하나하나 확인해보니 그 중 상당수(예: 빅뱅→BIGBANG,
트와이스→TWICE, 블랙핑크→BLACKPINK, 카라→KARA, 다비치→DAVICHI 등)는
완전히 올바른 매치였어. 한글 아티스트명과 아이튠즈의 로마자 표기는
글자 자체가 겹치지 않아서(스크립트가 다름), 텍스트 비교만으로는
"진짜 로마자 표기"와 "완전 다른 가수의 커버"를 구분할 수 없었던 거야.

그래서 이번엔 실제 아티스트 지식을 바탕으로 수동 검증한 화이트리스트
(ARTIST_ALIASES)를 사용해서, 164곡 중 정말로 맞는 것만 복구해.
"아이유::밤편지"(Lee Jae Joon), "윤하::사건의 지평선"(NEWAGES),
"뱅크::가질 수 없는 너"(GUMMY) 같은 진짜 커버/오매칭은 화이트리스트에
없으니 그대로 null 유지돼.

사용법:
    cd voicefit
    python3 restore_known_good.py
"""

import json
import os
import time
import urllib.parse
import urllib.request

CACHE_PATH = os.path.join("public", "artwork-cache.json")
REVERIFY_REPORT_PATH = "reverify_report.json"
REPORT_PATH = "restore_report.json"
SLEEP_SEC = 1.0

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def fetch_artwork_for(previewurl: str, matched_artist: str, matched_title: str):
    """reverify_report.json엔 artworkUrl이 저장 안 돼 있어서, 이미 확인된
    previewUrl/트랙을 다시 찾아 artworkUrl100만 가져온다 (아티스트/제목은
    이미 화이트리스트로 검증됐으니 재검증 없이 트랙 재조회만 함)."""
    term = f"{matched_artist} {matched_title}".strip()
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

# (쿼리 아티스트에 포함된 한글/원어 부분, [허용할 아이튠즈 artistName에 포함되어야 하는 문자열들])
# 둘 다 만족해야(= 쿼리 문자열에 이 한글이 있고, 매치된 아티스트명에 이 영문이 있어야) 복구함.
ARTIST_ALIASES = [
    ("소녀시대", ["Girls' Generation"]),
    ("(여자)아이들", ["i-dle", "(G)I-DLE"]),
    ("검정치마", ["The Black Skirts"]),
    ("빈첸", ["Vinxen"]),
    ("양홍원", ["Young B"]),
    ("한로로", ["HANRORO"]),
    ("빅뱅", ["BIGBANG", "G-DRAGON", "TAEYANG"]),  # 그룹곡이 멤버 솔로 표기로 걸리는 경우도 포함
    ("윤종신", ["Yoon Jong Shin"]),
    ("버즈", ["Buzz"]),
    ("Official髭男dism", ["OFFICIAL HIGE DANDISM"]),
    ("쿨", ["COOL"]),
    ("임창정", ["Im Chang-jung"]),
    ("에이치코드", ["H:CODE"]),
    ("더 크로스", ["The Cross"]),
    ("김필", ["Kim Feel"]),
    ("거북이", ["Turtles"]),
    ("서인국", ["Seo In Guk"]),
    ("정은지", ["Jeong Eun Ji"]),
    ("조장혁", ["Cho Jang Hyuck"]),
    ("빅마마", ["Big Mama"]),
    ("이루", ["Eru"]),
    ("박화요비", ["Park Hwayobi"]),
    ("토이", ["Toy"]),
    ("포지션", ["Position"]),
    ("노라조", ["NORAZO"]),
    ("소찬휘", ["So Chanwhee"]),
    ("데이식스", ["DAY6"]),
    ("박효신", ["Park Hyo Shin"]),
    ("이승철", ["Lee Seung Chul"]),
    ("성시경", ["Sung Si Kyung"]),
    ("디셈버", ["December"]),
    ("허각", ["Huh Gak"]),
    ("변진섭", ["Byun Jin Sub"]),
    ("Maneskin", ["Måneskin"]),
    ("Celine Dion", ["Céline Dion"]),
    ("Beyonce", ["Beyoncé"]),
    ("Glen Hansard", ["Glen Hansard"]),
    ("Marketa Irglova", ["Markéta Irglová", "Irglová"]),
    ("임재범", ["Lim Jae Beum"]),
    ("이기찬", ["Lee Ki Chan"]),
    ("김현식", ["Kim Hyun Shik"]),
    ("조유진", ["youjeen"]),
    ("박기영", ["Park Ki Young"]),
    ("김범수", ["KIM BUMSOO"]),
    ("박명수", ["Park Myung Soo"]),
    ("신예영", ["Shin Ye-Young"]),
    ("나윤권", ["Na Yoon Kwon"]),
    ("이문세", ["Lee Moon Sae"]),
    ("이소라", ["Lee Sora"]),
    ("녹색지대", ["Green Zone"]),
    ("먼데이키즈", ["Monday Kiz"]),
    ("김장훈", ["Kim Jang Hoon"]),
    ("안재욱", ["Ahn Jea Wook"]),
    ("임현정", ["Lim Hyunjung"]),
    ("다비치", ["DAVICHI"]),
    ("블락비", ["Block B"]),
    ("김현정", ["Kim Hyun Jung"]),
    ("싸이", ["PSY"]),
    ("이정현", ["Lee Jung-hyun"]),
    ("카라", ["KARA"]),
    ("트와이스", ["TWICE"]),
    ("미스에이", ["miss A"]),
    ("보아", ["BoA"]),
    ("씨야", ["SeeYa"]),
    ("티아라", ["T-ara"]),
    ("투투", ["Two Two"]),
    ("米津玄師", ["Kenshi Yonezu"]),
    ("애쉬그레이", ["ASHGRAY"]),
    ("러브홀릭스", ["Loveholics"]),
    ("宇多田ヒカル", ["Hikaru Utada"]),
    ("이수", ["ISU"]),
    ("안예은", ["Ahn Ye Eun"]),
    ("백지영", ["Baek Z Young"]),
    ("로꼬", ["Loco"]),
    ("펀치", ["Punch"]),
    ("태연", ["TAEYEON"]),
    ("폴킴", ["Paul Kim"]),
    ("유해준", ["Yoo Hae Joon"]),
    ("소유", ["SoYou"]),
    ("멜로망스", ["MeloMance"]),
    ("강하늘", ["Kang Ha Neul"]),
    ("정우", ["Jung Woo"]),
    ("조복래", ["Jo Bok Rae"]),
    ("신영숙", ["Shin Young Sook"]),
    ("한요한", ["Han Yo Han"]),
    ("리쌍", ["Leessang"]),
    ("긱스", ["Geeks"]),
    ("김하온", ["HAON"]),
    ("아웃사이더", ["Outsider"]),
    ("에픽하이", ["Epik High"]),
    ("pH-1", ["pH-1"]),
    ("키네틱플로우", ["K-Flow"]),
    ("MC몽", ["MC MONG"]),
    ("프리스타일", ["Free Style"]),
    ("재지팩트", ["Jazzyfact"]),
    ("빅나티", ["BIG Naughty"]),
    ("브라운아이즈", ["Brown Eyes"]),
    ("헤이즈", ["Heize"]),
    ("휘성", ["Realslow"]),  # 데뷔 초 활동명
    ("린", ["Lyn"]),
    ("나얼", ["NAUL"]),
    ("거미", ["GUMMY"]),
    ("박봄", ["Park Bom"]),
    ("에일리", ["Ailee"]),
    ("신용재", ["4MEN"]),  # 4MEN 멤버
    ("SG워너비", ["SG Wannabe"]),
    ("딘", ["DEAN"]),
    ("환희", ["Hwanhee"]),
    ("알리", ["ALI"]),
    ("더 레이", ["THE RAY"]),
    ("블랙핑크", ["BLACKPINK"]),
    ("에이티즈", ["ATEEZ"]),
    ("이영지", ["Lee Young Ji"]),
]

# 애매하거나(그룹/솔로 혼동) 확인이 안 된 건 일부러 제외:
#  - 소녀시대::Cover Up (TAEYEON으로 매치됨 — 그룹곡인지 불확실, 제외)
#  - 리쌍::광대 (Playground4Music — 리믹스 커버 채널, 제외)
#  - 그 외 나윤권::나였으면(Kim Hyung Suk), 뱅크(GUMMY), 아이유::밤편지(Lee Jae Joon),
#    윤하::사건의 지평선(NEWAGES) 등은 ARTIST_ALIASES에 해당 아티스트가 없어서
#    자동으로 계속 null 유지됨 (화이트리스트 방식이라 안전함)


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    with open(REVERIFY_REPORT_PATH, "r", encoding="utf-8") as f:
        reverify_report = json.load(f)

    rescued = reverify_report.get("rescued", [])

    restored = []
    still_null = []

    for item in rescued:
        key = item["key"]
        artist, _, _title = key.partition("::")
        candidate_artist = item.get("matched_artist", "") or ""

        # 이미 복구되어 있는 건 건드리지 않음
        if cache.get(key, {}).get("previewUrl") is not None:
            continue

        matched_rule = None
        for korean_stem, english_aliases in ARTIST_ALIASES:
            if korean_stem in artist:
                if any(alias.lower() in candidate_artist.lower() for alias in english_aliases):
                    matched_rule = (korean_stem, candidate_artist)
                    break

        if matched_rule:
            preview_url = item.get("previewUrl")
            artwork_url = fetch_artwork_for(
                preview_url, candidate_artist, item.get("matched_title", "")
            )
            time.sleep(SLEEP_SEC)
            cache[key] = {
                "artworkUrl": artwork_url,
                "previewUrl": preview_url,
            }
            restored.append({"key": key, "via_alias": matched_rule[0], "matched_artist": candidate_artist})
        else:
            still_null.append({"key": key, "matched_artist": candidate_artist})

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    report = {
        "restored_count": len(restored),
        "still_null_count": len(still_null),
        "restored": restored,
        "still_null": still_null,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("=== 완료 ===")
    print(f"화이트리스트로 검증되어 복구된 곡: {len(restored)}")
    print(f"여전히 null(화이트리스트에 없음 = 못 믿을 매치): {len(still_null)}")
    print(f"\n자세한 목록은 {REPORT_PATH} 에서 확인할 수 있어.")


if __name__ == "__main__":
    main()