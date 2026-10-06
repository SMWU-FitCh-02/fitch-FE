import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

type CacheEntry = { artworkUrl: string | null; previewUrl: string | null }

let staticCache: Record<string, CacheEntry> | null = null

// artwork-cache.json is produced ahead of time by scripts/fetch_artwork_cache.py
// (run once, slowly, outside of normal page traffic) so the live app almost
// never needs to call iTunes directly, and isn't at the mercy of its
// undocumented rate limit during a demo.
function loadStaticCache(): Record<string, CacheEntry> {
  if (staticCache) return staticCache
  try {
    const filePath = path.join(process.cwd(), "public", "artwork-cache.json")
    const raw = fs.readFileSync(filePath, "utf-8")
    staticCache = JSON.parse(raw)
  } catch {
    staticCache = {}
  }
  return staticCache!
}

// 흔한 제목(동명곡/커버/리메이크가 많은 곡)의 경우 iTunes가 완전히 다른
// 아티스트의 곡을 1순위로 돌려주는 경우가 있어서(한국 음원 특성상 유명곡과
// 제목이 완전히 같은 커버 버전이 매우 흔함), "제목만 비슷하면 통과"는
// 쓰지 않는다 — 실제로 아티스트가 일치한다는 명확한 증거가 있을 때만 채택.
//
// 다만 TJ차트 데이터에는 "아이유 (IU)", "백예린 (Yerin Baek)",
// "도경수 (D.O.)"처럼 괄호 안에 영문 별칭이 이미 포함된 경우가 많아서,
// 괄호 내용도 비교 후보로 함께 사용한다.
function normalizeText(s: string): string {
  return s
      .toLowerCase()
      .replace(/[（(][^）)]*[）)]/g, "") // 비교용 본체(괄호 제거)
      .replace(/[^\p{L}\p{N}]/gu, "")
}

function extractParenAlias(s: string): string | null {
  const m = s.match(/[（(]([^）)]*)[）)]/)
  if (!m) return null
  const alias = m[1].trim()
  return alias || null
}

function isTextMatch(a: string, b: string): boolean {
  const x = normalizeText(a)
  const y = normalizeText(b)
  if (!x || !y) return false
  return x.includes(y) || y.includes(x)
}

