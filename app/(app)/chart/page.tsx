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

// 위로 스크롤하면 숨기고, 아래로 스크롤하면 보이게
function useHideOnScrollUp() {
    const [hidden, setHidden] = React.useState(false)
    const lastY = React.useRef(0)

    React.useEffect(() => {
        lastY.current = window.scrollY

        function handleScroll() {
            const y = window.scrollY
            const delta = y - lastY.current

            if (delta < -4) {
                setHidden(true)
            } else if (delta > 4) {
                setHidden(false)
            }

            lastY.current = y
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return hidden
}

export default function ChartPage() {
    const [chart, setChart] = React.useState<ChartEntry[]>([])
    const [source, setSource] = React.useState<ChartSource>("melon")
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [genderMap, setGenderMap] = React.useState<Record<string, ArtistGender>>({})
    const [filter, setFilter] = React.useState<GenderFilter>("ALL")
    const hidden = useHideOnScrollUp()

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
        const uniqueArtists = Array.from(
            new Set(chart.map((c) => c.artist.normalize("NFC")))
        )
        api
            .getArtistGenders(uniqueArtists)
            .then((map) => {
                if (cancelled) return
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
        return matched.map((entry, i) => ({...entry, rank: i + 1}))
    }, [chart, filter, genderMap])

    const top3 = filtered.slice(0, 3)
    const rest = filtered.slice(3)
    const filterLabel = FILTERS.find((f) => f.value === filter)?.label

    return (
        <main className="px-4 pt-4 pb-6">
            <header className="px-1 mb-4">
                <div className="text-xs text-primary font-bold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5"/>
                    {chartSourceLabel(source)}
                </div>
                <h1 className="text-2xl font-extrabold">인기차트</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                    대한민국 TOP 100{filter !== "ALL" ? ` · ${filterLabel}` : ""}
                </div>
            </header>

            {/* 떠 있는 필터 - 화면에 고정, 스크롤 방향에 따라 숨김/노출 */}
            <div
                className={cn(
                    "fixed inset-x-0 top-[104px] z-20 flex justify-center px-[8px] transition-all duration-300",
                    hidden ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"
                )}
            >
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-surface-elevated/60 backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)]">
                    {FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => setFilter(f.value)}
                            className={cn(
                                "h-8 px-4 rounded-full text-xs font-bold transition-colors",
                                filter === f.value
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 필터가 떠서 가리는 만큼 여백 확보 */}
            <div className="h-14" />

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