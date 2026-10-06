"use client"

import * as React from "react"
import Link from "next/link"
import { Search, Mic, Wand2, Loader2, X } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChartSongRow, type ChartEntryWithRange } from "@/components/chart-song-row"
import { fetchTjChartWithRange } from "@/lib/tjchart"
import { useStore } from "@/lib/store"
import { api, type SongResponse } from "@/lib/api"
import { fetchArtwork } from "@/lib/artwork-cache"
import { matchesSearch } from "@/lib/artist-aliases"

// 검색 결과 한 줄. 인기차트와 같은 ChartSongRow(눌러서 펼치면 추천 키 + 원곡/내 키 버전 재생)를
// 그대로 쓰기 위해 SongResponse를 ChartEntry 모양으로 바꿔 넘긴다.
function SearchSongRow({ song, index }: { song: SongResponse; index: number }) {
    const [artworkUrl, setArtworkUrl] = React.useState<string | null>(null)

    React.useEffect(() => {
        let cancelled = false
        fetchArtwork(song.title, song.artist)
            .then((data) => {
                if (!cancelled) setArtworkUrl(data.artworkUrl ?? null)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [song.title, song.artist])

    const raw = song as unknown as { minNote?: number; maxNote?: number }
    const entry = {
        id: `song-${song.songId}`,
        rank: index + 1,
        title: song.title,
        artist: song.artist,
        artworkUrl: artworkUrl ?? "",
        minNote: raw.minNote,
        maxNote: raw.maxNote,
    } as unknown as ChartEntryWithRange

    return <ChartSongRow entry={entry} />
}

export default function KeyAdjustmentPage() {
    const { profile } = useStore()
    const hasRange = !!profile.range
    const [query, setQuery] = React.useState("")
    const [allSongs, setAllSongs] = React.useState<SongResponse[]>([])
    const [loading, setLoading] = React.useState(true)

    // AI 자연어 검색 (TJ 인기차트 100곡 중에서 고름). 결과가 있으면 일반 검색 결과 대신 보여준다.
    const [chartPool, setChartPool] = React.useState<ChartEntryWithRange[]>([])
    const [aiSearching, setAiSearching] = React.useState(false)
    const [aiError, setAiError] = React.useState("")
    const [aiResults, setAiResults] = React.useState<ChartEntryWithRange[] | null>(null)
    const [aiQuery, setAiQuery] = React.useState("")
    const [mode, setMode] = React.useState<"song" | "mood">("song")
    const [moodInput, setMoodInput] = React.useState("")

    async function handleAiSearch() {
        const q = moodInput.trim()
        if (!q || aiSearching) return
        setAiSearching(true)
        setAiError("")
        try {
            let pool = chartPool
            if (pool.length === 0) {
                pool = await fetchTjChartWithRange(100)
                setChartPool(pool)
            }
            const { matchedIndices } = await api.searchRecommend(
                q,
                pool.map((e) => ({ title: e.title, artist: e.artist }))
            )
            const matched = matchedIndices
                .map((i) => pool[i])
                .filter((e): e is ChartEntryWithRange => !!e)
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

    React.useEffect(() => {
        if (!hasRange) return
        let cancelled = false
        api
            .getSongs()
            .then((songs) => {
                if (!cancelled) setAllSongs(songs)
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [hasRange])

    const filtered = React.useMemo(() => {
        if (!query.trim()) return allSongs.slice(0, 30)
        return allSongs.filter((s) => matchesSearch(query, s.title, s.artist)).slice(0, 20)
    }, [query, allSongs])

    if (!hasRange) {
        return (
            <main className="px-4 pb-6">
                <PageHeader title="키 조정" subtitle="추천 키를 받아보세요" />
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
            <PageHeader title="키 조정" subtitle="곡을 검색하고 눌러서 추천 키를 확인해요" />

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
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
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
                                disabled={aiSearching || !moodInput.trim()}
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
                        비슷한 분위기의 곡을 말로 설명해보세요.<br />인기차트 100곡 중에서 찾아드려요.
                    </div>
                ) : aiResults.length === 0 ? (
                    <div className="mt-6 text-center text-xs text-muted-foreground">
                        검색 결과가 없어요. 다른 검색어로 시도해보세요.
                    </div>
                ) : (
                    <div className="mt-4 space-y-2">
                        {aiResults.map((e, i) => (
                            <ChartSongRow key={e.id} entry={{ ...e, rank: i + 1 }} />
                        ))}
                    </div>
                )
            ) : (
                <>
                    {loading && <div className="mt-6 text-center text-xs text-muted-foreground">곡 목록 불러오는 중...</div>}

                    {!loading && filtered.length === 0 && (
                        <div className="mt-6 text-center text-xs text-muted-foreground">검색 결과가 없어요</div>
                    )}

                    <div className="mt-4 space-y-2">
                        {filtered.map((s, i) => (
                            <SearchSongRow key={s.songId} song={s} index={i} />
                        ))}
                    </div>
                </>
            )}
        </main>
    )
}