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

// 흔한 제목(동명곡/리메이크/커버가 많은 곡)의 경우 iTunes가 완전히 다른
// 아티스트의 곡을 1순위로 돌려주는 경우가 있어서, 결과의 artistName이나
// trackName이 실제로 우리가 찾던 것과 비슷한지 검증한 뒤에만 채택한다.
function normalizeText(s: string): string {
  return s
      .toLowerCase()
      .replace(/[（(][^）)]*[）)]/g, "") // "아이유 (IU)" -> "아이유 "
      .replace(/[^\p{L}\p{N}]/gu, "") // 공백/특수문자 제거
}

function isTextMatch(a: string, b: string): boolean {
  const x = normalizeText(a)
  const y = normalizeText(b)
  if (!x || !y) return false
  return x.includes(y) || y.includes(x)
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

// 검색 결과들 중에서 실제로 신뢰할 수 있는 첫 번째 결과를 반환.
//
// 우선순위:
//  1) 아티스트명이 일치하는 결과 (가장 신뢰도 높음)
//  2) 검색어에 아티스트명을 포함해서 보낸 시도였다면(= 이미 애플 검색
//     엔진이 아티스트 텍스트로 관련도를 계산했을 것이므로), artistName
//     표기가 달라도(한글 활동명 vs 로마자 표기 등, 예: "아이유" vs "IU")
//     곡 제목이 확실히 일치하면 구제해서 채택한다.
//  3) 그 외(제목만 검색해서 아티스트 단서가 전혀 없는 경우)엔 제목만 보고
//     채택하지 않는다 — 동명이곡 때문에 완전히 다른 곡이 걸릴 위험이 큼.
// 아무 것도 통과 못하면 null — 틀린 곡을 재생하는 것보단 미리듣기가
// 없는 게 낫다는 판단.
function pickVerifiedMatch(
    results: any[],
    artist: string,
    title: string,
    searchIncludedArtist: boolean,
) {
  for (const r of results) {
    if (isTextMatch(artist, r.artistName ?? "")) return r
  }
  if (searchIncludedArtist) {
    for (const r of results) {
      if (isTextMatch(title, r.trackName ?? "")) return r
    }
  }
  return null
}

async function searchWithFallbacks(title: string, artist: string) {
  const attempts: Array<[string, string | undefined, boolean]> = []
  const term = `${artist} ${title}`.trim()
  attempts.push([term, "KR", true])
  attempts.push([term, undefined, true])

  const cleaned = cleanTitle(title)
  if (cleaned && cleaned !== title) {
    const cleanTerm = `${artist} ${cleaned}`.trim()
    attempts.push([cleanTerm, "KR", true])
    attempts.push([cleanTerm, undefined, true])
  }

  // 아티스트명까지 포함해서 실패하는 경우, 제목만으로 마지막 시도.
  // (아티스트 단서가 없으니 아티스트 일치로만 검증)
  const titleOnly = cleaned || title
  attempts.push([titleOnly, "KR", false])
  attempts.push([titleOnly, undefined, false])

  for (const [searchTerm, country, includedArtist] of attempts) {
    const results = await searchOnce(searchTerm, country)
    const verified = pickVerifiedMatch(results, artist, title, includedArtist)
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