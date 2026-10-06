"""
final_retry.py가 "아티스트만 맞으면 통과"로 느슨하게 검증하다 보니,
검색 결과 2~5순위 중 같은 가수의 "다른 곡"이 걸려서 틀린 곡이 재생되는
사고가 다시 발생함 (거북이::빙고 -> 비행기, 릴보이...::내일이 오면 ->
Joker, 김하온...::ON to the next -> TICK TOCK 등).

이번엔 final_retry.py가 복구했던 항목들만 다시 검색해서, **1순위 결과만
신뢰**하는 방식으로 재검증함 — 검색어 자체에 아티스트+제목이 다 들어있으니
1순위에서 아티스트가 맞으면 제목도 맞을 확률이 높고, 순위를 내려가며
억지로 아티스트만 맞는 걸 찾는 게 위험했던 것. 1순위가 아티스트 불일치면
그 시도는 실패로 보고 다음 검색어 조합으로 넘어감(이전처럼).

사용법:
    cd voicefit
    python3 fix_wrong_song_matches.py
"""

import json
import os
import re
import time
import unicodedata
import urllib.parse
import urllib.request

CACHE_PATH = os.path.join("public", "artwork-cache.json")
FINAL_RETRY_REPORT_PATH = "final_retry_report.json"
REPORT_PATH = "fix_wrong_song_report.json"
SLEEP_SEC = 1.5

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

# final_retry.py와 동일한 화이트리스트
ARTIST_ALIASES = [
    ("소녀시대", ["Girls' Generation"]), ("(여자)아이들", ["i-dle", "(G)I-DLE"]),
    ("검정치마", ["The Black Skirts"]), ("빈첸", ["Vinxen"]), ("양홍원", ["Young B"]),
    ("한로로", ["HANRORO"]), ("빅뱅", ["BIGBANG", "G-DRAGON", "TAEYANG"]),
    ("BIGBANG", ["BIGBANG", "G-DRAGON", "TAEYANG"]), ("윤종신", ["Yoon Jong Shin"]),
    ("버즈", ["Buzz"]), ("Official髭男dism", ["OFFICIAL HIGE DANDISM"]), ("쿨", ["COOL"]),
    ("임창정", ["Im Chang-jung"]), ("에이치코드", ["H:CODE"]), ("더 크로스", ["The Cross"]),
    ("김필", ["Kim Feel"]), ("거북이", ["Turtles"]), ("서인국", ["Seo In Guk"]),
    ("정은지", ["Jeong Eun Ji"]), ("조장혁", ["Cho Jang Hyuck"]), ("빅마마", ["Big Mama"]),
    ("이루", ["Eru"]), ("박화요비", ["Park Hwayobi"]), ("윤하", ["Younha"]), ("토이", ["Toy"]),
    ("포지션", ["Position"]), ("노라조", ["NORAZO"]), ("소찬휘", ["So Chanwhee"]),
    ("데이식스", ["DAY6"]), ("박효신", ["Park Hyo Shin"]), ("이승철", ["Lee Seung Chul"]),
    ("성시경", ["Sung Si Kyung"]), ("디셈버", ["December"]), ("허각", ["Huh Gak"]),
    ("변진섭", ["Byun Jin Sub"]), ("임재범", ["Lim Jae Beum"]), ("이기찬", ["Lee Ki Chan"]),
    ("김현식", ["Kim Hyun Shik"]), ("조유진", ["youjeen"]), ("박기영", ["Park Ki Young"]),
    ("김범수", ["KIM BUMSOO"]), ("박명수", ["Park Myung Soo"]), ("신예영", ["Shin Ye-Young"]),
    ("나윤권", ["Na Yoon Kwon"]), ("이문세", ["Lee Moon Sae"]), ("이소라", ["Lee Sora"]),
    ("녹색지대", ["Green Zone"]), ("먼데이키즈", ["Monday Kiz"]), ("김장훈", ["Kim Jang Hoon"]),
    ("안재욱", ["Ahn Jea Wook"]), ("임현정", ["Lim Hyunjung"]), ("다비치", ["DAVICHI"]),
    ("블락비", ["Block B"]), ("김현정", ["Kim Hyun Jung"]), ("싸이", ["PSY"]),
    ("이정현", ["Lee Jung-hyun"]), ("카라", ["KARA"]), ("트와이스", ["TWICE"]),
    ("미스에이", ["miss A"]), ("보아", ["BoA"]), ("씨야", ["SeeYa"]), ("티아라", ["T-ara"]),
    ("투투", ["Two Two"]), ("米津玄師", ["Kenshi Yonezu"]), ("애쉬그레이", ["ASHGRAY"]),
    ("러브홀릭스", ["Loveholics"]), ("宇多田ヒカル", ["Hikaru Utada"]), ("이수", ["ISU"]),
    ("안예은", ["Ahn Ye Eun"]), ("백지영", ["Baek Z Young"]), ("로꼬", ["Loco"]),
    ("펀치", ["Punch"]), ("태연", ["TAEYEON"]), ("폴킴", ["Paul Kim"]),
    ("유해준", ["Yoo Hae Joon"]), ("소유", ["SoYou"]), ("멜로망스", ["MeloMance"]),
    ("강하늘", ["Kang Ha Neul"]), ("정우", ["Jung Woo"]), ("조복래", ["Jo Bok Rae"]),
    ("신영숙", ["Shin Young Sook"]), ("한요한", ["Han Yo Han"]), ("리쌍", ["Leessang"]),
    ("긱스", ["Geeks"]), ("김하온", ["HAON"]), ("아웃사이더", ["Outsider"]),
    ("에픽하이", ["Epik High"]), ("pH-1", ["pH-1"]), ("키네틱플로우", ["K-Flow"]),
    ("MC몽", ["MC MONG"]), ("프리스타일", ["Free Style"]), ("재지팩트", ["Jazzyfact"]),
    ("빅나티", ["BIG Naughty"]), ("브라운아이즈", ["Brown Eyes"]), ("헤이즈", ["Heize"]),
    ("휘성", ["Realslow"]), ("린", ["Lyn"]), ("나얼", ["NAUL"]), ("거미", ["GUMMY"]),
    ("박봄", ["Park Bom"]), ("에일리", ["Ailee"]), ("신용재", ["4MEN"]),
    ("SG워너비", ["SG Wannabe"]), ("딘", ["DEAN"]), ("환희", ["Hwanhee"]), ("알리", ["ALI"]),
    ("더 레이", ["THE RAY"]), ("블랙핑크", ["BLACKPINK"]), ("에이티즈", ["ATEEZ"]),
    ("이영지", ["Lee Young Ji"]), ("방탄소년단", ["BTS"]), ("동방신기", ["TVXQ"]),
    ("코요태", ["KOYOTE"]), ("아이오아이", ["I.O.I"]), ("솔리드", ["SOLID"]),
    ("울랄라세션", ["ULALA SESSION"]), ("다이나믹듀오", ["Dynamic Duo"]),
    ("레드벨벳", ["Red Velvet"]), ("오마이걸", ["OH MY GIRL"]), ("여자친구", ["GFRIEND"]),
    ("마마무", ["MAMAMOO"]), ("워너원", ["Wanna One"]), ("세븐틴", ["SEVENTEEN"]),
    ("몬스타엑스", ["MONSTA X"]), ("스트레이키즈", ["Stray Kids"]), ("에스파", ["aespa"]),
    ("뉴진스", ["NewJeans"]), ("아이브", ["IVE"]), ("르세라핌", ["LE SSERAFIM"]),
    ("시아준수", ["Xia", "Junsu"]), ("김건모", ["Kim Gun Mo"]), ("이선희", ["Lee Sun Hee"]),
    ("이적", ["Lee Juck"]), ("장범준", ["Jang Beom June"]), ("손디아", ["Sondia"]),
    ("홍이삭", ["Hong Isaac"]), ("문문", ["Moon Moon"]), ("이하이", ["LEE HI"]),
    ("정국", ["Jung Kook", "JUNGKOOK"]), ("비스트", ["BEAST", "HIGHLIGHT"]),
    ("홍광호", ["Hong Kwang Ho"]), ("임한별", ["Lim Hanbyeol"]), ("김태우", ["Kim Tae Woo"]),
]


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
    for korean_stem, english_aliases in ARTIST_ALIASES:
        if korean_stem in queried_artist:
            if any(a.lower() in candidate_artist.lower() for a in english_aliases):
                return True
    return False


