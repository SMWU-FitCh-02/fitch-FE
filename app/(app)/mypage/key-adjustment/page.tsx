"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Mic, Wand2, Loader2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChartSongRow, computeKeySemitoneShift, type ChartEntryWithRange } from "@/components/chart-song-row"
import { fetchTjChartWithRange, TJ_CATEGORIES } from "@/lib/tjchart"
import { useStore } from "@/lib/store"
import { api, buildSongKey } from "@/lib/api"
import { fetchArtwork } from "@/lib/artwork-cache"
import { noteToMidi } from "@/lib/songs"
import { matchesSearch } from "@/lib/artist-aliases"

const PAGE_SIZE = 30

// 멜론 차트(/api/chart)를 가져와서 분석해둔 음역대(minNote/maxNote)를 붙여준다.
async function fetchMelonWithRange(limit = 100): Promise<CatalogItem[]> {
    const res = await fetch(`/api/chart?limit=${limit}`)
    if (!res.ok) throw new Error("melon chart failed")
    const data = await res.json()
    const results: any[] = data?.feed?.results ?? []
    const items: CatalogItem[] = results
        .filter((r) => r?.name && r?.artistName)
        .map((r, i) => ({
            id: `melon-${r.id ?? i}`,
            title: String(r.name),
            artist: String(r.artistName),
        }))
    try {
        const rangeMap = await api.getVocalRanges(items.map((e) => ({ title: e.title, artist: e.artist })))
        for (const it of items) {
            const r = (rangeMap as any)?.[buildSongKey(it.title, it.artist)]
            if (r && r.minNote != null && r.maxNote != null) {
                it.minNote = r.minNote
                it.maxNote = r.maxNote
            }
        }
    } catch {
        // 음역대 조회에 실패해도 곡 자체는 검색 대상에 넣는다.
    }
    return items
}

// 두 검색(곡 검색 / 분위기로 찾기)이 같은 곡 목록을 쓰도록 모양을 통일한 항목.
type CatalogItem = {
    id: string
    title: string
    artist: string
    artworkUrl?: string
    minNote?: number
    maxNote?: number
}

function dedupeKey(title: string, artist: string) {
    return `${title}::${artist}`.toLowerCase().replace(/\s+/g, "")
}