// 수동으로 확인한 유명 아티스트의 한글 활동명 -> 공식 영문 표기 화이트리스트.
// 아이튠즈 검색 결과가 영문으로만 나오는 경우(흔함)를 대비한 것.
const ARTIST_ALIASES: Array<[string, string[]]> = [
  ["아이유", ["IU"]],
  ["악뮤", ["AKMU"]],
  ["엑소", ["EXO"]],
  ["샤이니", ["SHINee"]],
  ["잔나비", ["JANNABI"]],
  ["10cm", ["10CM"]],
  ["임영웅", ["Lim Young Woong"]],
  ["이무진", ["Lee Mujin"]],
  ["소녀시대", ["Girls' Generation"]],
  ["(여자)아이들", ["i-dle", "(G)I-DLE"]],
  ["검정치마", ["The Black Skirts"]],
  ["빈첸", ["Vinxen"]],
  ["양홍원", ["Young B"]],
  ["한로로", ["HANRORO"]],
  ["빅뱅", ["BIGBANG", "G-DRAGON", "TAEYANG"]],
  ["BIGBANG", ["BIGBANG", "G-DRAGON", "TAEYANG"]],
  ["윤종신", ["Yoon Jong Shin"]],
  ["버즈", ["Buzz"]],
  ["Official髭男dism", ["OFFICIAL HIGE DANDISM"]],
  ["쿨", ["COOL"]],
  ["임창정", ["Im Chang-jung"]],
  ["에이치코드", ["H:CODE"]],
  ["더 크로스", ["The Cross"]],
  ["김필", ["Kim Feel"]],
  ["서인국", ["Seo In Guk"]],
  ["정은지", ["Jeong Eun Ji"]],
  ["조장혁", ["Cho Jang Hyuck"]],
  ["빅마마", ["Big Mama"]],
  ["이루", ["Eru"]],
  ["박화요비", ["Park Hwayobi"]],
  ["윤하", ["Younha"]],
  ["토이", ["Toy"]],
  ["포지션", ["Position"]],
  ["노라조", ["NORAZO"]],
  ["소찬휘", ["So Chanwhee"]],
  ["데이식스", ["DAY6"]],
  ["박효신", ["Park Hyo Shin"]],
  ["이승철", ["Lee Seung Chul"]],
  ["성시경", ["Sung Si Kyung"]],
  ["디셈버", ["December"]],
  ["허각", ["Huh Gak"]],
  ["변진섭", ["Byun Jin Sub"]],
  ["임재범", ["Lim Jae Beum"]],
  ["이기찬", ["Lee Ki Chan"]],
  ["김현식", ["Kim Hyun Shik"]],
  ["조유진", ["youjeen"]],
  ["박기영", ["Park Ki Young"]],
  ["김범수", ["KIM BUMSOO"]],
  ["박명수", ["Park Myung Soo"]],
  ["신예영", ["Shin Ye-Young"]],
  ["나윤권", ["Na Yoon Kwon"]],
  ["이문세", ["Lee Moon Sae"]],
  ["이소라", ["Lee Sora"]],
  ["녹색지대", ["Green Zone"]],
  ["먼데이키즈", ["Monday Kiz"]],
  ["김장훈", ["Kim Jang Hoon"]],
  ["안재욱", ["Ahn Jea Wook"]],
  ["임현정", ["Lim Hyunjung"]],
  ["다비치", ["DAVICHI"]],
  ["블락비", ["Block B"]],
  ["김현정", ["Kim Hyun Jung"]],
  ["싸이", ["PSY"]],
  ["이정현", ["Lee Jung-hyun"]],
  ["카라", ["KARA"]],
  ["트와이스", ["TWICE"]],
  ["미스에이", ["miss A"]],
  ["보아", ["BoA"]],
  ["씨야", ["SeeYa"]],
  ["티아라", ["T-ara"]],
  ["투투", ["Two Two"]],
  ["米津玄師", ["Kenshi Yonezu"]],
  ["애쉬그레이", ["ASHGRAY"]],
  ["러브홀릭스", ["Loveholics"]],
  ["宇多田ヒカル", ["Hikaru Utada"]],
  ["이수", ["ISU"]],
  ["안예은", ["Ahn Ye Eun"]],
  ["백지영", ["Baek Z Young"]],
  ["로꼬", ["Loco"]],
  ["펀치", ["Punch"]],
  ["태연", ["TAEYEON"]],
  ["폴킴", ["Paul Kim"]],
  ["유해준", ["Yoo Hae Joon"]],
  ["소유", ["SoYou"]],
  ["멜로망스", ["MeloMance"]],
  ["강하늘", ["Kang Ha Neul"]],
  ["정우", ["Jung Woo"]],
  ["조복래", ["Jo Bok Rae"]],
  ["신영숙", ["Shin Young Sook"]],
  ["한요한", ["Han Yo Han"]],
  ["리쌍", ["Leessang"]],
  ["긱스", ["Geeks"]],
  ["아웃사이더", ["Outsider"]],
  ["에픽하이", ["Epik High"]],
  ["pH-1", ["pH-1"]],
  ["키네틱플로우", ["K-Flow"]],
  ["MC몽", ["MC MONG"]],
  ["프리스타일", ["Free Style"]],
  ["재지팩트", ["Jazzyfact"]],
  ["빅나티", ["BIG Naughty"]],
  ["브라운아이즈", ["Brown Eyes"]],
  ["헤이즈", ["Heize"]],
  ["휘성", ["Realslow"]],
  ["린", ["Lyn"]],
  ["나얼", ["NAUL"]],
  ["거미", ["GUMMY"]],
  ["박봄", ["Park Bom"]],
  ["에일리", ["Ailee"]],
  ["신용재", ["4MEN"]],
  ["SG워너비", ["SG Wannabe"]],
  ["딘", ["DEAN"]],
  ["환희", ["Hwanhee"]],
  ["알리", ["ALI"]],
  ["더 레이", ["THE RAY"]],
  ["블랙핑크", ["BLACKPINK"]],
  ["에이티즈", ["ATEEZ"]],
  ["이영지", ["Lee Young Ji"]],
  ["방탄소년단", ["BTS"]],
  ["동방신기", ["TVXQ"]],
  ["코요태", ["KOYOTE"]],
  ["아이오아이", ["I.O.I"]],
  ["솔리드", ["SOLID"]],
  ["울랄라세션", ["ULALA SESSION"]],
  ["다이나믹듀오", ["Dynamic Duo"]],
  ["레드벨벳", ["Red Velvet"]],
  ["오마이걸", ["OH MY GIRL"]],
  ["여자친구", ["GFRIEND"]],
  ["마마무", ["MAMAMOO"]],
  ["워너원", ["Wanna One"]],
  ["세븐틴", ["SEVENTEEN"]],
  ["몬스타엑스", ["MONSTA X"]],
  ["스트레이키즈", ["Stray Kids"]],
  ["에스파", ["aespa"]],
  ["뉴진스", ["NewJeans"]],
  ["아이브", ["IVE"]],
  ["르세라핌", ["LE SSERAFIM"]],
  ["시아준수", ["Xia", "Junsu"]],
  ["god", ["god"]],
  ["김건모", ["Kim Gun Mo"]],
  ["이선희", ["Lee Sun Hee"]],
  ["이적", ["Lee Juck"]],
  ["장범준", ["Jang Beom June"]],
  ["손디아", ["Sondia"]],
  ["홍이삭", ["Hong Isaac"]],
  ["문문", ["Moon Moon"]],
  ["이하이", ["LEE HI"]],
  ["정국", ["Jung Kook", "JUNGKOOK"]],
  ["비스트", ["BEAST", "HIGHLIGHT"]],
  ["홍광호", ["Hong Kwang Ho"]],
  ["임한별", ["Lim Hanbyeol"]],
  ["김태우", ["Kim Tae Woo"]],

  // 거북이(Turtles), 김하온(HAON)은 의도적으로 제외 — 피처링/프로듀서
  // 크레딧에 같은 이름이 걸려서 완전히 다른 곡이 1순위로 뽑히는 사례가
  // 확인됨 (거북이::빙고 -> 비행기, 김하온::ON to the next -> TICK TOCK).
  // 화이트리스트에 넣으면 오히려 오매칭을 유발하므로 이 두 아티스트는
  // 텍스트 직접매치/괄호별칭 매치만 허용하고 화이트리스트 매치는 적용하지 않음.
]

