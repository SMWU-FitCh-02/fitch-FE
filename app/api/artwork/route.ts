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

async function searchOnce(term: string, country?: string) {
  const url = new URL("https://itunes.apple.com/search")
  url.searchParams.set("term", term)
  url.searchParams.set("media", "music")
  url.searchParams.set("entity", "song")
  url.searchParams.set("limit", "3")
  if (country) url.searchParams.set("country", country)

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
    next: { revalidate: 86400 },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.results?.[0] ?? null
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

async function searchWithFallbacks(title: string, artist: string) {
  const term = `${artist} ${title}`.trim()
  let result = await searchOnce(term, "KR")
  if (result) return result
  result = await searchOnce(term)
  if (result) return result

  const cleaned = cleanTitle(title)
  if (cleaned && cleaned !== title) {
    const cleanTerm = `${artist} ${cleaned}`.trim()
    result = await searchOnce(cleanTerm, "KR")
    if (result) return result
    result = await searchOnce(cleanTerm)
    if (result) return result
  }

  // 아티스트명까지 포함해서 실패하는 경우, 제목만으로 마지막 시도
  const titleOnly = cleaned || title
  result = await searchOnce(titleOnly, "KR")
  if (result) return result
  return await searchOnce(titleOnly)
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