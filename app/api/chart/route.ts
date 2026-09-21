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
          { next: { revalidate: 3600 } } // 1시간 캐시
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

// Melon renders spaces inside artist/title text as non-breaking spaces
// (U+00A0, "&nbsp;") wherever it wants to prevent line-wrapping — visually
// identical to a normal space, but a different character. Our DB (and
// Apple's feed) use plain spaces, so anything scraped from Melon has to be
// normalized here or every downstream string comparison silently fails to
// match (e.g. "Lady Gaga" scraped as "Lady Gaga" !== "Lady Gaga").
function cleanText(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim()
}

async function fetchMelonChart(limit: number) {
  const res = await fetch("https://www.melon.com/chart/index.htm", {
    headers: {
      "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: "https://www.melon.com/",
    },
    next: { revalidate: 3600 }, // 멜론차트는 매시 정각 갱신이라 1시간 캐시로 충분
  })
  if (!res.ok) throw new Error(`멜론 응답 실패: ${res.status}`)

  const html = await res.text()
  const $ = cheerio.load(html)
  const results: any[] = []

  $("tr.lst50, tr.lst100").each((_, el) => {
    if (results.length >= limit) return
    const rankText = $(el).find("td:nth-child(2) .rank").first().text().trim()
    const title = cleanText($(el).find(".rank01 a").first().text())
    const artist = cleanText($(el).find(".rank02 a").first().text())
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