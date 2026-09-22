"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, Search, X, Loader2 } from "lucide-react"
import { useStore } from "@/lib/store"
import { api } from "@/lib/api"
import { fetchTjChartWithRange, type ChartEntryWithRange } from "@/lib/tjchart"
import { ChartPodiumItem, ChartSongRow, computeDifficultyStars } from "@/components/chart-song-row"
import { Button } from "@/components/ui/button"
import { noteToKorean } from "@/lib/songs"

type Tier = 1 | 2 | 3
type TierFilter = "all" | Tier

const TIER_LABEL: Record<Tier, string> = {
  1: "쉬움",
  2: "보통",
  3: "고난이도",
}

export default function RecommendationsPage() {
  const { profile } = useStore()
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
      const { matchedIndices } = await api.searchRecommend(
          q,
          entries.map((e) => ({ title: e.title, artist: e.artist }))
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
      () => entries.map((entry) => ({ entry, stars: computeDifficultyStars(entry, profile.range) })),
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

    return list.map((x, i) => ({ ...x.entry, rank: i + 1 }))
  }, [withStars, hasRange, tierFilter])

  // 검색 결과가 있으면 그걸 보여주고, 없으면 기존 음역대 기반 추천을 보여준다.
  const displayList = searchResults
      ? searchResults.map((e, i) => ({ ...e, rank: i + 1 }))
      : filtered

  const top3 = displayList.slice(0, 3)
  const rest = displayList.slice(3)

  function chipClass(active: boolean) {
    return `shrink-0 h-9 px-4 rounded-full border text-xs font-semibold transition-colors ${
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
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">추천곡</h1>
          <div className="h-10 w-10" />
        </header>

        {/* AI 자연어 검색 */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="예: 성시경 거리에서와 비슷한 느낌의 곡을 알려줘"
                className="w-full h-11 pl-10 pr-10 rounded-[12px] bg-surface/60 border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {searchInput && (
                <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 grid place-items-center text-muted-foreground hover:text-foreground"
                    aria-label="검색어 지우기"
                >
                  <X className="h-4 w-4" />
                </button>
            )}
          </div>
          <Button type="submit" variant="brand" size="sm" className="mt-2 w-full" disabled={searching || !searchInput.trim()}>
            {searching ? (
                <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI가 찾는 중...
              </span>
            ) : (
                "AI로 검색"
            )}
          </Button>
        </form>

        {searchResults && (
            <div className="flex items-center justify-between rounded-[12px] bg-primary/10 border border-primary/30 px-3 py-2 mb-4">
              <span className="text-xs font-semibold text-primary truncate">
                "{searchedFor}" 검색 결과 {searchResults.length}곡
              </span>
              <button onClick={clearSearch} className="text-xs text-muted-foreground hover:text-foreground shrink-0 ml-2">
                지우기
              </button>
            </div>
        )}

        {searchError && (
            <div className="text-xs text-destructive mb-4 px-1">{searchError}</div>
        )}

        {!searchResults && (
            <div className="rounded-[14px] bg-gradient-to-br from-primary/15 to-brand/15 border border-primary/30 p-4 mb-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold">맞춤 추천 결과</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                {hasRange ? (
                    <>
                      <span className="text-lg font-extrabold">{noteToKorean(profile.range!.lowestNote)}</span>
                      <span className="text-muted-foreground text-sm">~</span>
                      <span className="text-lg font-extrabold text-brand">{noteToKorean(profile.range!.highestNote)}</span>
                      <span className="text-xs text-muted-foreground font-medium ml-1">음역대 기준 · TJ 인기차트</span>
                    </>
                ) : (
                    <span className="text-lg font-extrabold leading-tight">
                    음역대 측정 전이라 TJ 인기차트 전체를 보여드려요
                  </span>
                )}
              </div>
              {!hasRange && (
                  <Button variant="brand" size="sm" className="mt-3" asChild>
                    <Link href="/mypage/range-test">음역대 측정하기</Link>
                  </Button>
              )}
            </div>
        )}

        {!searchResults && hasRange && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 mb-4">
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
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {top3.map((entry) => (
                        <ChartPodiumItem key={entry.id} entry={entry} />
                    ))}
                  </div>

                  {rest.length > 0 && (
                      <div className="space-y-2">
                        {rest.map((entry) => (
                            <ChartSongRow key={entry.id} entry={entry} />
                        ))}
                      </div>
                  )}
                </>
            )
        )}
      </main>
  )
}