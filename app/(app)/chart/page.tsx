"use client"

import * as React from "react"
import {TrendingUp} from "lucide-react"
import {fetchKoreaTopSongsWithSource, chartSourceLabel, type ChartEntry, type ChartSource} from "@/lib/itunes"
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
    const [source, setSource] = React.useState<ChartSource>("melon")
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [genderMap, setGenderMap] = React.useState<Record<string, ArtistGender>>({})
    const [filter, setFilter] = React.useState<GenderFilter>("ALL")

    React.useEffect(() => {
        let cancelled = false
        fetchKoreaTopSongsWithSource(100)
            .then(({source, entries}) => {
                if (cancelled) return
                setSource(source)
                setChart(entries)
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
        // NFC로 정규화해서 보냄 — 한글/악센트 문자는 완성형(NFC)/분해형(NFD)
        // 두 가지로 표현될 수 있는데, 화면엔 똑같이 보여도 문자열 비교는 다르게
        // 취급되기 때문에 여기서 통일해준다.
        const uniqueArtists = Array.from(
            new Set(chart.map((c) => c.artist.normalize("NFC")))
        )
        api
            .getArtistGenders(uniqueArtists)
            .then((map) => {
                if (cancelled) return
                // 백엔드/DB에서 온 키가 NFD로 저장돼 있을 수 있어서, 여기서도
                // NFC로 정규화해서 저장해야 아래 필터링에서 정확히 매칭된다.
                const normalized: Record<string, ArtistGender> = {}
                for (const [k, v] of Object.entries(map)) {
                    normalized[k.normalize("NFC")] = v
                }
                setGenderMap(normalized)
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
            const g = genderMap[entry.artist.normalize("NFC")]
            return g === filter || g === "MIXED"
        })
        // re-rank 1, 2, 3... within the filtered (gender-only) list
        return matched.map((entry, i) => ({...entry, rank: i + 1}))
    }, [chart, filter, genderMap])

    const top3 = filtered.slice(0, 3)
    const rest = filtered.slice(3)

    return (
        <main className="px-4 pt-4 pb-6">
            <header className="px-1 mb-4">
                <div className="text-xs text-primary font-bold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5"/>
                    {chartSourceLabel(source)}
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