// 검색 결과 한 줄. 인기차트와 같은 ChartSongRow(눌러서 펼치면 추천 키 + 원곡/내 키 버전 재생)를 그대로 쓴다.
function SearchSongRow({ item, index }: { item: CatalogItem; index: number }) {
    const [artworkUrl, setArtworkUrl] = React.useState<string | null>(item.artworkUrl || null)

    React.useEffect(() => {
        if (item.artworkUrl) return
        let cancelled = false
        fetchArtwork(item.title, item.artist)
            .then((data) => {
                if (!cancelled) setArtworkUrl(data.artworkUrl ?? null)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [item.title, item.artist, item.artworkUrl])

    const entry = {
        id: item.id,
        rank: index + 1,
        title: item.title,
        artist: item.artist,
        artworkUrl: artworkUrl ?? "",
        minNote: item.minNote,
        maxNote: item.maxNote,
    } as unknown as ChartEntryWithRange

    return <ChartSongRow entry={entry} />
}

export default function KeyAdjustmentPage() {
    const { profile } = useStore()
    const hasRange = !!profile.range
    const [query, setQuery] = React.useState("")
    const [catalog, setCatalog] = React.useState<CatalogItem[]>([])
    const [loading, setLoading] = React.useState(true)
    const [visible, setVisible] = React.useState(PAGE_SIZE)

    const [mode, setMode] = React.useState<"song" | "mood">("song")
    const [moodInput, setMoodInput] = React.useState("")
    const [aiSearching, setAiSearching] = React.useState(false)
    const [aiError, setAiError] = React.useState("")
    const [aiResults, setAiResults] = React.useState<CatalogItem[] | null>(null)
    const [aiQuery, setAiQuery] = React.useState("")

    // 곡 목록: DB(songs) 전체 + TJ 인기차트(전 카테고리) + 멜론 차트 중 DB에 없는 곡을 합친다.
    React.useEffect(() => {
        if (!hasRange) return
        let cancelled = false

        async function load() {
            const [songsRes, melonRes, ...tjRes] = await Promise.allSettled([
                api.getSongs(),
                fetchMelonWithRange(100),
                ...TJ_CATEGORIES.map((c) => fetchTjChartWithRange(100, c.value)),
            ])
            if (cancelled) return

            const merged: CatalogItem[] = []
            const seen = new Set<string>()

            if (songsRes.status === "fulfilled") {
                for (const s of songsRes.value) {
                    const raw = s as unknown as { minNote?: number; maxNote?: number }
                    const key = dedupeKey(s.title, s.artist)
                    if (seen.has(key)) continue
                    seen.add(key)
                    merged.push({
                        id: `song-${s.songId}`,
                        title: s.title,
                        artist: s.artist,
                        minNote: raw.minNote,
                        maxNote: raw.maxNote,
                    })
                }
            }
            for (const r of tjRes) {
                if (r.status !== "fulfilled") continue
                for (const e of r.value) {
                    const key = dedupeKey(e.title, e.artist)
                    if (seen.has(key)) continue
                    seen.add(key)
                    merged.push({
                        id: e.id,
                        title: e.title,
                        artist: e.artist,
                        artworkUrl: e.artworkUrl || undefined,
                        minNote: e.minNote,
                        maxNote: e.maxNote,
                    })
                }
            }
            if (melonRes.status === "fulfilled") {
                for (const e of melonRes.value) {
                    const key = dedupeKey(e.title, e.artist)
                    if (seen.has(key)) continue
                    seen.add(key)
                    merged.push(e)
                }
            }
            setCatalog(merged)
            setLoading(false)
        }

        load()
        return () => {
            cancelled = true
        }
    }, [hasRange])

    async function handleAiSearch() {
        const q = moodInput.trim()
        if (!q || aiSearching || catalog.length === 0) return
        setAiSearching(true)
        setAiError("")
        try {
            const { matchedIndices } = await api.searchRecommend(
                q,
                catalog.map((c) => ({ title: c.title, artist: c.artist }))
            )
            const matched = matchedIndices.map((i) => catalog[i]).filter((c): c is CatalogItem => !!c)
            setAiResults(matched)
            setAiQuery(q)
        } catch {
            setAiError("AI 검색에 실패했어요. 잠시 후 다시 시도해주세요.")
        } finally {
            setAiSearching(false)
        }
    }

    function clearAi() {
        setAiResults(null)
        setAiQuery("")
        setAiError("")
    }

    // 검색어가 없으면 내 음역대에 가까운 곡부터(조정할 키 수 적은 순 → 내 최고음과 가까운 순),
    // 검색어가 있으면 곡명/가수명으로 거른다.
    const filtered = React.useMemo(() => {
        if (query.trim()) {
            return catalog.filter((c) => matchesSearch(query, c.title, c.artist))
        }
        const range = profile.range
        if (!range) return catalog
        const userMax = noteToMidi(range.highestNote)
        const scored = catalog.map((item) => {
            if (item.minNote == null || item.maxNote == null) return { item, shift: 99, gap: 99 }
            const shift = Math.abs(
                computeKeySemitoneShift({ minNote: item.minNote, maxNote: item.maxNote } as ChartEntryWithRange, range)
            )
            return { item, shift, gap: Math.abs(item.maxNote - userMax) }
        })
        scored.sort((a, b) => a.shift - b.shift || a.gap - b.gap)
        return scored.map((x) => x.item)
    }, [query, catalog, profile.range])

    const shown = filtered.slice(0, visible)

    if (!hasRange) {
        return (
            <main className="px-4 pb-6">
                <header className="px-1 mb-3 text-center">
                    <h1 className="text-base font-bold">내 키 찾기</h1>
                    <p className="text-[11px] text-muted-foreground">추천 키를 받아보세요</p>
                </header>
                <div className="mt-10 text-center">
                    <div className="mx-auto h-20 w-20 rounded-full bg-surface/60 border border-border grid place-items-center">
                        <Mic className="h-9 w-9 text-muted-foreground" />
                    </div>
                    <h2 className="mt-4 text-base font-bold">먼저 음역대 측정이 필요해요</h2>
                    <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                        맞춤 키를 계산하려면 내 음역대 데이터가 필요해요.
                    </p>
                    <Button variant="brand" size="lg" className="mt-6 w-full" asChild>
                        <Link href="/mypage/range-test">음역대 테스트</Link>
                    </Button>
                </div>
            </main>
        )
    }

    return (
        <main className="px-4 pb-6">
            <header className="px-1 mb-3 text-center">
                <h1 className="text-base font-bold">내 키 찾기</h1>
                <p className="text-[11px] text-muted-foreground">곡을 눌러 내게 맞는 키를 확인해요</p>
            </header>

            <div className="grid grid-cols-2 gap-1 rounded-full bg-surface/60 border border-border/60 p-1">
                {([
                    ["song", "곡 검색"],
                    ["mood", "✨ 분위기로 찾기"],
                ] as const).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setMode(key)}
                        className={`h-9 rounded-full text-sm font-semibold transition-colors ${
                            mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {mode === "song" ? (
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9 pr-9"
                        placeholder="곡 또는 가수 검색"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setVisible(PAGE_SIZE)
                        }}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery("")
                                setVisible(PAGE_SIZE)
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="검색어 지우기"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            ) : (
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleAiSearch()
                    }}
                    className="mt-3"
                >
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                className="pl-9 pr-9"
                                placeholder="예) 아이유 좋은날 같은 느낌의 곡"
                                value={moodInput}
                                onChange={(e) => setMoodInput(e.target.value)}
                            />
                            {moodInput && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMoodInput("")
                                        clearAi()
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label="검색어 지우기"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-brand blur-md opacity-70 animate-pulse pointer-events-none" />
                            <button
                                type="submit"
                                disabled={aiSearching || !moodInput.trim() || catalog.length === 0}
                                className="relative h-10 w-10 grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-brand text-white shadow-lg shadow-primary/40 disabled:opacity-40 disabled:shadow-none transition-opacity"
                                aria-label="AI로 비슷한 곡 찾기"
                            >
                                {aiSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {mode === "mood" && aiResults && (
                <div className="mt-3">
                    <p className="text-[11px] text-muted-foreground text-center px-1 mb-2">
                        AI가 생성한 추천 결과로, 실제와 다를 수 있어요.
                    </p>
                    <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-primary truncate">
                  "{aiQuery}" 검색 결과 {aiResults.length}곡
                </span>
                        <button onClick={clearAi} className="text-[12px] text-muted-foreground hover:text-foreground shrink-0 ml-2">
                            지우기
                        </button>
                    </div>
                </div>
            )}
            {mode === "mood" && aiError && <div className="mt-3 text-xs text-destructive px-1">{aiError}</div>}

            {mode === "mood" ? (
                aiResults == null ? (
                    <div className="mt-8 text-center text-xs text-muted-foreground px-6">
                        비슷한 분위기의 곡을 말로 설명해보세요.<br />
                        {catalog.length > 0 ? `${catalog.length}곡 중에서 찾아드려요.` : "곡 목록을 불러오는 중이에요."}
                    </div>
                ) : aiResults.length === 0 ? (
                    <div className="mt-6 text-center text-xs text-muted-foreground">
                        검색 결과가 없어요. 다른 검색어로 시도해보세요.
                    </div>
                ) : (
                    <div className="mt-4 space-y-2">
                        {aiResults.map((c, i) => (
                            <SearchSongRow key={c.id} item={c} index={i} />
                        ))}
                    </div>
                )
            ) : (
                <>
                    {loading && <div className="mt-6 text-center text-xs text-muted-foreground">곡 목록 불러오는 중...</div>}

                    {!loading && filtered.length === 0 && (
                        <div className="mt-6 text-center text-xs text-muted-foreground">검색 결과가 없어요</div>
                    )}

                    {!loading && filtered.length > 0 && (
                        <div className="mt-3 px-1 text-[11px] text-muted-foreground">
                            {query.trim() ? `검색 결과 ${filtered.length}곡` : `전체 ${filtered.length}곡 · 내 음역대에 가까운 순`}
                        </div>
                    )}

                    <div className="mt-2 space-y-2">
                        {shown.map((c, i) => (
                            <SearchSongRow key={c.id} item={c} index={i} />
                        ))}
                    </div>

                    {filtered.length > visible && (
                        <button
                            type="button"
                            onClick={() => setVisible((v) => v + PAGE_SIZE)}
                            className="mt-3 w-full h-10 rounded-full border border-border bg-surface/40 text-sm font-semibold text-muted-foreground hover:text-foreground"
                        >
                            더 보기 ({filtered.length - visible}곡 남음)
                        </button>
                    )}
                </>
            )}
        </main>
    )
}