"use client"

import * as React from "react"
import {TrendingUp} from "lucide-react"
import {fetchKoreaTopSongs, type ChartEntry} from "@/lib/itunes"
import {ChartPodiumItem, ChartSongRow} from "@/components/chart-song-row"
import {api, type ArtistGender} from "@/lib/api"
import {cn} from "@/lib/utils"

type GenderFilter = "ALL" | "MALE" | "FEMALE"

const FILTERS: { value: GenderFilter; label: string }[] = [
    {value: "ALL", label: "전체"},
    {value: "MALE", label: "남성곡"},
    {value: "FEMALE", label: "여성곡"},
]

export default function ChartPage() {
    const [chart, setChart] = React.useState<ChartEntry[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [genderMap, setGenderMap] = React.useState<Record<string, ArtistGender>>({})
    const [filter, setFilter] = React.useState<GenderFilter>("ALL")

    React.useEffect(() => {
        let cancelled = false
        fetchKoreaTopSongs(100)
            .then((data) => {
                if (!cancelled) setChart(data)
            })
            .catch(() => {
                if (!cancelled) setError("차트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    // once we have the chart, look up which artists are male/female/mixed
    React.useEffect(() => {
        if (chart.length === 0) return
        let cancelled = false
        const uniqueArtists = Array.from(new Set(chart.map((c) => c.artist)))
        api
            .getArtistGenders(uniqueArtists)
            .then((map) => {
                if (!cancelled) setGenderMap(map)
            })
            .catch(() => {
            })
        return () => {
            cancelled = true
        }
    }, [chart])

    const filtered = React.useMemo(() => {
        if (filter === "ALL") return chart
        const matched = chart.filter((entry) => {
            const g = genderMap[entry.artist]
            return g === filter || g === "MIXED"
        })
        // re-rank 1, 2, 3... within the filtered (gender-only) list
        return matched.map((entry, i) => ({...entry, rank: i + 1}))
    }, [chart, filter, genderMap])
    console.log("DEBUG", {
        filter,
        chartLen: chart.length,
        genderMapKeys: Object.keys(genderMap).length,
        filteredLen: filtered.length,
    })

    if (chart.length > 0 && Object.keys(genderMap).length > 0) {
        const unmatched = chart
            .filter((c) => genderMap[c.artist] === undefined)
            .map((c) => c.artist)
        console.log("UNMATCHED ARTISTS", Array.from(new Set(unmatched)))
    }

    const top3 = filtered.slice(0, 3)
    const rest = filtered.slice(3)

    return (
        <main className="px-4 pt-4 pb-6">
            <header className="px-1 mb-4">
                <div className="text-xs text-primary font-bold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5"/>
                    Apple Music 기준
                </div>
                <h1 className="text-2xl font-extrabold">인기차트</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                    대한민국 Top {filtered.length || (chart.length || 100)}
                </div>
            </header>

            <div className="flex gap-2 mb-5 px-1">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        type="button"
                        onClick={() => setFilter(f.value)}
                        className={cn(
                            "h-9 px-4 rounded-full text-xs font-bold border-2 transition-colors",
                            filter === f.value
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-surface/40 text-muted-foreground"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="py-16 text-center text-sm text-muted-foreground">차트를 불러오는 중...</div>
            )}

            {!loading && error && (
                <div className="py-16 text-center text-sm text-destructive">{error}</div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="py-16 text-center text-sm text-muted-foreground">
                    해당하는 곡이 아직 없어요.
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {top3.map((entry) => (
                            <ChartPodiumItem key={entry.id} entry={entry}/>
                        ))}
                    </div>

                    <div className="flex items-center justify-between px-1 mb-3">
                        <h2 className="text-sm font-bold">4위 이하</h2>
                    </div>

                    <div className="space-y-2">
                        {rest.map((entry) => (
                            <ChartSongRow key={entry.id} entry={entry}/>
                        ))}
                    </div>
                </>
            )}
        </main>
    )
}