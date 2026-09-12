export type ChartEntry = {
  id: string
  rank: number
  title: string
  artist: string
  artworkUrl: string
  genre: string
  releaseDate: string
  itunesUrl: string
}

// Calls our own Next.js server route (/api/chart), which fetches Apple's
// public chart feed server-side. Apple's endpoint doesn't send CORS headers
// a browser will accept, so we can't call it directly from client code —
// routing it through our own server sidesteps that entirely.
export async function fetchKoreaTopSongs(limit = 25): Promise<ChartEntry[]> {
  const res = await fetch(`/api/chart?limit=${limit}`)
  if (!res.ok) throw new Error("차트를 불러오지 못했어요.")
  const data = await res.json()
  const results: any[] = data?.feed?.results ?? []

  return results.map((r, i) => ({
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
}
