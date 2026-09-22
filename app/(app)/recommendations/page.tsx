"use client"

import * as React from "react"
import Link from "next/link"
import {ArrowLeft, Sparkles, Search, X, Loader2, Wand2} from "lucide-react"
import {useStore} from "@/lib/store"
import {api} from "@/lib/api"
import {fetchTjChartWithRange, type ChartEntryWithRange} from "@/lib/tjchart"
import {ChartPodiumItem, ChartSongRow, computeDifficultyStars} from "@/components/chart-song-row"
import {Button} from "@/components/ui/button"
import {noteToKorean} from "@/lib/songs"


type Tier = 1 | 2 | 3
type TierFilter = "all" | Tier

const TIER_LABEL: Record<Tier, string> = {
    1: "쉬움",
    2: "보통",
    3: "고난이도",
}

export default function RecommendationsPage() {
    const {profile} = useStore()
    const hasRange = !!profile.range

    const [entries, setEntries] = React.useState<ChartEntryWithRange[]>([])
    const [loading, setLoading] = React.useState(true)
    const [error, setError] = React.useState("")
    const [tierFilter, setTierFilter] = React.useState<TierFilter>("all")

    // AI 자연어 검색
    const [searchInput, setSearchInput] = React.useState("")
    const [searching, setSearching] = React.useState(false)
    const [searchError, setSearchError] = React.useState("")
    const [searchResults, setSearchResults] = React.useState<ChartEntryWithRange[] | null>(null)
    const [searchedFor, setSearchedFor] = React.useState("")

    React.useEffect(() => {
        let cancelled = false

        async function load() {
            setLoading(true)
            setError("")
            try {
                const list = await fetchTjChartWithRange(100)
                if (!cancelled) setEntries(list)
            } catch {
                if (!cancelled) setError("곡을 불러오지 못했어요. 잠시 후 다시 시도해주세요.")
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [])

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault()
        const q = searchInput.trim()
        if (!q || entries.length === 0) return

        setSearching(true)
        setSearchError("")
        try {
            const {matchedIndices} = await api.searchRecommend(
                q,
                entries.map((e) => ({title: e.title, artist: e.artist}))
            )
            const matched = matchedIndices
                .map((i) => entries[i])
                .filter((e): e is ChartEntryWithRange => !!e)
            setSearchResults(matched)
            setSearchedFor(q)
        } catch {
            setSearchError("검색에 실패했어요. 잠시 후 다시 시도해주세요.")
        } finally {
            setSearching(false)
        }
    }

    function clearSearch() {
        setSearchInput("")
        setSearchResults(null)
        setSearchedFor("")
        setSearchError("")
    }

    // 각 곡에 대해 내 음역대 기준 난이도(1~3점)를 미리 계산해둔다.
    const withStars = React.useMemo(
        () => entries.map((entry) => ({entry, stars: computeDifficultyStars(entry, profile.range)})),
        [entries, profile.range]
    )

    const filtered = React.useMemo(() => {
        let list = withStars

        if (hasRange) {
            list = list.filter((x) => x.stars !== null)
            if (tierFilter !== "all") {
                list = list.filter((x) => x.stars === tierFilter)
            }
            list = [...list].sort((a, b) => (a.stars ?? 99) - (b.stars ?? 99))
        }

        return list.map((x, i) => ({...x.entry, rank: i + 1}))
    }, [withStars, hasRange, tierFilter])

    // 검색 결과가 있으면 그걸 보여주고, 없으면 기존 음역대 기반 추천을 보여준다.
    const displayList = searchResults
        ? searchResults.map((e, i) => ({...e, rank: i + 1}))
        : filtered

    /*const top3 = displayList.slice(0, 3)
    const rest = displayList.slice(3)
  */
    function chipClass(active: boolean) {
        return `w-full h-10 rounded-full border text-sm font-semibold transition-colors ${
            active
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-surface/40 text-muted-foreground"
        }`
    }

    return (
        <main className="px-4 pt-4 pb-6">
            <header className="flex items-center justify-between px-1 mb-4">
                <Link
                    href="/home"
                    className="h-10 w-10 grid place-items-center rounded-[10px] hover:bg-muted text-muted-foreground"
                >
                    <ArrowLeft className="h-5 w-5"/>
                </Link>
                <h1 className="text-base font-bold">추천곡</h1>
                <div className="h-10 w-10"/>
            </header>

            {/* AI 자연어 검색 */}
            <form onSubmit={handleSearch} className="mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="예) 아이유 좋은날과 비슷한 느낌의 곡"
                            className="w-full h-12 pl-10 pr-10 rounded-[14px] bg-surface/60 border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 grid place-items-center text-muted-foreground hover:text-foreground"
                                aria-label="검색어 지우기"
                            >
                                <X className="h-4 w-4"/>
                            </button>
                        )}
                    </div>

                    <div className="relative shrink-0">
                        <div
                            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-brand blur-md opacity-70 animate-pulse pointer-events-none"/>
                        <button
                            type="submit"
                            disabled={searching || !searchInput.trim()}
                            className="relative h-12 w-12 grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-brand text-white shadow-lg shadow-primary/40 disabled:opacity-40 disabled:shadow-none transition-opacity"
                            aria-label="AI로 검색"
                        >
                            {searching ? (
                                <Loader2 className="h-5 w-5 animate-spin"/>
                            ) : (
                                <Wand2 className="h-5 w-5"/>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {searchResults && (
                <>
                    <p className="text-[11px] text-muted-foreground text-center px-1 mb-2">
                        AI가 생성한 추천 결과로, 실제와 다를 수 있어요.
                    </p>
                    <div className="flex items-center justify-between px-1 mb-4">
                      <span className="text-13 font-semibold text-primary truncate">
                        "{searchedFor}" 검색 결과 {searchResults.length}곡
                      </span>
                        <button onClick={clearSearch}
                                className="text-12 text-muted-foreground hover:text-foreground shrink-0 ml-2">
                            지우기
                        </button>
                    </div>
                </>
            )}

            {searchError && (
                <div className="text-xs text-destructive mb-4 px-1">{searchError}</div>
            )}

            {!searchResults && (
                <div className="flex items-center gap-2 text-primary mb-5">
                    <Sparkles className="h-4 w-4"/>
                    <span className="text-sm font-bold">
        {profile.username ? `${profile.username}님 ` : ""}음역대 맞춤 노래방 추천곡
      </span>
                    {!hasRange && (
                        <Link
                            href="/mypage/range-test"
                            className="ml-auto text-xs font-semibold text-primary underline underline-offset-2"
                        >
                            음역대 측정하기
                        </Link>
                    )}
                </div>
            )}

            {!searchResults && hasRange && (
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <button onClick={() => setTierFilter("all")} className={chipClass(tierFilter === "all")}>
                        전체
                    </button>
                    {([1, 2, 3] as const).map((t) => (
                        <button key={t} onClick={() => setTierFilter(t)} className={chipClass(tierFilter === t)}>
                            {TIER_LABEL[t]}
                        </button>
                    ))}
                </div>
            )}

            {loading && (
                <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
            )}

            {!loading && error && (
                <div className="text-center text-sm text-destructive py-12">{error}</div>
            )}

            {!loading && !error && (
                displayList.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-12">
                        {searchResults ? "검색 결과가 없어요. 다른 검색어로 시도해보세요." : "조건에 맞는 곡이 없어요."}
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            {displayList.map((entry) => (
                                <ChartSongRow key={entry.id} entry={entry}/>
                            ))}
                        </div>
                    </>
                )
            )}
        </main>
    )
}