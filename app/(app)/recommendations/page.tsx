"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { useStore } from "@/lib/store"
import { api, type SongResponse } from "@/lib/api"
import { BackendSongCard } from "@/components/backend-song-card"
import { Button } from "@/components/ui/button"
import { noteToKorean } from "@/lib/songs"

type TierFilter = "all" | "easy" | "hard"

export default function RecommendationsPage() {
  const { profile } = useStore()
  const hasRange = !!profile.range

  const [songs, setSongs] = React.useState<SongResponse[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [genreFilter, setGenreFilter] = React.useState<string>("all")
  const [tierFilter, setTierFilter] = React.useState<TierFilter>("all")

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        if (profile.userId && hasRange) {
          const rec = await api.recommend(profile.userId)
          if (!cancelled) setSongs(rec.recommendedSongs ?? [])
        } else {
          const all = await api.getSongs()
          if (!cancelled) setSongs(all ?? [])
        }
      } catch {
        if (!cancelled) setError("곡을 불러오지 못했어요. 백엔드 서버가 켜져 있는지 확인해주세요.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [profile.userId, hasRange])

  const genres = React.useMemo(
      () => Array.from(new Set(songs.map((s) => s.genre).filter(Boolean))),
      [songs]
  )

  const filtered = songs.filter((s) => {
    if (genreFilter !== "all" && s.genre !== genreFilter) return false
    if (tierFilter === "easy" && s.maxNote > 62) return false
    if (tierFilter === "hard" && s.maxNote <= 62) return false
    return true
  })

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
                  <span className="text-xs text-muted-foreground font-medium ml-1">음역대 기준</span>
                </>
            ) : (
                <span className="text-lg font-extrabold leading-tight">음역대 측정 전이라 전체 곡을 보여드려요</span>
            )}
          </div>
          {!hasRange && (
              <Button variant="brand" size="sm" className="mt-3" asChild>
                <Link href="/mypage/range-test">음역대 측정하기</Link>
              </Button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 mb-4">
          <button onClick={() => setTierFilter("all")} className={chipClass(tierFilter === "all" && genreFilter === "all")}>
            전체
          </button>
          <button onClick={() => setTierFilter("easy")} className={chipClass(tierFilter === "easy")}>
            🎵 쉬움
          </button>
          <button onClick={() => setTierFilter("hard")} className={chipClass(tierFilter === "hard")}>
            🔥 고난도
          </button>
          {genres.map((g) => (
              <button
                  key={g}
                  onClick={() => setGenreFilter(genreFilter === g ? "all" : g)}
                  className={chipClass(genreFilter === g)}
              >
                {g}
              </button>
          ))}
        </div>

        {loading && (
            <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
        )}

        {!loading && error && (
            <div className="text-center text-sm text-destructive py-12">{error}</div>
        )}

        {!loading && !error && (
            <div className="space-y-2">
              {filtered.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-12">
                    조건에 맞는 곡이 없어요. 백엔드에 곡을 더 등록해보세요.
                  </div>
              ) : (
                  filtered.map((s) => <BackendSongCard key={s.songId} song={s} />)
              )}
            </div>
        )}
      </main>
  )
}