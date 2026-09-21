import type { ChartEntry } from "./itunes"

// Calls our own Next.js server route (/api/tjchart), which talks to TJ미디어's
// internal chart API server-side (session cookie + CSRF flow — see route.ts
// for details). Returns data shaped like ChartEntry so it drops straight into
// the existing ChartSongRow / ChartPodiumItem components.
export async function fetchTjTop100(limit = 5): Promise<ChartEntry[]> {
    const res = await fetch(`/api/tjchart?limit=${limit}`)
    if (!res.ok) throw new Error("차트를 불러오지 못했어요.")
    const data = await res.json()
    const items: any[] = data?.items ?? []

    return items.map((it) => ({
        id: it.no || String(it.rank),
        rank: it.rank,
        title: it.title,
        artist: it.singer,
        artworkUrl: it.thumb || "",
        genre: "",
        releaseDate: "",
        itunesUrl: "",
    }))
}