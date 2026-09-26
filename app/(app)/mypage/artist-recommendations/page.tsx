"use client"

import * as React from "react"
import { Search, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { TJ_CATEGORIES, fetchTjTop100 } from "@/lib/tjchart"
import { api, buildSongKey } from "@/lib/api"
import { ChartPodiumItem, ChartSongRow, type ChartEntryWithRange } from "@/components/chart-song-row"
import { cn } from "@/lib/utils"

// "종합"은 장르가 아니라 전체 통합 차트라서 유사 아티스트를 찾을 때 기준으로
// 쓸 수 없다 — 장르별 6개 카테고리만 모아서 풀을 만든다.
const GENRE_CATEGORIES = TJ_CATEGORIES.filter((c) => c.value !== "")

type ArtistEntry = ChartEntryWithRange & {
    categoryLabel: string
    minNoteLabel?: string
    maxNoteLabel?: string
}

export default function ArtistRecommendationsPage() {
    const { profile } = useStore()
    const [query, setQuery] = React.useState("")
    const [selected, setSelected] = React.useState<string | null>(
        profile.preferredArtists[0] || null
    )

    const [pool, setPool] = React.useState<ArtistEntry[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")

    // 노래방(TJ) 장르 6개 카테고리를 모두 불러와 하나의 풀로 합치고,
    // 미리 크롤링해둔 음역대(min/maxNote)를 title+artist 기준으로 매칭해 붙인다.
    // (차트 페이지 - app/(app)/chart/page.tsx - 와 동일한 패턴)
    React.useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError("")

        Promise.all(
            GENRE_CATEGORIES.map((c) =>
                fetchTjTop100(100, c.value).then((entries) =>
                    entries.map((e) => ({ ...e, categoryLabel: c.label }))
                )
            )
        )
            .then(async (lists) => {
                if (cancelled) return
                // 같은 곡이 여러 카테고리에 겹칠 수 있어 title+artist 기준으로 첫 항목만 남긴다
                const seen = new Map<string, ArtistEntry>()
                for (const list of lists) {
                    for (const e of list) {
                        const key = buildSongKey(e.title, e.artist)
                        if (!seen.has(key)) seen.set(key, e as ArtistEntry)
                    }
                }
                const merged = Array.from(seen.values())
                setPool(merged)
                setLoading(false)

                try {
                    const ranges = await api.getVocalRanges(
                        merged.map((e) => ({ title: e.title, artist: e.artist }))
                    )
                    if (cancelled) return
                    setPool((prev) =>
                        prev.map((e) => {
                            const r = ranges[buildSongKey(e.title, e.artist)]
                            return r
                                ? {
                                    ...e,
                                    minNote: r.minNote,
                                    maxNote: r.maxNote,
                                    minNoteLabel: r.minNoteLabel,
                                    maxNoteLabel: r.maxNoteLabel,
                                }
                                : e
                        })
                    )
                } catch {
                    // 음역대 조회가 실패해도 아티스트/차트 목록 자체는 보여준다
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError("아티스트 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
                    setLoading(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [])

    const artists = React.useMemo(() => {
        const set = new Set(pool.map((e) => e.artist.normalize("NFC")))
        return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"))
    }, [pool])

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase()
        return q ? artists.filter((a) => a.toLowerCase().includes(q)) : artists
    }, [artists, query])

    // 선택한 아티스트의 대표곡 — 음역대 정보가 있는 곡을 우선으로 고른다
    const sample = React.useMemo(() => {
        if (!selected) return null
        const own = pool.filter((e) => e.artist.normalize("NFC") === selected)
        return own.find((s) => s.maxNote != null) ?? own[0] ?? null
    }, [pool, selected])

    // 같은 카테고리(장르) 안에서, 대표곡과 최고음이 가까운 순으로 다른 아티스트 곡을 추천
    const songs = React.useMemo<ArtistEntry[]>(() => {
        if (!selected || !sample) return []
        const sameCategory = pool.filter(
            (e) => e.artist.normalize("NFC") !== selected && e.categoryLabel === sample.categoryLabel
        )

        if (sample.maxNote == null) {
            return sameCategory.slice(0, 20).map((e, i) => ({ ...e, rank: i + 1 }))
        }

        return sameCategory
            .filter((e) => e.maxNote != null)
            .map((e) => ({ entry: e, diff: Math.abs((e.maxNote as number) - (sample.maxNote as number)) }))
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 20)
            .map(({ entry }, i) => ({ ...entry, rank: i + 1 }))
    }, [pool, selected, sample])

    const top3 = songs.slice(0, 3)
    const rest = songs.slice(3)

    return (
        <main className="px-4 pb-6">
            <PageHeader
                title="유사 음색 아티스트 추천"
                subtitle="아티스트 검색 → 비슷한 음색의 곡"
            />

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="좋아하는 아티스트 검색"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {loading && (
                <div className="mt-10 text-center text-sm text-muted-foreground">
                    아티스트 목록을 불러오는 중...
                </div>
            )}

            {!loading && error && (
                <div className="mt-10 text-center text-sm text-destructive">{error}</div>
            )}

            {!loading && !error && (
                <>
                    <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                        {filtered.map((a) => (
                            <button
                                key={a}
                                type="button"
                                onClick={() => setSelected(a)}
                                className={cn(
                                    "shrink-0 h-9 px-3 rounded-full border text-xs font-semibold transition-colors",
                                    selected === a
                                        ? "border-primary bg-primary/15 text-foreground"
                                        : "border-border bg-surface/40 text-muted-foreground"
                                )}
                            >
                                {a}
                            </button>
                        ))}
                    </div>

                    {selected && sample ? (
                        <div className="mt-5 rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-4">
                            <div className="flex items-center gap-2 text-primary">
                                <Sparkles className="h-4 w-4" />
                                <span className="text-xs font-bold">{selected}와 비슷한 음색</span>
                            </div>
                            <div className="mt-1 text-base font-extrabold">
                                {songs.length}곡의 유사 음색 곡을 찾았어요
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                                {sample.categoryLabel} 장르
                                {sample.maxNoteLabel ? `, 최고음 ${sample.maxNoteLabel} 기준` : ""}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-10 text-center text-sm text-muted-foreground">
                            위에서 아티스트를 선택해주세요.
                        </div>
                    )}

                    {songs.length > 0 && (
                        <>
                            <div className="mt-5 grid grid-cols-3 gap-2">
                                {top3.map((entry) => (
                                    <ChartPodiumItem key={entry.id} entry={entry} />
                                ))}
                            </div>
                            <div className="mt-2 space-y-2">
                                {rest.map((entry) => (
                                    <ChartSongRow key={entry.id} entry={entry} />
                                ))}
                            </div>
                        </>
                    )}

                    {selected && sample && songs.length === 0 && (
                        <div className="mt-10 text-center text-sm text-muted-foreground">
                            같은 장르에서 유사한 곡을 찾지 못했어요.
                        </div>
                    )}
                </>
            )}
        </main>
    )
}