def clean_title(title: str) -> str:
    cleaned = re.sub(r"[（(][^）)]*[）)]", "", title)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def search_once(term: str, country):
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


def search_top_rank_only(title: str, artist: str):
    """1순위 결과만 신뢰 — 검색어에 이미 아티스트+제목이 다 들어있으므로,
    1순위에서 아티스트가 맞으면 제목도 맞을 확률이 높다. 순위를 내려가며
    아티스트만 억지로 맞추면 다른 곡을 주워올 위험이 있어 하지 않는다."""
    attempts = []
    term = f"{artist} {title}".strip()
    attempts.append((term, None))
    attempts.append((term, "KR"))

    cleaned = clean_title(title)
    if cleaned and cleaned != title:
        clean_term = f"{artist} {cleaned}".strip()
        attempts.append((clean_term, None))
        attempts.append((clean_term, "KR"))

    title_only = cleaned or title
    attempts.append((title_only, None))
    attempts.append((title_only, "KR"))

    for search_term, country in attempts:
        results = search_once(search_term, country)
        if results:
            top = results[0]
            if artist_really_matches(artist, top.get("artistName", "")):
                return top
        time.sleep(SLEEP_SEC)

    return None


def main():
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        cache = json.load(f)

    with open(FINAL_RETRY_REPORT_PATH, "r", encoding="utf-8") as f:
        final_retry_report = json.load(f)

    recovered_keys = [item["key"] for item in final_retry_report.get("recovered", [])]
    total = len(recovered_keys)
    print(f"final_retry.py가 복구했던 {total}곡을 1순위 기준으로 재검증합니다...")

    confirmed = []
    reverted = []

    for i, key in enumerate(recovered_keys, start=1):
        artist, _, title = key.partition("::")
        result = search_top_rank_only(title, artist)

        if result:
            artwork = result.get("artworkUrl100")
            artwork = artwork.replace("100x100", "400x400") if artwork else None
            cache[key] = {"artworkUrl": artwork, "previewUrl": result.get("previewUrl")}
            confirmed.append({"key": key, "matched_title": result.get("trackName")})
        else:
            cache[key] = {"artworkUrl": None, "previewUrl": None}
            reverted.append({"key": key})

        if i % 10 == 0 or i == total:
            print(f"  [{i}/{total}] 확인됨: {len(confirmed)}  되돌림: {len(reverted)}")

    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

    report = {
        "total_rechecked": total,
        "confirmed_count": len(confirmed),
        "reverted_count": len(reverted),
        "confirmed": confirmed,
        "reverted": reverted,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n=== 완료 ===")
    print(f"1순위 기준으로 재확인되어 유지된 곡: {len(confirmed)}")
    print(f"1순위에서 아티스트가 안 맞아 다시 null로 되돌린 곡: {len(reverted)}")
    print(f"\n자세한 내용은 {REPORT_PATH} 에서 확인할 수 있어.")


if __name__ == "__main__":
    main()