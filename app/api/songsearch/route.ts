import { NextRequest, NextResponse } from "next/server"

// 곡 이름/가수로 iTunes에서 실시간 검색한다 (DB에 없는 곡도 찾기 위함).
// 결과에는 앨범 이미지와 30초 미리듣기 주소가 같이 들어있다.
// 음역대(최저음/최고음)는 여기서 알 수 없고, 화면에서 분석된 곡만 따로 붙인다.

async function searchOnce(term: string, country?: string) {
  const url = new URL("https://itunes.apple.com/search")
  url.searchParams.set("term", term)
  url.searchParams.set("media", "music")
  url.searchParams.set("entity", "song")
  url.searchParams.set("limit", "25")
  if (country) url.searchParams.set("country", country)

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data?.results ?? []
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim()
  if (q.length < 2) return NextResponse.json({ items: [] })

  try {
    // country=KR이 한글 검색어에서 0건을 돌려주는 경우가 있어 country 없는 검색을 먼저 한다.
    let results = await searchOnce(q)
    if (results.length === 0) results = await searchOnce(q, "KR")

    const seen = new Set<string>()
    const items = []
    for (const r of results) {
      const title = String(r.trackName ?? "").trim()
      const artist = String(r.artistName ?? "").trim()
      if (!title || !artist) continue
      const key = `${title}::${artist}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push({
        id: `itunes-${r.trackId}`,
        title,
        artist,
        artworkUrl: r.artworkUrl100 ? String(r.artworkUrl100).replace("100x100", "400x400") : null,
        previewUrl: r.previewUrl ?? null,
      })
    }
    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
