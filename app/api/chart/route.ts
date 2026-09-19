import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

// Runs on the Next.js server, not in the browser — so CORS restrictions
// don't apply here. The client calls this same-origin route.
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "25", 10)

  try {
    const melonResults = await fetchMelonChart(limit)
    if (melonResults.length > 0) {
      return NextResponse.json({ source: "melon", feed: { results: melonResults } })
    }
    throw new Error("멜론 차트 파싱 결과가 비어있음")
  } catch (melonErr) {
    // 멜론 스크래핑 실패 시 애플 차트로 폴백
    try {
      const res = await fetch(
          `https://rss.marketingtools.apple.com/api/v2/kr/music/most-played/${limit}/songs.json`,
          { next: { revalidate: 300 } }
      )
      if (!res.ok) {
        return NextResponse.json({ error: "차트를 불러오지 못했어요." }, { status: 502 })
      }
      const data = await res.json()
      return NextResponse.json({ source: "apple", ...data })
    } catch {
      return NextResponse.json({ error: "차트를 불러오지 못했어요." }, { status: 502 })
    }
  }
}

async function fetchMelonChart(limit: number) {
  const res = await fetch("https://www.melon.com/chart/index.htm", {
    headers: {
      "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.melon.com/",
    },
    next: { revalidate: 300 }, // 5분 캐시
  })
  if (!res.ok) throw new Error(`멜론 응답 실패: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)
  const results: any[] = []

  $("tr.lst50, tr.lst100").each((_, el) => {
    if (results.length >= limit) return
    const rankText = $(el).find("td:nth-child(2) .rank").first().text().trim()
    const title = $(el).find(".rank01 a").first().text().trim()
    const artist = $(el).find(".rank02 a").first().text().trim()
    const albumImg = $(el).find(".image_typeAll img").attr("src") || ""
    const songId = $(el).attr("data-song-no") || String(results.length + 1)

    if (title && artist) {
      results.push({
        artistName: artist,
        id: songId,
        name: title,
        artworkUrl100: albumImg,
        genres: [],
        url: "",
        rank: rankText ? parseInt(rankText, 10) : results.length + 1,
      })
    }
  })

  return results
}