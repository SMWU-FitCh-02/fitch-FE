import { NextRequest, NextResponse } from "next/server"

// 곡 이름/가수로 iTunes에서 실시간 검색한다 (DB에 없는 곡도 찾기 위함).
// 결과에는 앨범 이미지와 30초 미리듣기 주소가 같이 들어있다.
// 음역대(최저음/최고음)는 여기서 알 수 없고, 화면에서 분석된 곡만 따로 붙인다.

// 반주/연주 버전 표시가 들어간 제목은 결과에서 제외
const NON_VOCAL = /instrumental|\binst\b\.?|karaoke|off vocal|backing track|\bmr\b|반주|연주곡|인스트/i

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
    // (한국 스토어 KR 검색은 한글 검색어에서 결과가 비어서 쓰지 않는다. 한글 표기는 화면에서 AI로 따로 붙인다.)
    const results = await searchOnce(q)

    const seen = new Set<string>()
    const items: { id: string; title: string; artist: string; artworkUrl: string | null; previewUrl: string | null; korean: boolean }[] = []
    for (const r of results) {
      const title = String(r.trackName ?? "").trim()
      const artist = String(r.artistName ?? "").trim()
      if (!title || !artist) continue
      // 반주/연주곡(Instrumental, MR 등)은 보컬 곡이 아니라서 뺀다.
      if (NON_VOCAL.test(title)) continue
      const key = `${title}::${artist}`.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push({
        id: `itunes-${r.trackId}`,
        title,
        artist,
        artworkUrl: r.artworkUrl100 ? String(r.artworkUrl100).replace("100x100", "400x400") : null,
        previewUrl: r.previewUrl ?? null,
        // iTunes 장르가 K-Pop / Korean ... 이면 한국 곡으로 본다 (가수 이름이 영어여도 구분 가능)
        korean: /k-?pop|korean|k-?hip|k-?r&b|트로트|국내/i.test(String(r.primaryGenreName ?? "")),
      })
    }
    // 한국 곡(장르가 K-Pop 등이거나 제목/가수에 한글이 있는 곡)을 위로. 같은 그룹 안에서는 원래 순서 유지.
    const hasHangul = (t: string) => /[가-힣]/.test(t)
    const isKo = (i: { title: string; artist: string; korean: boolean }) =>
        i.korean || hasHangul(i.title) || hasHangul(i.artist)
    const ordered = [...items.filter(isKo), ...items.filter((i) => !isKo(i))]
    return NextResponse.json({ items: ordered })
  } catch {
    return NextResponse.json({ items: [] })
  }
}