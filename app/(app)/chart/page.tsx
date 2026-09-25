"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { fetchTjTop100, TJ_CATEGORIES } from "@/lib/tjchart"
import { fetchKoreaTopSongsWithSource, chartSourceLabel, type ChartEntry, type ChartSource } from "@/lib/itunes"
import { ChartPodiumItem, ChartSongRow, type ChartEntryWithRange } from "@/components/chart-song-row"
import { api, buildSongKey, type ArtistGender } from "@/lib/api"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type SourceTab = "tj" | "melon"
type GenderFilter = "ALL" | "MALE" | "FEMALE"

const SOURCE_TABS: { value: SourceTab; label: string }[] = [
    { value: "tj", label: "노래방 인기차트" },
    { value: "melon", label: "멜론 인기차트" },
]

const GENDER_FILTERS: { value: GenderFilter; label: string }[] = [
    { value: "ALL", label: "전체" },
    { value: "MALE", label: "남성곡" },
    { value: "FEMALE", label: "여성곡" },
]

// 아래로 스크롤하면 숨기고, 위로 스크롤하면 보이게
function useHideOnScrollDown() {
    const [hidden, setHidden] = React.useState(false)
    const lastY = React.useRef(0)

    React.useEffect(() => {
        lastY.current = window.scrollY

        function handleScroll() {
            const y = window.scrollY
            const delta = y - lastY.current

            if (y < 24) {
                setHidden(false)
            } else if (delta > 4) {
                setHidden(true)
            } else if (delta < -4) {
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
    const { profile } = useStore()
    const [source, setSource] = React.useState<SourceTab>("tj")
    const [genderFilter, setGenderFilter] = React.useState<GenderFilter>("ALL")
    const hidden = useHideOnScrollDown()

    // ── 노래방(TJ) 차트 ──
    const [tjChart, setTjChart] = React.useState<ChartEntryWithRange[]>([])
    const [tjLoading, setTjLoading] = React.useState(true)
    const [tjError, setTjError] = React.useState("")
    const [category, setCategory] = React.useState(TJ_CATEGORIES[0].value)

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
        if (source !== "tj") return
        let cancelled = false
        setTjLoading(true)
        setTjError("")
        fetchTjTop100(100, category)
            .then(async (data) => {
                if (cancelled) return
                setTjChart(data)
                setTjLoading(false)
                try {
                    const ranges = await api.getVocalRanges(
                        data.map((e) => ({ title: e.title, artist: e.artist }))
                    )
                    if (cancelled) return
                    setTjChart((prev) =>
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
                    setTjError("차트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
                    setTjLoading(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [source, category])

    // ── 멜론 차트 ──
    const [melonChart, setMelonChart] = React.useState<ChartEntry[]>([])
    const [melonSource, setMelonSource] = React.useState<ChartSource>("melon")
    const [melonLoading, setMelonLoading] = React.useState(true)
    const [melonError, setMelonError] = React.useState("")

    React.useEffect(() => {
        if (source !== "melon") return
        let cancelled = false
        setMelonLoading(true)
        setMelonError("")
        fetchKoreaTopSongsWithSource(100)
            .then(({ source: src, entries }) => {
                if (cancelled) return
                setMelonSource(src)
                setMelonChart(entries)
            })
            .catch(() => {
                if (!cancelled) setMelonError("차트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
            })
            .finally(() => {
                if (!cancelled) setMelonLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [source])

    const rawChart = source === "tj" ? tjChart : melonChart
    const loading = source === "tj" ? tjLoading : melonLoading
    const error = source === "tj" ? tjError : melonError

    const [genderMap, setGenderMap] = React.useState<Record<string, ArtistGender>>({})

    React.useEffect(() => {
        if (rawChart.length === 0) return
        let cancelled = false
        const uniqueArtists = Array.from(
            new Set(rawChart.map((c) => c.artist.normalize("NFC")))
        )
        api
            .getArtistGenders(uniqueArtists)
            .then((map) => {
                if (cancelled) return
                const normalized: Record<string, ArtistGender> = {}
                for (const [k, v] of Object.entries(map)) {
                    normalized[k.normalize("NFC")] = v
                }
                setGenderMap((prev) => ({ ...prev, ...normalized }))
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [rawChart])

    React.useEffect(() => {
        if (rawChart.length === 0) return
        console.log("차트 아티스트:", rawChart.map((e) => e.artist))
        console.log("genderMap 키:", Object.keys(genderMap))
    }, [rawChart, genderMap])

    const chart = React.useMemo(() => {
        if (genderFilter === "ALL") return rawChart
        const matched = rawChart.filter((entry) => {
            const g = genderMap[entry.artist.normalize("NFC")]
            return g === genderFilter || g === "MIXED"
        })
        return matched.map((entry, i) => ({ ...entry, rank: i + 1 }))
    }, [rawChart, genderFilter, genderMap])

    const top3 = chart.slice(0, 3)
    const rest = chart.slice(3)
    const categoryLabel = TJ_CATEGORIES.find((c) => c.value === category)?.label
    const genderLabel = GENDER_FILTERS.find((f) => f.value === genderFilter)?.label
    const activeGenderIndex = GENDER_FILTERS.findIndex((f) => f.value === genderFilter)

    return (
        <main className="px-4 pt-4 pb-28">
            <header className="px-1 mb-3">
                <div className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-primary">
            {source === "tj" ? "TJ미디어 노래방 인기차트 기준" : chartSourceLabel(melonSource)}
        </span>
                    <span className="text-muted-foreground font-normal text-xs">
            {source === "tj"
                ? categoryLabel === "종합" ? "TOP 100" : `TOP 100 중 ${categoryLabel}`
                : "대한민국 TOP 100"}
                        {genderFilter !== "ALL" ? ` · ${genderLabel}` : ""}
        </span>
                </div>
            </header>

            {/* 소스 선택 탭 (노래방 / 멜론) */}
            <div className="flex justify-center mb-3">
                <div className="relative inline-grid grid-cols-2 p-1 rounded-full bg-surface-elevated/60 backdrop-blur-md border border-white/10">
                    <div
                        className="absolute inset-y-1 left-1 rounded-full bg-primary transition-transform duration-300 ease-out"
                        style={{
                            width: `calc((100% - 0.5rem) / 2)`,
                            transform: `translateX(${SOURCE_TABS.findIndex((t) => t.value === source) * 100}%)`,
                        }}
                    />
                    {SOURCE_TABS.map((t) => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => setSource(t.value)}
                            className={cn(
                                "relative z-10 h-10 px-4 rounded-full text-sm font-bold transition-colors whitespace-nowrap",
                                source === t.value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 노래방일 때만: 장르 카테고리 칩 (일반 흐름) */}
            {source === "tj" && (
                <div className="flex justify-between mb-2 px-1">
                    {displayCategories.map((c) => (
                        <button
                            key={c.value || "all"}
                            type="button"
                            onClick={() => setCategory(c.value)}
                            className={cn(
                                "py-1 text-xs font-bold transition-colors whitespace-nowrap",
                                category === c.value
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            )}

            {/* 떠 있는 성별 필터 - 하단바 위, 스크롤 방향에 따라 숨김/노출 */}
            <div
                className={cn(
                    "fixed inset-x-0 z-20 flex justify-center px-[8px] transition-all duration-300",
                    "bottom-[calc(4.425rem+env(safe-area-inset-bottom))]",
                    hidden ? "opacity-0 translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"
                )}
            >
                <div className="relative inline-grid grid-cols-3 p-1 rounded-full bg-surface-elevated backdrop-blur-xl border border-white/10 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)]">
                    <div
                        className="absolute inset-y-1 left-1 rounded-full bg-primary transition-transform duration-300 ease-out"
                        style={{
                            width: `calc((100% - 0.5rem) / 3)`,
                            transform: `translateX(${activeGenderIndex * 100}%)`,
                        }}
                    />
                    {GENDER_FILTERS.map((f) => (
                        <button
                            key={f.value}
                            type="button"
                            onClick={() => setGenderFilter(f.value)}
                            className={cn(
                                "relative z-10 h-8 px-4 rounded-full text-xs font-bold transition-colors",
                                genderFilter === f.value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="py-16 text-center text-sm text-muted-foreground">차트를 불러오는 중...</div>
            )}

            {!loading && error && (
                <div className="py-16 text-center text-sm text-destructive">{error}</div>
            )}

            {!loading && !error && chart.length === 0 && (
                <div className="py-16 text-center text-sm text-muted-foreground">
                    해당하는 곡이 아직 없어요.
                </div>
            )}

            {!loading && !error && chart.length > 0 && (
                <>
                    {profile.range && source === "tj" && (
                        <p className="text-[8px] text-muted-foreground text-right mb-2 px-1">
                            내 음역대 기준 · {" "}
                            <span className="text-emerald-400">★</span> 쉬움 · {" "}
                            <span className="text-amber-400">★★</span> 보통 · {" "}
                            <span className="text-rose-400">★★★</span> 고난이도
                        </p>
                    )}

                    <div className="grid grid-cols-3 gap-2 mb-6">
                        {top3.map((entry) => (
                            <ChartPodiumItem key={entry.id} entry={entry} />
                        ))}
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