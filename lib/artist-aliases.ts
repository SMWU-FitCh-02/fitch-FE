// TJ차트/DB에는 아티스트명이 원어(영문) 그대로 저장된 경우가 많아서
// ("TWICE", "IU", "IVE" ...) 한글로 검색하면 매칭이 안 되는 문제가 있었음.
// 같은 아티스트를 가리키는 표기들을 그룹으로 묶어두고, 검색어/아티스트명이
// 같은 그룹에 속하면 매칭되도록 한다. 새 아티스트가 생기면 그룹만 추가하면 됨.
export const ARTIST_ALIAS_GROUPS: string[][] = [
    ["twice", "트와이스"],
    ["iu", "아이유"],
    ["newjeans", "뉴진스"],
    ["ive", "아이브"],
    ["aespa", "에스파"],
    ["bts", "방탄소년단", "방탄"],
    ["blackpink", "블랙핑크"],
    ["exo", "엑소"],
    ["seventeen", "세븐틴"],
    ["stray kids", "스트레이키즈", "스트레이 키즈", "스키즈"],
    ["itzy", "있지"],
    ["txt", "tomorrow x together", "투모로우바이투게더", "투바투"],
    ["nmixx", "엔믹스"],
    ["le sserafim", "르세라핌"],
    ["(g)i-dle", "gidle", "아이들", "여자아이들", "(여자)아이들"],
    ["red velvet", "레드벨벳"],
    ["got7", "갓세븐"],
    ["monsta x", "몬스타엑스"],
    ["ateez", "에이티즈"],
    ["enhypen", "엔하이픈"],
    ["treasure", "트레저"],
    ["nct", "엔시티"],
    ["nct dream", "엔시티 드림", "엔시티드림"],
    ["shinee", "샤이니"],
    ["girls generation", "snsd", "소녀시대"],
    ["super junior", "슈퍼주니어"],
    ["big bang", "bigbang", "빅뱅"],
    ["2ne1", "투애니원"],
    ["mamamoo", "마마무"],
    ["oh my girl", "오마이걸"],
    ["dreamcatcher", "드림캐쳐"],
    ["fromis_9", "fromis9", "프로미스나인"],
    ["kep1er", "케플러"],
    ["billlie", "빌리"],
    ["viviz", "비비지"],
    ["zico", "지코"],
    ["psy", "싸이"],
    ["rain", "비"],
    ["baekhyun", "백현"],
    ["taeyeon", "태연"],
    ["chungha", "청하"],
    ["hyuna", "현아"],
    ["zion.t", "zion t", "자이언티"],
    ["dean", "딘"],
    ["crush", "크러쉬"],
    ["heize", "헤이즈"],
    ["punch", "펀치"],
    ["hanroro", "한로로"],
    ["akmu", "악뮤", "악동뮤지션"],
    ["jannabi", "잔나비"],
    ["day6", "데이식스"],
    ["10cm", "십센치"],
    ["paul kim", "폴킴"],
    ["younha", "윤하"],
    ["epik high", "에픽하이"],
    ["yerin baek", "백예린"],
    ["the black skirt", "검정치마"],
    ["bol4", "볼빨간사춘기"],
    ["melomance", "멜로망스"],
    ["roy kim", "로이킴"],
    ["lee hi", "이하이"],
    ["n.flying", "엔플라잉"],
    ["lim young woong", "임영웅"],
    ["jung kook", "jungkook", "정국"],
    ["jimin", "지민"],
]

function normalize(s: string): string {
    return s.trim().toLowerCase()
}

// artist 문자열이 속한 별칭 그룹을 찾아, 그 그룹의 모든 표기(자기 자신 포함)를 돌려준다.
// 매칭되는 그룹이 없으면 [artist] 하나만 돌려준다.
export function aliasTerms(artist: string): string[] {
    const a = normalize(artist)
    const group = ARTIST_ALIAS_GROUPS.find((g) => g.some((t) => a === t || a.includes(t) || t.includes(a)))
    return group ? group : [a]
}

// 검색어(query)와 대상 텍스트들(title, artist)을 한글/영문 별칭까지 고려해서 비교
export function matchesSearch(query: string, title: string, artist: string): boolean {
    const q = normalize(query)
    if (!q) return true
    const haystack = [title, artist, ...aliasTerms(artist)].join(" ").toLowerCase()
    return haystack.includes(q)
}

// 영어로 등록된 아티스트명을 한글 표기로 바꿔 보여주기 위한 함수.
// (Apple iTunes 등은 한국 가수도 "IU", "HANRORO"처럼 영문으로만 돌려주는 경우가 많다.)
// 별칭 그룹에 한글 표기가 있으면 그걸 돌려주고, 없으면 원래 이름 그대로 돌려준다.
const HANGUL = /[가-힣]/
export function koreanArtistName(artist: string): string {
    const a = normalize(artist)
    if (!a || HANGUL.test(a)) return artist
    const group = ARTIST_ALIAS_GROUPS.find((g) => g.some((t) => t === a))
    if (!group) return artist
    return group.find((t) => HANGUL.test(t)) ?? artist
}