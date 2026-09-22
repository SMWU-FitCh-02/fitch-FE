"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { useStore } from "@/lib/store"
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

  // 각 곡에 대해 내 음역대 기준 난이도(1~3점)를 미리 계산해둔다.
  const withStars = React.useMemo(
      () => entries.map((entry) => ({ entry, stars: computeDifficultyStars(entry, profile.range) })),
      [entries, profile.range]
  )

  const filtered = React.useMemo(() => {
    let list = withStars

    if (hasRange) {
      // 음역대 데이터가 확보된 곡만 추천 대상으로 삼는다 (없으면 맞는지 판단 불가)
      list = list.filter((x) => x.stars !== null)
      if (tierFilter !== "all") {
        list = list.filter((x) => x.stars === tierFilter)
      }
      // 가장 잘 맞는 곡(1점)부터 정렬
      list = [...list].sort((a, b) => (a.stars ?? 99) - (b.stars ?? 99))
    }
    // 음역대 측정 전이면 TJ 차트 순위 그대로 보여준다 (list는 원래 순서 유지)

    return list.map((x, i) => ({ ...x.entry, rank: i + 1 }))
  }, [withStars, hasRange, tierFilter])

  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

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

        {hasRange && (
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
            filtered.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  조건에 맞는 곡이 없어요.
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