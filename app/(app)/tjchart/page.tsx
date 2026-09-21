"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { fetchTjTop100, TJ_CATEGORIES } from "@/lib/tjchart"
import { type ChartEntry } from "@/lib/itunes"
import { ChartPodiumItem, ChartSongRow } from "@/components/chart-song-row"
import { api, type ArtistGender } from "@/lib/api"
import { cn } from "@/lib/utils"

type GenderFilter = "ALL" | "MALE" | "FEMALE"

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
    { value: "ALL", label: "전체" },
    { value: "MALE", label: "남성곡" },
    { value: "FEMALE", label: "여성곡" },
]

export default function TjChartPage() {
    const [chart, setChart] = React.useState<ChartEntry[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [category, setCategory] = React.useState(TJ_CATEGORIES[0].value) // 종합
    const [genderMap, setGenderMap] = React.useState<Record<string, ArtistGender>>({})
    const [gender, setGender] = React.useState<GenderFilter>("ALL")

    // 장르(카테고리) 바뀔 때마다 서버에서 다시 받아옴
    React.useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError("")
        fetchTjTop100(100, category)
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
    }, [category])

    // 차트가 바뀔 때마다 아티스트 성별 조회 (멜론 차트와 동일한 패턴)
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
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [chart])

    const filtered = React.useMemo(() => {
        if (gender === "ALL") return chart
        const matched = chart.filter((entry) => {
            const g = genderMap[entry.artist.normalize("NFC")]
            return g === gender || g === "MIXED"
        })
        return matched.map((entry, i) => ({ ...entry, rank: i + 1 }))
    }, [chart, gender, genderMap])

    const top3 = filtered.slice(0, 3)
    const rest = filtered.slice(3)

    const categoryLabel = TJ_CATEGORIES.find((c) => c.value === category)?.label
    const genderLabel = GENDER_FILTERS.find((f) => f.value === gender)?.label

    const headerParts = [
        categoryLabel !== "종합" ? categoryLabel : null,
        gender !== "ALL" ? genderLabel : null,
    ].filter(Boolean)

    return (
        <main className="px-4 pt-4 pb-6">
            <header className="px-1 mb-4">
                <div className="text-xs text-primary font-bold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    TJ미디어 노래방 인기차트 기준
                </div>
                <h1 className="text-2xl font-extrabold">인기차트</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                    {headerParts.length > 0 ? `TOP 100 중 ${headerParts.join(" · ")}` : "TOP 100"}
                </div>
            </header>

            {/* 장르 탭 */}
            <div className="flex gap-2 mb-3 px-1 overflow-x-auto no-scrollbar">
                {TJ_CATEGORIES.map((c) => (
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

            {/* 성별 필터 */}
            <div className="flex gap-2 mb-5 px-1">
                {GENDER_FILTERS.map((f) => (
                    <button
                        key={f.value}
                        type="button"
                        onClick={() => setGender(f.value)}
                        className={cn(
                            "h-9 px-4 rounded-full text-xs font-bold border-2 transition-colors",
                            gender === f.value
                                ? "border-brand bg-brand/10 text-foreground"
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
                            <ChartPodiumItem key={entry.id} entry={entry} />
                        ))}
                    </div>

                    <div className="flex items-center justify-between px-1 mb-3">
                        <h2 className="text-sm font-bold">4위 이하</h2>
                    </div>

                    <div className="space-y-2">
                        {rest.map((entry) => (
                            <ChartSongRow key={entry.id} entry={entry} />
                        ))}
                    </div>
                </>
            )}
        </main>
    )
}