function artistReallyMatches(queriedArtist: string, candidateArtist: string): boolean {
  if (isTextMatch(queriedArtist, candidateArtist)) return true
  const alias = extractParenAlias(queriedArtist)
  if (alias && isTextMatch(alias, candidateArtist)) return true
  for (const [koreanStem, englishAliases] of ARTIST_ALIASES) {
    if (queriedArtist.includes(koreanStem)) {
      if (englishAliases.some((a) => candidateArtist.toLowerCase().includes(a.toLowerCase()))) {
        return true
      }
    }
  }
  return false
}

async function searchOnce(term: string, country?: string) {
  const url = new URL("https://itunes.apple.com/search")
  url.searchParams.set("term", term)
  url.searchParams.set("media", "music")
  url.searchParams.set("entity", "song")
  url.searchParams.set("limit", "5") // 검증을 위해 상위 몇 개를 더 받아봄
  if (country) url.searchParams.set("country", country)

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.results ?? []
}

// "응급실(쾌걸춘향OST)", "천상연(웹툰 '선녀외전' X 이창섭(LEE CHANGSUB))" 처럼
// 괄호 안에 OST/드라마명/콜라보 표기가 붙어있으면 iTunes 검색이 실패하기 쉬워서,
// 괄호(전각/반각 둘 다) 부분을 제거한 제목으로 한 번 더 시도한다.
function cleanTitle(title: string): string {
  return title
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/\s+/g, " ")
      .trim()
}

// 1순위(가장 관련도 높은) 결과만 신뢰한다 — 검색어 자체에 이미 아티스트+제목이
// 다 들어있으므로, 1순위에서 아티스트가 맞으면 그 곡도 맞을 확률이 높다.
// 순위를 내려가며 아티스트만 억지로 맞추면, 같은 아티스트의 "다른 곡"을
// 주워올 위험이 있어(예: 검색은 "거북이 빙고"인데 2~3순위에 있던 거북이의
// 다른 곡이 걸리는 식) 하지 않는다. 1순위가 아티스트 불일치면 바로 포기.
function pickVerifiedMatch(results: any[], artist: string) {
  const top = results[0]
  if (!top) return null
  if (artistReallyMatches(artist, top.artistName ?? "")) return top
  return null
}

async function searchWithFallbacks(title: string, artist: string) {
  // country=KR 파라미터가 한글 검색어에서 종종 결과 0건을 돌려주는
  // 버그성 동작이 확인되어, country 없는 시도를 먼저 한다.
  const attempts: Array<[string, string | undefined]> = []
  const term = `${artist} ${title}`.trim()
  attempts.push([term, undefined])
  attempts.push([term, "KR"])

  const cleaned = cleanTitle(title)
  if (cleaned && cleaned !== title) {
    const cleanTerm = `${artist} ${cleaned}`.trim()
    attempts.push([cleanTerm, undefined])
    attempts.push([cleanTerm, "KR"])
  }

  const titleOnly = cleaned || title
  attempts.push([titleOnly, undefined])
  attempts.push([titleOnly, "KR"])

  for (const [searchTerm, country] of attempts) {
    const results = await searchOnce(searchTerm, country)
    const verified = pickVerifiedMatch(results, artist)
    if (verified) return verified
  }

  return null
}

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title") || ""
  const artist = req.nextUrl.searchParams.get("artist") || ""
  if (!title) {
    return NextResponse.json({ artworkUrl: null, previewUrl: null })
  }

  // 1) check the pre-fetched static cache first — this is the normal path
  const key = `${artist}::${title}`
  const cache = loadStaticCache()
  if (cache[key]) {
    return NextResponse.json(cache[key])
  }

  // 2) fall back to a live lookup for songs not yet in the cache
  //    (e.g. newly added songs the batch script hasn't covered yet)
  try {
    const result = await searchWithFallbacks(title, artist)

    const artworkUrl = result?.artworkUrl100
        ? result.artworkUrl100.replace("100x100", "400x400")
        : null
    const previewUrl = result?.previewUrl ?? null

    return NextResponse.json({ artworkUrl, previewUrl })
  } catch {
    return NextResponse.json({ artworkUrl: null, previewUrl: null })
  }
}