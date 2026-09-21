export type ChartEntry = {
  id: string
  rank: number
  title: string
  artist: string
  artworkUrl: string
  genre: string
  releaseDate: string
  itunesUrl: string
  lowestNote?: string
  highestNote?: string
}

export type ChartSource = "melon" | "apple"

export type ChartResult = {
  source: ChartSource
  entries: ChartEntry[]
}

// Calls our own Next.js server route (/api/chart), which scrapes Melon's
// realtime chart (falling back to Apple's public chart feed if that fails)
// server-side. Neither source sends CORS headers a browser will accept, so
// we can't call them directly from client code — routing it through our
// own server sidesteps that entirely.
export async function fetchKoreaTopSongsWithSource(limit = 25): Promise<ChartResult> {
  const res = await fetch(`/api/chart?limit=${limit}`)
  if (!res.ok) throw new Error("차트를 불러오지 못했어요.")
  const data = await res.json()
  const results: any[] = data?.feed?.results ?? []
  const source: ChartSource = data?.source === "apple" ? "apple" : "melon"

  const entries = results.map((r, i) => ({
    id: r.id ?? String(i),
    rank: i + 1,
    title: r.name ?? "",
    artist: r.artistName ?? "",
    // artworkUrl100 is a 100x100 thumbnail; bump the requested size in the URL for a sharper image
    artworkUrl: (r.artworkUrl100 ?? "").replace("100x100", "300x300"),
    genre: r.genres?.[0]?.name ?? "",
    releaseDate: r.releaseDate ?? "",
    itunesUrl: r.url ?? "",
  }))

  return { source, entries }
}

// Back-compat helper for callers that only need the song list.
export async function fetchKoreaTopSongs(limit = 25): Promise<ChartEntry[]> {
  const { entries } = await fetchKoreaTopSongsWithSource(limit)
  return entries
}

export function chartSourceLabel(source: ChartSource): string {
  return source === "melon" ? "멜론 차트 기준" : "Apple Music 기준"
}

