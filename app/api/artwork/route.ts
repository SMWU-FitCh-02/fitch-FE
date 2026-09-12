import { NextRequest, NextResponse } from "next/server"

async function searchOnce(term: string, country?: string) {
  const url = new URL("https://itunes.apple.com/search")
  url.searchParams.set("term", term)
  url.searchParams.set("media", "music")
  url.searchParams.set("entity", "song")
  url.searchParams.set("limit", "3")
  if (country) url.searchParams.set("country", country)

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
  if (!res.ok) return null
  const data = await res.json()
  return data?.results?.[0] ?? null
}

// Looks up real album artwork + a real 30s preview clip via Apple's iTunes
// Search API. Restricting to country=KR sometimes returns zero results even
// for well-known songs, so we try KR first (closer catalog match) and fall
// back to the unrestricted (US) catalog if that comes up empty.
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title") || ""
  const artist = req.nextUrl.searchParams.get("artist") || ""
  if (!title) {
    return NextResponse.json({ artworkUrl: null, previewUrl: null })
  }

  try {
    const term = `${artist} ${title}`.trim()
    let result = await searchOnce(term, "KR")
    if (!result) result = await searchOnce(term)

    const artworkUrl = result?.artworkUrl100
      ? result.artworkUrl100.replace("100x100", "400x400")
      : null
    const previewUrl = result?.previewUrl ?? null

    return NextResponse.json({ artworkUrl, previewUrl })
  } catch {
    return NextResponse.json({ artworkUrl: null, previewUrl: null })
  }
}
