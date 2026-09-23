"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { fetchTjTop100, TJ_CATEGORIES } from "@/lib/tjchart"
import { ChartPodiumItem, ChartSongRow, type ChartEntryWithRange } from "@/components/chart-song-row"
import { api, buildSongKey } from "@/lib/api"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export default function TjChartPage() {
    const { profile } = useStore()
    const [chart, setChart] = React.useState<ChartEntryWithRange[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [category, setCategory] = React.useState(TJ_CATEGORIES[0].value) // 종합

    // "종합"은 맨 앞 고정, 그다음 내가 고른 장르를 클릭한 순서대로, 나머지는 뒤에
    const displayCategories = React.useMemo(() => {
        const all = TJ_CATEGORIES.find((c) => c.label === "종합")
        const rest = TJ_CATEGORIES.filter((c) => c.label !== "종합")
        const preferred = profile.preferredGenres
            .map((g) => rest.find((c) => c.label === g))
            .filter((c): c is (typeof rest)[number] => !!c)
        const others = rest.filter((c) => !profile.preferredGenres.includes(c.label))
        return all ? [all, ...preferred, ...others] : [...preferred, ...others]
    }, [profile.preferredGenres])

    React.useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError("")
        fetchTjTop100(100, category)
            .then(async (data) => {
                if (cancelled) return
                setChart(data)
                setLoading(false)

                try {
                    const ranges = await api.getVocalRanges(
                        data.map((e) => ({ title: e.title, artist: e.artist }))
                    )
                    if (cancelled) return
                    setChart((prev) =>
                        prev.map((e) => {
                            const r = ranges[buildSongKey(e.title, e.artist)]
                            return r ? { ...e, minNote: r.minNote, maxNote: r.maxNote } : e
                        })
                    )
                } catch {
                    // 음역대 조회 실패는 조용히 무시
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError("차트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
                    setLoading(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [category])

    const top3 = chart.slice(0, 3)
    const rest = chart.slice(3)
    const categoryLabel = TJ_CATEGORIES.find((c) => c.value === category)?.label

    return (
        <main className="px-4 pt-4 pb-6">
            <header className="px-1 mb-4">
                <div className="text-xs text-primary font-bold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    TJ미디어 노래방 인기차트 기준
                </div>
                <h1 className="text-2xl font-extrabold">인기차트</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                    {categoryLabel === "종합" ? "TOP 100" : `TOP 100 중 ${categoryLabel}`}
                </div>
            </header>

            <div className="flex gap-2 mb-5 px-1 overflow-x-auto no-scrollbar">
                {displayCategories.map((c) => (
                    <button
                        key={c.value || "all"}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={cn(
                            "h-9 px-4 rounded-full text-xs font-bold border-2 transition-colors whitespace-nowrap shrink-0",
                            category === c.value
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-surface/40 text-muted-foreground"
                        )}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            {/* 이하 동일 */}
        </main>
    )
}