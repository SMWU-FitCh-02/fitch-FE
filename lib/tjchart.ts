import type { ChartEntry } from "./itunes"
import { api, buildSongKey } from "@/lib/api"

// TJ미디어 장르 코드 (버튼 순서대로 순번이 매겨져 있음)
export type TjCategory = {
    value: string // "" = 종합
    label: string
}

export const TJ_CATEGORIES: TjCategory[] = [
    { value: "", label: "종합" },
    { value: "2", label: "POP" },
    { value: "4", label: "발라드" },
    { value: "5", label: "댄스" },
    { value: "8", label: "OST" },
    { value: "10", label: "랩/힙합" },
    { value: "11", label: "R&B/어반" },
]

// Calls our own Next.js server route (/api/tjchart), which talks to TJ미디어's
// internal chart API server-side (session cookie + CSRF flow — see route.ts
// for details). Returns data shaped like ChartEntry so it drops straight into
// the existing ChartSongRow / ChartPodiumItem components.
export async function fetchTjTop100(limit = 5, strType = ""): Promise<ChartEntry[]> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (strType) params.set("strType", strType)

    const res = await fetch(`/api/tjchart?${params.toString()}`)
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

export type ChartEntryWithRange = ChartEntry & {
    minNote?: number
    maxNote?: number
}

// fetchTjTop100과 동일하게 TJ차트를 불러오되, 오프라인으로 크롤링/분석해둔
// 음역대(minNote/maxNote)를 title+artist 기준으로 매칭해 붙여준다.
// /recommendations처럼 "내 음역대에 맞는 곡"을 걸러야 하는 화면에서 사용.
export async function fetchTjChartWithRange(limit = 100, strType = ""): Promise<ChartEntryWithRange[]> {
    const entries = await fetchTjTop100(limit, strType)
    const withRange: ChartEntryWithRange[] = entries.map((e) => ({ ...e }))

    try {
        const rangeMap = await api.getVocalRanges(
            withRange.map((e) => ({ title: e.title, artist: e.artist }))
        )
        for (const entry of withRange) {
            const key = buildSongKey(entry.title, entry.artist)
            const r = rangeMap[key]
            if (r) {
                entry.minNote = r.minNote
                entry.maxNote = r.maxNote
            }
        }
    } catch {
        // 음역대 조회가 실패해도 차트 자체는 보여준다 (별 표시만 비게 됨)
    }

    return withRange
}